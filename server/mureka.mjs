import { setTimeout as delay } from 'node:timers/promises';
import { ApiError, auth, bounded } from './http.mjs';
import { audioExtension } from './acestep.mjs';
import { clipAudio } from './media.mjs';

// Official API contract: https://platform.mureka.ai/docs/
// The origin is fixed by configuration, never taken from user requests or provider task URLs.
async function request(config, path, options, signal) {
  const response = await fetch(config.mureka.base + '/v1/' + path, {
    ...options,
    headers: { ...auth(config.mureka.key), ...options?.headers },
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    const messages = {
      401: 'Mureka 密钥无效，请联系项目管理员。',
      402: 'Mureka 额度不足，请联系项目管理员充值。',
      403: '项目尚未开通 Mureka 模型权限。',
      429: 'Mureka 请求受限，请稍后重试或检查项目额度。',
    };
    throw new ApiError(
      502,
      messages[response.status] || `Mureka 请求失败（HTTP ${response.status}）。`,
    );
  }
  let value;
  try {
    value = JSON.parse((await bounded(response)).toString());
  } catch {
    throw new ApiError(502, 'Mureka 返回了无效响应。');
  }
  if (value.error) throw new ApiError(502, 'Mureka 报告任务失败，请联系项目管理员。');
  return value;
}
const identifier = (value) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(value))
    throw new ApiError(502, 'Mureka 未返回有效任务或文件 ID。');
  return value;
};

export async function downloadMureka(config, value, signal) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(502, 'Mureka 未返回有效音频地址。');
  }
  const allowed =
    url.protocol === 'https:' &&
    ['mureka.ai', 'mureka.cn'].some(
      (domain) => url.hostname === domain || url.hostname.endsWith('.' + domain),
    );
  // Local HTTP fixtures are injected in process only; no API or environment setting accepts this.
  if (
    (!allowed && !config.mureka.testDownloadOrigins?.includes(url.origin)) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new ApiError(502, 'Mureka 返回了不受支持的音频下载地址。');
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
    // Never forward the project API key to the audio CDN.
  });
  if (!response.ok) throw new ApiError(502, 'Mureka 音频下载失败。');
  return bounded(response, 100 * 1024 * 1024);
}

export async function generateMureka(config, brief, source, signal, event = () => {}) {
  if (!config.mureka?.key) throw new ApiError(503, 'Mureka 待项目管理员开通。');
  const operation = AbortSignal.any([
    signal || AbortSignal.timeout(config.timeoutMs),
    AbortSignal.timeout(config.timeoutMs),
  ]);
  const remix = brief.task === 'cover';
  if (remix && !source) throw new ApiError(400, '请上传用于改编的源音频。');
  if (
    !brief.caption?.trim() ||
    brief.caption.length > 1024 ||
    (!brief.instrumental && brief.lyrics?.length > 5000)
  )
    throw new ApiError(422, '创作描述超出 Mureka 限制，请简化要求后重新生成。');
  if (!remix && !brief.instrumental && !brief.lyrics?.trim())
    throw new ApiError(422, '歌曲创作需要歌词，请补充主题后重新生成。');
  const input = { model: config.mureka.model, prompt: brief.caption, n: 1 };
  let kind = brief.instrumental && !remix ? 'instrumental' : 'song';
  if (remix) {
    event('preparing', '正在准备音乐片段');
    const wav = await clipAudio(config, source, brief.duration, operation);
    // Fixed PCM output is stereo 44.1 kHz / 16 bit. Reject clips shorter than the API minimum before any upload.
    if (wav.length < 10 * 44100 * 2 * 2)
      throw new ApiError(422, 'Mureka 改编需要至少 10 秒的有效源音频。');
    const mp3 = await clipAudio(config, { data: wav }, brief.duration, operation, 'mp3');
    if (mp3.length > 10 * 1024 * 1024)
      throw new ApiError(413, '改编片段超过 Mureka 的 10 MB 限制。');
    const form = new FormData();
    form.set('purpose', 'remix');
    form.set('file', new Blob([mp3], { type: 'audio/mpeg' }), 'source.mp3');
    const uploaded = await request(
      config,
      'files/upload',
      { method: 'POST', body: form },
      operation,
    );
    input.upload_audio_id = identifier(uploaded.id);
    // Omit lyrics to retain source lyrics through provider extraction; never replace them with an invented transcript.
    if (brief.instrumental)
      input.prompt = `${input.prompt}\nInstrumental only, no singing.`.slice(0, 1024);
  } else if (!brief.instrumental) input.lyrics = brief.lyrics;
  // The course demo requests 10–60 s previews. Mureka duration only accepts 120–300 s;
  // omit it and crop the returned full song. n=1 avoids the API's default two paid outputs.
  event('submitting', '正在提交 Mureka 音乐任务');
  const task = await request(
    config,
    kind + (remix ? '/remix' : '/generate'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    operation,
  );
  const id = identifier(task.id);
  let state = task;
  while (true) {
    operation.throwIfAborted();
    if (state.status === 'succeeded') break;
    if (['failed', 'timeouted', 'cancelled'].includes(state.status))
      throw new ApiError(502, 'Mureka 音乐任务未完成，请调整要求或联系项目管理员。');
    if (!['preparing', 'queued', 'running', 'streaming'].includes(state.status))
      throw new ApiError(502, 'Mureka 返回了未知任务状态。');
    event(
      state.status === 'queued' ? 'queued' : 'generating',
      state.status === 'queued' ? 'Mureka 正在排队' : 'Mureka 正在生成音乐',
      { providerTaskId: id },
    );
    await delay(config.pollMs, undefined, { signal: operation });
    state = await request(config, `${kind}/query/${id}`, {}, operation);
  }
  event('downloading', '正在取回云端音乐结果');
  const data = await downloadMureka(config, state.choices?.[0]?.url, operation);
  audioExtension(data); // Validate actual bytes, rather than trusting the provider's filename.
  const preview = await clipAudio(config, { data }, brief.duration, operation, 'mp3');
  return {
    data: preview,
    extension: audioExtension(preview),
    model: 'Mureka 9.5 · 昆仑万维',
    providerTaskId: id,
    seed: null,
  };
}
