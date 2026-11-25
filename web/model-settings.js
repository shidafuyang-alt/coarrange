'use strict';
window.MusicCraftConnections = (() => {
  let engines = [],
    planners = [],
    loaded = false,
    error = '';
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  function card(e, isPlanner = false) {
    return `<article class="engine-card"><div class="engine-card-head"><strong data-i18n-ignore>${esc(e.name)}</strong><span class="engine-state ${e.ready ? 'configured' : ''}">${e.ready ? '已配置 · 待推理验证' : '待管理员开通'}</span></div>${isPlanner ? `<span class="engine-model-id" data-i18n-ignore>${esc(e.model)}</span>` : ''}<p>${esc(e.description)}</p><div class="engine-tags">${isPlanner ? '<span>需求理解</span><span>创意整理</span><span>试听反馈</span>' : e.modes.map((m) => `<span>${{ create: '音乐创作', restyle: '风格改编', voice: '个人换声' }[m]}</span>`).join('')}</div>${e.source ? `<a class="engine-source" href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">模型资料 ↗</a>` : ''}</article>`;
  }
  function form() {
    if (error) return `<p class="helper" role="status">${esc(error)}</p>`;
    if (!loaded) return '<p class="helper">正在读取项目内置引擎…</p>';
    return `<p class="helper">项目统一提供模型账号与额度。AI 助手理解创意，音乐模型创作音频，用户无需填写地址或密钥。</p><h3 class="model-catalog-heading">创作助手</h3><div class="engine-catalog">${planners.map((p) => card(p, true)).join('')}</div><h3 class="model-catalog-heading">音乐生成与歌声转换模型</h3><div class="engine-catalog">${engines.map((e) => card(e)).join('')}</div><p class="helper engine-owner-note">选择功能后即可生成作品，系统自动安排创作过程；未开通的服务会标明状态。</p>`;
  }
  function panel() {
    return `<details class="panel connection-panel" id="model-connections"><summary><span class="connection-summary-title"><span class="connection-dot" aria-hidden="true"></span><span>各部分使用的模型</span></span><span class="connection-summary-action"><span>由项目统一提供</span><span class="connection-chevron" aria-hidden="true">↗</span></span></summary><div data-connection-content>${form()}</div></details>`;
  }
  function paint() {
    const target = document.querySelector('[data-connection-content]');
    if (target) {
      target.innerHTML = form();
      window.CoLocale?.apply(target);
    }
  }
  fetch('/api/engines')
    .then(async (response) => {
      if (!response.ok) throw Error();
      const data = await response.json();
      if (!Array.isArray(data.engines) || !Array.isArray(data.planners)) throw Error();
      engines = data.engines;
      planners = data.planners;
      loaded = true;
      paint();
    })
    .catch(() => {
      error = '当前是离线展示版，实时创作需要项目的在线服务。';
      paint();
    });
  return { panel };
})();
