import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ApiError, auth, remoteJSON } from './http.mjs';

function connection(value, previous, kind) {
  if (!value || typeof value !== 'object') throw new ApiError(400, '连接配置格式错误');
  let base = String(value.base || '')
    .trim()
    .replace(/\/$/, '');
  if (base) {
    let url;
    try {
      url = new URL(base);
    } catch {
      throw new ApiError(400, '服务地址必须是完整的 HTTP 或 HTTPS 地址');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new ApiError(400, '服务地址不能包含账号、查询参数或片段');
    base = url.href.replace(/\/$/, '');
  }
  if (
    typeof value.model !== 'string' ||
    value.model.length > 200 ||
    (value.key !== undefined && (typeof value.key !== 'string' || value.key.length > 4000))
  )
    throw new ApiError(400, '模型或密钥格式错误');
  const key = value.clearKey
    ? ''
    : value.key || (base === previous?.base ? previous?.key || '' : '');
  return {
    base,
    model: kind === 'voice' ? 'seed-vc' : value.model.trim(),
    key,
    ...(kind === 'llm' ? { json: value.json !== false } : {}),
  };
}
export async function loadConnections(config) {
  if (config.managed) return;
  try {
    const saved = JSON.parse(await readFile(join(config.data, 'connections.json'), 'utf8'));
    for (const kind of ['llm', 'music', 'voice'])
      if (saved[kind]) config[kind] = connection(saved[kind], config[kind], kind);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
export function publicConnections(config) {
  return Object.fromEntries(
    ['llm', 'music', 'voice'].map((kind) => {
      const { key, ...publicValue } = config[kind];
      return [
        kind,
        {
          ...publicValue,
          hasKey: Boolean(key),
          protocol:
            kind === 'llm' ? 'chat-completions' : kind === 'music' ? 'acestep' : 'seed-vc-worker',
        },
      ];
    }),
  );
}
export async function saveConnections(config, input) {
  const next = Object.fromEntries(
    ['llm', 'music', 'voice'].map((kind) => [
      kind,
      connection(input[kind] || config[kind], config[kind], kind),
    ]),
  );
  const path = join(config.data, 'connections.json');
  await writeFile(path + '.tmp', JSON.stringify(next), { mode: 0o600 });
  await rename(path + '.tmp', path);
  Object.assign(config, next);
  return publicConnections(config);
}
export function connectionVersion(config) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        services: ['llm', 'music', 'voice'].map((kind) => config[kind]),
        fal: config.fal || null,
        mureka: config.mureka || null,
        domesticOnly: Boolean(config.domesticOnly),
        planners: config.planners || null,
        defaultPlanner: config.defaultPlanner || null,
        mediaReady: config.mediaReady ?? null,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}
export async function listModels(config, kind) {
  if (!['llm', 'music'].includes(kind)) throw new ApiError(400, '请选择 LLM 或音乐服务');
  const service = config[kind];
  if (!service.base) throw new ApiError(400, '请先填写并保存服务地址，再读取模型列表');
  const result = await remoteJSON(service.base + (kind === 'llm' ? '/models' : '/v1/models'), {
    headers: auth(service.key),
  });
  const rows = Array.isArray(result.data) ? result.data : result.data?.models;
  if (!Array.isArray(rows))
    throw new ApiError(502, '服务没有返回兼容的模型列表，可手动填写实际模型 ID');
  return {
    models: rows
      .map((x) => (typeof x === 'string' ? x : x.id || x.name))
      .filter((x) => typeof x === 'string' && x.length < 200)
      .slice(0, 100),
  };
}
