export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export async function bytes(request, limit) {
  if (Number(request.headers['content-length']) > limit) throw new ApiError(413, '文件或请求过大');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new ApiError(413, '文件或请求过大');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request) {
  try {
    const result = JSON.parse((await bytes(request, 64 * 1024)).toString());
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error();
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, '请求必须是 JSON 对象');
  }
}
export async function bounded(response, max = 2 * 1024 * 1024) {
  if (Number(response.headers.get('content-length')) > max) throw Error('模型响应过大');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > max) {
      await response.body?.cancel().catch(() => {});
      throw Error('模型响应过大');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export async function remoteJSON(url, options = {}, signal) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
      : AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    let failure = {};
    try {
      failure = JSON.parse((await bounded(response, 64 * 1024)).toString());
    } catch {}
    if (
      response.status === 429 &&
      [failure.error?.code, failure.error?.type].some((code) =>
        ['credit_balance_exhausted', 'insufficient_quota'].includes(code),
      )
    )
      throw new ApiError(503, '项目的 AI 服务额度不足，请联系项目管理员补充 API 额度。');
    // Provider messages can contain credential fragments; only expose a generic status.
    throw Error(`模型服务返回 HTTP ${response.status}，请检查地址、权限和服务日志`);
  }
  let result;
  try {
    result = JSON.parse((await bounded(response)).toString());
  } catch {
    throw Error('模型服务没有返回有效 JSON');
  }
  if (result.error || (result.code && Number(result.code) !== 200))
    throw Error('模型服务报告失败，请检查服务日志');
  return result;
}
export const auth = (key) => (key ? { Authorization: `Bearer ${key}` } : {});
