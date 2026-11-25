import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Agent, controls, text } from './agent.mjs';
import { ApiError, bytes, jsonBody, auth, remoteJSON } from './http.mjs';
import { audioExtension } from './acestep.mjs';
import { engineCatalog, selectEngine, generateMusic, plannerReady } from './engines.mjs';
import { mediaReady } from './media.mjs';
import { plannerCatalog, selectPlanner, checkPlanner } from './planners.mjs';
import {
  loadConnections,
  publicConnections,
  saveConnections,
  listModels,
  connectionVersion,
} from './connections.mjs';
import { convertVoice } from './voice.mjs';

const terminal = (job) => ['succeeded', 'failed', 'cancelled', 'interrupted'].includes(job.status);
const types = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
};
export async function createAPI(config) {
  await mkdir(config.data, { recursive: true });
  config.voice ||= { base: '', key: '', model: 'seed-vc' };
  await loadConnections(config);
  config.mediaReady = await mediaReady(config);
  const records = new Map(),
    aborters = new Map(),
    activePlans = new Set(),
    writes = new Map(),
    jobConfigs = new Map();
  let running = false,
    planning = 0,
    connectionSaving = false;
  const save = (record) => {
    records.set(record.id, record);
    const pending = (writes.get(record.id) || Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const path = join(config.data, record.id + '.json');
        await writeFile(path + '.tmp', JSON.stringify(record), { mode: 0o600 });
        await rename(path + '.tmp', path);
        return record;
      });
    writes.set(record.id, pending);
    return pending;
  };
  const get = (id, kind) => {
    const record = records.get(id);
    if (!record || record.kind !== kind) throw new ApiError(404, '记录不存在');
    return record;
  };
  for (const file of await readdir(config.data)) {
    if (!/^[a-f0-9-]{36}\.json$/.test(file)) continue;
    const record = JSON.parse(await readFile(join(config.data, file), 'utf8'));
    records.set(record.id, record);
    if (record.kind === 'job' && !terminal(record)) {
      record.status = 'interrupted';
      record.error = '应用服务曾重启；任务未自动重新提交，远端可能仍在运行';
      await save(record);
    }
  }
  const queue = [];
  const publicPlan = (plan) => {
    const { promptVersion, brief, ...metadata } = plan;
    const { caption, lyrics, ...publicBrief } = brief;
    return { ...metadata, brief: publicBrief };
  };
  const publicJob = (job) => ({
    ...job,
    audioUrl: job.output ? `/api/jobs/${job.id}/audio` : null,
  });
  const namingPrefixes = { voice: '翻唱歌曲', restyle: '改编歌曲', create: '原创歌曲' };
  const namingMode = (job) => records.get(job.planId)?.mode || 'create';
  const namingCounters = { voice: 0, restyle: 0, create: 0 };
  for (const job of records.values()) {
    if (job.kind === 'job' && Number.isSafeInteger(job.libraryNumber) && job.libraryNumber > 0)
      namingCounters[namingMode(job)] = Math.max(
        namingCounters[namingMode(job)] || 0,
        job.libraryNumber,
      );
  }
  const assignLibraryNumber = (job) => {
    if (!Number.isSafeInteger(job.libraryNumber) || job.libraryNumber < 1) {
      job.libraryNumber = ++namingCounters[namingMode(job)];
      return true;
    }
    return false;
  };
  const defaultTitle = (job) =>
    (namingPrefixes[namingMode(job)] || namingPrefixes.create) + job.libraryNumber;
  const validateTitle = (value) => {
    if (
      typeof value !== 'string' ||
      value.trim().length > 80 ||
      /[\u0000-\u001f\u007f]/.test(value)
    )
      throw new ApiError(400, '作品名称最多 80 个字符，不能包含换行或控制字符。');
    return value.trim();
  };
  const completed = [...records.values()]
    .filter((job) => job.kind === 'job' && job.status === 'succeeded' && job.output)
    .sort(
      (a, b) =>
        String(a.createdAt || a.finishedAt).localeCompare(String(b.createdAt || b.finishedAt)) ||
        a.id.localeCompare(b.id),
    );
  for (const job of completed) if (assignLibraryNumber(job)) await save(job);
  const libraryItem = (job) => {
    const plan = records.get(job.planId);
    return {
      id: job.id,
      title: job.libraryTitle || defaultTitle(job),
      customTitle: job.libraryTitle || '',
      defaultTitle: defaultTitle(job),
      mode: plan?.mode || 'create',
      duration: plan?.brief?.duration || 0,
      model: job.model || '',
      createdAt: job.finishedAt || job.createdAt,
      deletedAt: job.libraryDeletedAt || null,
      audioUrl: `/api/jobs/${job.id}/audio`,
      extension: job.extension,
    };
  };
  const libraryReady = (job) => job.kind === 'job' && job.status === 'succeeded' && job.output;
  async function pump() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const job = records.get(queue.shift());
        if (terminal(job)) continue;
        const aborter = new AbortController();
        aborters.set(job.id, aborter);
        try {
          const plan = get(job.planId, 'plan');
          job.status = 'running';
          await save(job);
          const sourceRecord = plan.assetId ? get(plan.assetId, 'asset') : null;
          const source = sourceRecord
            ? {
                path: join(config.data, sourceRecord.file),
                extension: sourceRecord.extension,
              }
            : null;
          const selectedConfig = jobConfigs.get(job.id) || config;
          const event = (stage, message, extra = {}) => {
            job.stage = stage;
            job.events.push({ time: new Date().toISOString(), message });
            Object.assign(job, extra);
          };
          const referenceRecord = plan.referenceId ? get(plan.referenceId, 'asset') : null;
          const result =
            plan.brief.task === 'voice_cover'
              ? await convertVoice(
                  selectedConfig,
                  plan.brief,
                  source,
                  {
                    path: join(config.data, referenceRecord.file),
                    extension: referenceRecord.extension,
                  },
                  aborter.signal,
                  event,
                )
              : await generateMusic(
                  selectedConfig,
                  plan.engineId,
                  plan.brief,
                  source,
                  aborter.signal,
                  event,
                );
          aborter.signal.throwIfAborted();
          job.output = `${job.id}.${result.extension}`;
          await writeFile(join(config.data, job.output), result.data, {
            mode: 0o600,
          });
          if (result.stems) {
            job.stems = {};
            for (const [name, stem] of Object.entries(result.stems)) {
              const file = `${job.id}-${name}.${stem.extension}`;
              await writeFile(join(config.data, file), stem.data, { mode: 0o600 });
              job.stems[name] = { file, extension: stem.extension };
            }
          }
          aborter.signal.throwIfAborted();
          assignLibraryNumber(job);
          Object.assign(job, {
            status: 'succeeded',
            stage: 'complete',
            bytes: result.data.length,
            extension: result.extension,
            model: result.model,
            seed: result.seed,
            providerTaskId: result.providerTaskId,
          });
        } catch (error) {
          if (job.status !== 'cancelled') {
            job.status = 'failed';
            job.error =
              error instanceof ApiError
                ? error.message
                : `${error.message || '模型调用失败'}`.slice(0, 500);
          }
          delete job.output;
        } finally {
          aborters.delete(job.id);
          jobConfigs.delete(job.id);
          job.finishedAt = new Date().toISOString();
          await save(job);
        }
      }
    } finally {
      running = false;
    }
  }
  const send = (res, code, data) => {
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(data));
  };
  async function handle(req, res, url) {
    if (!url.pathname.startsWith('/api/')) return false;
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.headers['x-musiccraft-client'] !== 'web')
          throw new ApiError(403, '缺少客户端请求标记');
        const origin = req.headers.origin;
        if (origin && origin !== `http://${req.headers.host}`)
          throw new ApiError(403, '不允许跨站请求');
      }
      const path = url.pathname;
      if (path === '/api/status' && req.method === 'GET') {
        send(res, 200, {
          managed: Boolean(config.managed),
          llmConfigured: plannerReady(config),
          musicConfigured: engineCatalog(config).some(
            (engine) => engine.ready && engine.modes.includes('create'),
          ),
          engines: engineCatalog(config),
          domesticOnly: Boolean(config.domesticOnly),
          planners: plannerCatalog(config),
          llmModel: plannerCatalog(config).find((x) => x.ready)?.model || '',
          musicModel:
            engineCatalog(config).find((engine) => engine.ready && engine.modes.includes('create'))
              ?.name || '',
          voiceConfigured: Boolean(config.voice.base),
          voiceModel: 'Seed-VC',
          supportedTasks: ['text2music', 'cover', 'voice_cover'],
        });
      } else if (path === '/api/library' && req.method === 'GET') {
        const items = [...records.values()]
          .filter(libraryReady)
          .map(libraryItem)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        send(res, 200, { items });
      } else if (/^\/api\/library\/[a-f0-9-]{36}(\/restore)?$/.test(path)) {
        const [, , , id, action] = path.split('/');
        const job = get(id, 'job');
        if (!libraryReady(job)) throw new ApiError(409, '只能管理已完成的音乐作品');
        if (!action && req.method === 'PATCH') {
          const { title } = await jsonBody(req);
          job.libraryTitle = validateTitle(title);
        } else if (!action && req.method === 'DELETE') {
          job.libraryDeletedAt ||= new Date().toISOString();
        } else if (action === 'restore' && req.method === 'POST') {
          delete job.libraryDeletedAt;
        } else throw new ApiError(405, '不支持此操作');
        await save(job);
        send(res, 200, libraryItem(job));
      } else if (path === '/api/engines' && req.method === 'GET') {
        send(res, 200, {
          engines: engineCatalog(config),
          planners: plannerCatalog(config),
          managed: Boolean(config.managed),
          plannerConfigured: plannerReady(config),
        });
      } else if (path === '/api/planners' && req.method === 'GET') {
        send(res, 200, { planners: plannerCatalog(config) });
      } else if (path === '/api/connections' && req.method === 'GET') {
        if (config.managed) throw new ApiError(403, '模型由项目管理员统一维护，无需用户配置。');
        send(res, 200, publicConnections(config));
      } else if (path === '/api/connections' && req.method === 'POST') {
        if (config.managed) throw new ApiError(403, '模型由项目管理员统一维护，无需用户配置。');
        const input = await jsonBody(req);
        if (planning || connectionSaving)
          throw new ApiError(409, '请等待当前请求完成再修改模型连接');
        connectionSaving = true;
        try {
          send(res, 200, await saveConnections(config, input));
        } finally {
          connectionSaving = false;
        }
      } else if (path === '/api/models' && req.method === 'GET') {
        send(res, 200, await listModels(config, url.searchParams.get('kind')));
      } else if (path === '/api/health' && req.method === 'GET') {
        const kind = url.searchParams.get('kind') || 'music';
        if (!['music', 'voice', 'llm'].includes(kind)) throw new ApiError(400, '无效服务类型');
        if (kind === 'llm') {
          send(res, 200, await checkPlanner(config, url.searchParams.get('plannerId') || 'auto'));
          return true;
        }
        const engineId =
          url.searchParams.get('engineId') || (config.managed && kind !== 'llm' ? 'auto' : '');
        if (engineId) {
          const engine = selectEngine(
            config,
            engineId,
            kind === 'voice'
              ? 'voice'
              : url.searchParams.get('mode') === 'restyle'
                ? 'restyle'
                : 'create',
          );
          if (['fal', 'mureka'].includes(engine.provider)) {
            send(res, 200, {
              configured: true,
              reachable: false,
              note: '云端模型已由管理员配置，密钥权限和余额将在实际任务中验证。',
            });
            return true;
          }
        }
        const selected = config[kind];
        if (!selected.base) throw new ApiError(503, '请打开「模型与连接」填写服务地址并保存');
        const health = await remoteJSON(
          `${selected.base}${kind === 'llm' ? '/models' : '/health'}`,
          {
            headers: auth(selected.key),
          },
        );
        if (kind === 'voice' && health.ready === false)
          throw new ApiError(503, '换声服务可达，但缺少模型或推理依赖，请检查 Worker 环境');
        send(res, 200, {
          reachable: true,
          note: '服务可达不代表模型效果已验证',
        });
      } else if (path === '/api/assets' && req.method === 'POST') {
        const data = await bytes(req, 30 * 1024 * 1024);
        let extension;
        try {
          extension = audioExtension(data);
        } catch (error) {
          throw new ApiError(400, error.message);
        }
        const id = randomUUID(),
          file = `${id}.${extension}`;
        await writeFile(join(config.data, file), data, { mode: 0o600 });
        await save({ id, kind: 'asset', extension, file, bytes: data.length });
        send(res, 201, { id, bytes: data.length });
      } else if (path === '/api/plans' && req.method === 'POST') {
        if (planning >= 3) throw new ApiError(429, 'Agent 正忙，请稍后重试');
        const body = await jsonBody(req);
        if (connectionSaving) throw new ApiError(409, '请等待模型连接保存完成');
        if (!['create', 'restyle', 'voice'].includes(body.mode))
          throw new ApiError(400, '无效创作模式');
        const previous = body.parentPlanId ? get(body.parentPlanId, 'plan') : null;
        if (previous && previous.mode !== body.mode)
          throw new ApiError(400, '修订需要使用相同任务模式');
        const input = {
          mode: body.mode,
          instruction: text(body.instruction, '创作要求', 4000),
          controls: controls(body.controls),
          style: text(body.style || '', '风格', 100, true),
          assetId: previous?.assetId || body.assetId || null,
          referenceId: previous?.referenceId || body.referenceId || null,
          language: body.language === 'en' ? 'en' : 'zh',
        };
        if (['restyle', 'voice'].includes(input.mode) && !input.assetId)
          throw new ApiError(400, '请先上传用于风格改编的源音频');
        if (input.assetId) get(input.assetId, 'asset');
        if (input.mode === 'voice') {
          input.controls.instrumental = false;
          if (!input.referenceId) throw new ApiError(400, '请上传自己的清晰歌声参考录音');
          get(input.referenceId, 'asset');
          if (input.controls.duration > 40) throw new ApiError(400, '换声首版支持 10–40 秒');
          const clipStart = body.clipStart ?? 0,
            gain = body.vocalGain ?? 0;
          if (
            typeof clipStart !== 'number' ||
            !Number.isFinite(clipStart) ||
            clipStart < 0 ||
            clipStart > 3600 ||
            typeof gain !== 'number' ||
            !Number.isFinite(gain) ||
            gain < -12 ||
            gain > 6
          )
            throw new ApiError(400, '换声起点或人声音量无效');
          input.clipStart = clipStart;
          input.vocalGain = gain;
        }
        if (input.mode === 'create') input.assetId = null;
        const planner = selectPlanner(config, body.plannerId || 'auto');
        const engine = selectEngine(
          config,
          body.engineId || 'auto',
          input.mode,
          input.controls.instrumental,
          false,
        );
        const planningConfig = { ...config, llm: planner.service };
        planning++;
        let result;
        try {
          result = await new Agent(planningConfig).plan({ ...input, engine }, previous);
        } finally {
          planning--;
        }
        const plan = await save({
          id: randomUUID(),
          kind: 'plan',
          ...input,
          ...result,
          engineId: engine.id,
          engineName: engine.name,
          plannerId: planner.id,
          plannerName: planner.name,
          plannerModel: planner.service.model,
          parentPlanId: previous?.id || null,
          connectionVersion: connectionVersion(config),
          createdAt: new Date().toISOString(),
        });
        send(res, 201, publicPlan(plan));
      } else if (path === '/api/jobs' && req.method === 'POST') {
        const body = await jsonBody(req),
          plan = get(body.planId, 'plan');
        const title = validateTitle(body.title === undefined ? '' : body.title);
        if (connectionSaving) throw new ApiError(409, '请等待模型连接保存完成');
        if (plan.brief.status !== 'ready')
          throw new ApiError(409, '该计划需要澄清或包含当前工具不支持的要求');
        if (plan.connectionVersion && plan.connectionVersion !== connectionVersion(config))
          throw new ApiError(409, '模型连接或选择已改变，请重新制定计划');
        selectEngine(config, plan.engineId || 'auto', plan.mode, plan.brief.instrumental);
        const existing = [...records.values()].find(
          (x) =>
            x.kind === 'job' &&
            x.planId === plan.id &&
            ['queued', 'running', 'succeeded'].includes(x.status),
        );
        if (existing) {
          send(res, 200, publicJob(existing));
          return true;
        }
        if (queue.length >= 4 || activePlans.has(plan.id))
          throw new ApiError(429, '音乐任务队列已满，请稍后再试');
        activePlans.add(plan.id);
        const selectedConfig = structuredClone(config);
        let job;
        try {
          job = await save({
            id: randomUUID(),
            kind: 'job',
            planId: plan.id,
            libraryTitle: title,
            status: 'queued',
            stage: 'queued',
            provenance: 'live-model',
            createdAt: new Date().toISOString(),
            events: [{ time: new Date().toISOString(), message: '等待执行' }],
          });
          queue.push(job.id);
          jobConfigs.set(job.id, selectedConfig);
        } finally {
          activePlans.delete(plan.id);
        }
        send(res, 202, publicJob(job));
        pump().catch(() => {});
      } else if (
        /^\/api\/jobs\/[a-f0-9-]{36}(\/audio(?:\/[a-z_]+)?|\/cancel|\/review)?$/.test(path)
      ) {
        const [, , , id, action] = path.split('/');
        const job = get(id, 'job');
        if (!action && req.method === 'GET') send(res, 200, publicJob(job));
        else if (action === 'cancel' && req.method === 'POST') {
          if (!terminal(job)) {
            job.status = 'cancelled';
            job.error =
              get(job.planId, 'plan').brief.task === 'voice_cover'
                ? '已发送换声取消请求；请以服务端任务状态为准。'
                : '已停止本应用等待，并尽可能请求云端取消；运行中的任务可能继续执行。';
            aborters.get(job.id)?.abort();
            await save(job);
          }
          send(res, 200, publicJob(job));
        } else if (action === 'review' && req.method === 'POST') {
          if (job.status !== 'succeeded') throw new ApiError(409, '生成完成后才能提交试听反馈');
          const { feedback } = await jsonBody(req);
          const plan = get(job.planId, 'plan');
          if (plan.connectionVersion && plan.connectionVersion !== connectionVersion(config))
            throw new ApiError(409, '模型配置已改变，请重新制定计划后再生成反馈。');
          const planner = selectPlanner(config, plan.plannerId || 'auto');
          const review = await new Agent({ ...config, llm: planner.service }).review(
            plan,
            job,
            text(feedback, '试听反馈', 3000),
          );
          send(res, 200, {
            ...review,
            plannerId: planner.id,
            plannerName: planner.name,
            plannerModel: planner.service.model,
          });
        } else if (action === 'audio' && ['GET', 'HEAD'].includes(req.method)) {
          if (job.status !== 'succeeded' || !job.output) throw new ApiError(409, '音频尚未生成');
          const stemName = path.split('/')[5];
          const stem = stemName ? job.stems?.[stemName] : null;
          if (stemName && !stem) throw new ApiError(404, '该音轨不存在');
          const data = await readFile(join(config.data, stem?.file || job.output));
          let start = 0,
            end = data.length - 1,
            status = 200;
          if (req.headers.range) {
            const range = req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
            if (!range || (!range[1] && !range[2])) throw new ApiError(416, '无效音频范围');
            start = range[1] ? Number(range[1]) : Math.max(0, data.length - Number(range[2]));
            end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
            if (start > end || start >= data.length) throw new ApiError(416, '无效音频范围');
            status = 206;
          }
          res.writeHead(status, {
            'Content-Type': types[stem?.extension || job.extension],
            'Content-Length': end - start + 1,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
            ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${data.length}` } : {}),
          });
          res.end(req.method === 'HEAD' ? undefined : data.subarray(start, end + 1));
        } else throw new ApiError(405, '不支持此操作');
      } else throw new ApiError(404, 'API 不存在');
    } catch (error) {
      send(res, error.status || 502, {
        error: error.message || '模型请求失败，请检查配置和服务状态',
      });
    }
    return true;
  }
  return {
    handle,
    close: () => {
      for (const aborter of aborters.values()) aborter.abort();
    },
  };
}
