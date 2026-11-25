import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { ApiError, auth, bounded, remoteJSON } from './http.mjs';
import { audioExtension } from './acestep.mjs';

export async function convertVoice(config, brief, source, reference, signal, event) {
  try {
    return await runVoiceConversion(config, brief, source, reference, signal, event);
  } catch (error) {
    if (!signal.aborted && error instanceof TypeError && error.message === 'fetch failed') {
      throw new ApiError(
        503,
        '无法连接换声服务，请确认 AutoDL 实例已开机、换声服务已启动，并重新连接 SSH 隧道后重试。',
      );
    }
    throw error;
  }
}

async function runVoiceConversion(config, brief, source, reference, signal, event) {
  const headers = auth(config.voice.key),
    form = new FormData();
  form.set('source', new Blob([await readFile(source.path)]), `song.${source.extension}`);
  form.set(
    'reference',
    new Blob([await readFile(reference.path)]),
    `reference.${reference.extension}`,
  );
  form.set(
    'spec',
    JSON.stringify({
      task: 'voice_cover',
      duration: brief.duration,
      clip_start: brief.clip_start || 0,
      vocal_gain_db: brief.vocal_gain_db || 0,
    }),
  );
  event('submitting', '提交人声分离与换声任务');
  const job = await remoteJSON(
    config.voice.base + '/v1/jobs',
    { method: 'POST', headers, body: form },
    signal,
  );
  if (!/^[a-f0-9]{32}$/.test(job.id || '')) throw Error('换声服务未返回有效任务 ID');
  const endpoint = `${config.voice.base}/v1/jobs/${job.id}`;
  const started = Date.now();
  try {
    while (Date.now() - started < config.timeoutMs) {
      signal.throwIfAborted();
      const state = await remoteJSON(endpoint, { headers }, signal);
      event(state.stage || state.status, state.message || '正在转换歌声', {
        providerTaskId: job.id,
      });
      if (['failed', 'canceled'].includes(state.status))
        throw Error(state.error || '换声任务未完成');
      if (state.status === 'succeeded') {
        const outputs = {};
        for (const name of [
          'result',
          'source_clip',
          'original_vocals',
          'converted_vocals',
          'accompaniment',
        ]) {
          const file = state.artifacts?.[name];
          if (!file) {
            if (name === 'result') throw Error('换声服务未返回结果音频');
            continue;
          }
          const url = new URL(file, config.voice.base + '/');
          if (
            url.origin !== new URL(config.voice.base).origin ||
            url.pathname !== `/v1/jobs/${job.id}/audio/${name}` ||
            url.username ||
            url.password
          )
            throw Error('换声服务返回无效下载地址');
          const response = await fetch(url, {
            headers,
            redirect: 'error',
            signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
          });
          if (!response.ok) throw Error('换声音频下载失败');
          const data = await bounded(response, 100 * 1024 * 1024);
          outputs[name] = { data, extension: audioExtension(data) };
        }
        return {
          ...outputs.result,
          stems: outputs,
          model: 'Seed-VC + Demucs',
          providerTaskId: job.id,
          seed: null,
        };
      }
      await delay(config.pollMs, undefined, { signal });
    }
    throw Error('换声等待超时');
  } finally {
    if (signal.aborted || Date.now() - started >= config.timeoutMs) {
      await fetch(endpoint + '/cancel', {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      }).catch(() => {});
    }
  }
}
