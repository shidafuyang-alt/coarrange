import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { auth, bounded, remoteJSON } from './http.mjs';

export function audioExtension(data) {
  if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WAVE')
    return 'wav';
  if (data.subarray(4, 8).toString() === 'ftyp') return 'm4a';
  if (data.subarray(0, 4).toString() === 'fLaC') return 'flac';
  if (data.subarray(0, 4).toString() === 'OggS') return 'ogg';
  if (data.subarray(0, 3).toString() === 'ID3' || (data[0] === 255 && (data[1] & 224) === 224))
    return 'mp3';
  throw Error('不支持的音频内容，请使用 WAV、MP3、M4A、FLAC 或 OGG');
}
export async function generate(config, brief, source, signal, event) {
  const { music } = config;
  const headers = auth(music.key);
  const payload = {
    task_type: brief.task,
    prompt: brief.caption,
    lyrics: brief.lyrics,
    audio_duration: brief.duration,
    bpm: brief.bpm,
    key_scale: brief.key_scale,
    instrumental: brief.instrumental,
    batch_size: 1,
    audio_format: 'wav',
    use_random_seed: false,
    seed: brief.seed,
    inference_steps: 8,
    audio_cover_strength: brief.cover_strength,
    thinking: false,
    use_cot_caption: false,
    use_cot_language: false,
  };
  if (music.model) payload.model = music.model;
  if (payload.bpm === null) delete payload.bpm;
  let body;
  if (source) {
    body = new FormData();
    for (const [key, value] of Object.entries(payload)) body.set(key, String(value));
    const data = await readFile(source.path);
    body.set('src_audio', new Blob([data]), `source.${source.extension}`);
  } else {
    body = JSON.stringify(payload);
    headers['Content-Type'] = 'application/json';
  }
  event('submitting', '提交音乐模型任务');
  const released = await remoteJSON(
    `${music.base}/release_task`,
    { method: 'POST', headers, body },
    signal,
  );
  const taskId = released.data?.task_id || released.task_id;
  if (typeof taskId !== 'string' || !taskId) throw Error('音乐模型未返回 task_id');
  event('generating', '音乐模型处理中；耗时取决于模型服务器', {
    providerTaskId: taskId,
  });
  const started = Date.now();
  while (Date.now() - started < config.timeoutMs) {
    signal.throwIfAborted();
    const query = await remoteJSON(
      `${music.base}/query_result`,
      {
        method: 'POST',
        headers: { ...auth(music.key), 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id_list: [taskId] }),
      },
      signal,
    );
    const entries = Array.isArray(query.data) ? query.data : query.data?.results || [];
    const item = entries.find((x) => x.task_id === taskId);
    if (Number(item?.status) === 2)
      throw Error('音乐模型生成失败，请检查模型服务日志或修改要求后重试');
    if (Number(item?.status) === 1) {
      let result = item.result;
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch {
          throw Error('音乐模型任务结果格式错误');
        }
      }
      const output = Array.isArray(result) ? result[0] : result;
      if (!output?.file || (output.status !== undefined && Number(output.status) !== 1))
        throw Error('音乐模型未返回成功的音频文件');
      const url = new URL(output.file, music.base + '/');
      const base = new URL(music.base);
      if (
        url.origin !== base.origin ||
        url.username ||
        url.password ||
        !url.pathname.endsWith('/v1/audio')
      )
        throw Error('模型返回了不受支持的下载地址，必须使用同一服务的 /v1/audio');
      event('downloading', '下载真实模型音频');
      const response = await fetch(url, {
        headers: auth(music.key),
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
      });
      if (!response.ok) throw Error(`下载模型音频失败：HTTP ${response.status}`);
      const data = await bounded(response, 100 * 1024 * 1024);
      const extension = audioExtension(data);
      return {
        data,
        extension,
        providerTaskId: taskId,
        model: output.dit_model || music.model || 'service-default',
        seed: output.seed_value ?? brief.seed,
      };
    }
    await delay(config.pollMs, undefined, { signal });
  }
  throw Error('音乐生成等待超时；远端任务可能仍在运行，请查看模型服务后再重试');
}
