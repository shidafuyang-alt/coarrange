import { setTimeout as delay } from 'node:timers/promises';
import { ApiError, bounded } from './http.mjs';

// Fixed endpoints and server-only credentials. No browser-provided service URL is used.
export async function falJSON(config, url, options = {}, signal) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Key ${config.fal.key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    redirect: 'error',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
      : AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const notes = {
      401: '项目的云端模型密钥无效，请联系项目管理员。',
      402: '项目的云端模型额度不足，请联系项目管理员。',
      403: '项目尚未获得该模型的使用权限。',
      422: '模型不接受本次参数，请调整音乐要求后重试。',
      429: '云端模型繁忙或额度受限，请稍后重试。',
    };
    throw new ApiError(
      502,
      notes[response.status] || `云端模型请求失败（HTTP ${response.status}）。`,
    );
  }
  const value = JSON.parse((await bounded(response)).toString());
  if (value.error) throw new ApiError(502, '云端模型报告生成失败，请修改要求或联系项目管理员。');
  return value;
}
function queueURL(base, endpoint, id, url, suffix = '') {
  const value = new URL(url);
  const expected = '/' + endpoint.split('/').slice(0, 2).join('/') + '/requests/' + id + suffix;
  if (
    value.origin !== new URL(base).origin ||
    value.pathname !== expected ||
    value.username ||
    value.password ||
    value.search ||
    value.hash
  )
    throw new ApiError(502, '云端模型返回了无效的任务地址。');
  return value.href;
}
export async function runFal(config, endpoint, input, signal, event = () => {}) {
  if (!config.fal?.key)
    throw new ApiError(503, '项目管理员尚未开通云端模型，用户无需自行填写地址或密钥。');
  const base = config.fal.base || 'https://queue.fal.run';
  signal ||= AbortSignal.timeout(config.timeoutMs);
  const operation = AbortSignal.any([signal, AbortSignal.timeout(config.timeoutMs)]);
  event('submitting', '正在提交云端音乐任务');
  const task = await falJSON(
    config,
    base + '/' + endpoint,
    { method: 'POST', body: JSON.stringify(input) },
    operation,
  );
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(task.request_id || ''))
    throw new ApiError(502, '云端模型未返回有效任务 ID。');
  const id = task.request_id;
  const statusURL = queueURL(base, endpoint, id, task.status_url, '/status');
  const resultURL = queueURL(base, endpoint, id, task.response_url);
  const cancelURL = queueURL(base, endpoint, id, task.cancel_url, '/cancel');
  let finished = false;
  try {
    while (true) {
      operation.throwIfAborted();
      const state = await falJSON(config, statusURL, {}, operation);
      event(
        state.status === 'IN_QUEUE' ? 'queued' : 'generating',
        state.status === 'IN_QUEUE' ? '云端模型排队中' : '云端模型正在生成音乐',
        { providerTaskId: id },
      );
      if (state.status === 'COMPLETED') {
        finished = true;
        return { result: await falJSON(config, resultURL, {}, operation), id };
      }
      if (!['IN_QUEUE', 'IN_PROGRESS'].includes(state.status))
        throw new ApiError(502, '云端模型返回了未知任务状态。');
      await delay(config.pollMs, undefined, { signal: operation });
    }
  } finally {
    if (!finished)
      await falJSON(config, cancelURL, { method: 'PUT' }, AbortSignal.timeout(5000)).catch(
        () => {},
      );
  }
}
export async function downloadFal(config, value, signal) {
  const url = new URL(value);
  const allowed =
    url.protocol === 'https:' &&
    (url.hostname === 'fal.media' ||
      url.hostname.endsWith('.fal.media') ||
      url.hostname === 'storage.googleapis.com');
  // Extra origins exist only in in-process test fixtures; they are never accepted from the web API.
  if (
    (!allowed && !config.fal.testDownloadOrigins?.includes(url.origin)) ||
    url.username ||
    url.password
  )
    throw new ApiError(502, '云端模型返回了不受支持的音频下载地址。');
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
  });
  if (!response.ok) throw new ApiError(502, '云端音频下载失败。');
  return bounded(response, 100 * 1024 * 1024);
}
