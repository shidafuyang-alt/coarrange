import { ApiError, auth, remoteJSON } from './http.mjs';

function definitions(config) {
  const direct = config.planners || {};
  const rows = [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      service: direct.deepseek || { model: 'deepseek-flash' },
      source: 'https://api-docs.deepseek.com/',
      description: '理解创意、安排创作任务，并整理试听反馈。',
    },
    {
      id: 'openai',
      name: 'OpenAI / ChatGPT',
      service: direct.openai || { model: 'gpt-5.4-mini' },
      source: 'https://developers.openai.com/api/docs/models/gpt-5.4-mini',
      description: '通过 OpenAI API 理解创意、安排任务与提出修改建议。',
    },
  ];
  if (config.llm.base && config.llm.model)
    rows.push({
      id: 'project-llm',
      name: config.llm.provider === 'fal' ? 'Project LLM · fal' : 'Project LLM',
      service: config.llm,
      source: config.llm.provider === 'fal' ? 'https://fal.ai/models/openrouter/router/api' : '',
      description: '项目管理员配置的创作助手，用于理解要求和安排任务。',
    });
  return config.domesticOnly ? rows.filter((row) => row.id === 'deepseek') : rows;
}
function configured(config, service) {
  return Boolean(
    service.base &&
      service.model &&
      (service.provider === 'fal'
        ? config.fal?.key
        : ['deepseek', 'openai'].includes(service.provider)
          ? service.key
          : true),
  );
}
export function plannerCatalog(config) {
  return definitions(config).map(({ service, ...row }) => ({
    ...row,
    model: service.model,
    role: 'prompt-planning',
    configured: configured(config, service),
    ready: configured(config, service),
    status: configured(config, service) ? 'configured' : 'awaiting-admin',
    availabilityNote: '配置状态不等于实时调用验证',
  }));
}
export function plannerReady(config) {
  return plannerCatalog(config).some((x) => x.ready);
}
export function selectPlanner(config, id = 'auto') {
  let rows = definitions(config);
  if (typeof id !== 'string') throw new ApiError(400, '创作助手选择无效。');
  if (id === 'auto') {
    rows = rows.filter((x) => configured(config, x.service));
    rows.sort(
      (a, b) => Number(b.id === config.defaultPlanner) - Number(a.id === config.defaultPlanner),
    );
  } else rows = rows.filter((x) => x.id === id);
  const selected = rows[0];
  if (!selected)
    throw new ApiError(
      id === 'auto' ? 503 : 400,
      id === 'auto'
        ? '创作助手尚未开通，请由项目管理员配置 DeepSeek 或 OpenAI 密钥。'
        : '创作助手选择无效。',
    );
  if (!configured(config, selected.service))
    throw new ApiError(503, '所选创作助手尚未由项目管理员开通，用户无需自行填写密钥。');
  return selected;
}
export async function checkPlanner(config, id) {
  const planner = selectPlanner(config, id);
  if (planner.service.provider === 'fal')
    return {
      configured: true,
      reachable: false,
      note: '创作助手已配置，权限和额度将在实际生成时验证。',
    };
  await remoteJSON(planner.service.base + '/models', { headers: auth(planner.service.key) });
  return {
    configured: true,
    reachable: true,
    note: '创作助手接口可达，实际生成能力以执行结果为准。',
    plannerId: planner.id,
    plannerModel: planner.service.model,
  };
}
