'use strict';
window.MusicCraftAgent = (() => {
  const states = Object.fromEntries(
    ['create', 'restyle', 'voice'].map((mode) => [
      mode,
      {
        engineId: 'auto',
        plannerId: 'auto',
        instruction: '',
        feedback: '',
        duration: 20,
        style: '',
        seed: 42,
        instrumental: true,
        file: null,
        referenceFile: null,
        referenceId: null,
        clipStart: 0,
        vocalGain: 0,
        assetId: null,
        plan: null,
        job: null,
        review: null,
        error: '',
        busy: false,
        token: 0,
      },
    ]),
  );
  try {
    const saved = JSON.parse(sessionStorage.getItem('musiccraft-agent') || '{}');
    for (const mode of ['create', 'restyle', 'voice'])
      if (saved[mode])
        Object.assign(states[mode], saved[mode], {
          busy: false,
          file: null,
          referenceFile: null,
          token: 0,
        });
  } catch {}
  for (const state of Object.values(states)) {
    if (state.plan?.brief) {
      delete state.plan.brief.caption;
      delete state.plan.brief.lyrics;
    }
    if (state.plan) delete state.plan.promptVersion;
    delete state.copyMessage;
  }
  let service = null;
  let activeMode = 'create';
  try {
    const savedMode = sessionStorage.getItem('musiccraft-agent-mode');
    if (['restyle', 'voice'].includes(savedMode)) activeMode = savedMode;
  } catch {}
  function selectMode(mode) {
    if (!states[mode] || states[activeMode].busy) return;
    if (mode !== activeMode && !states[mode].instruction && !states[mode].plan) {
      for (const key of mode === 'voice' || activeMode === 'voice'
        ? ['duration', 'seed']
        : ['instruction', 'duration', 'seed', 'instrumental', 'style'])
        states[mode][key] = states[activeMode][key];
    }
    activeMode = mode;
    if (mode === 'voice') states[mode].duration = Math.min(40, states[mode].duration);
    try {
      sessionStorage.setItem('musiccraft-agent-mode', mode);
    } catch {}
    const root = document.querySelector('[data-agent-mode]');
    if (root) root.outerHTML = panel(activeMode);
    refresh(activeMode);
  }
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    );
  async function api(path, body, raw = false) {
    const response = await fetch(
      '/api/' + path,
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: {
              'X-MusicCraft-Client': 'web',
              ...(raw ? {} : { 'Content-Type': 'application/json' }),
            },
            body: raw ? body : JSON.stringify(body),
          },
    );
    let result;
    try {
      result = await response.json();
    } catch {
      throw Error('此页面是静态版本，模型功能需要通过 npm start 启动应用服务。');
    }
    if (!response.ok) throw Error(result.error || `服务错误 ${response.status}`);
    return result;
  }
  function engineOptions(mode) {
    const selected = states[mode].engineId || 'auto';
    return (
      `<option value="auto" ${selected === 'auto' ? 'selected' : ''}>自动选择（推荐）</option>` +
      (service?.engines || [])
        .filter((e) => e.modes.includes(mode))
        .map(
          (e) =>
            `<option value="${esc(e.id)}" ${selected === e.id ? 'selected' : ''} ${!states[mode].instrumental && !e.vocals ? 'disabled' : ''}>${esc(e.name)}${e.ready && (mode !== 'restyle' || e.restyleReady) ? '' : ' · ' + CoLocale.text('待管理员开通')}</option>`,
        )
        .join('')
    );
  }
  function currentEngineReady(mode) {
    const s = states[mode];
    return (service?.engines || []).some(
      (e) =>
        e.ready &&
        e.modes.includes(mode) &&
        (mode !== 'restyle' || e.restyleReady) &&
        (s.instrumental || e.vocals) &&
        (!s.engineId || s.engineId === 'auto' || s.engineId === e.id),
    );
  }
  function plannerOptions(mode) {
    const selected = states[mode].plannerId || 'auto';
    return (
      `<option value="auto" ${selected === 'auto' ? 'selected' : ''}>自动选择（推荐）</option>` +
      (service?.planners || [])
        .map(
          (p) =>
            `<option value="${esc(p.id)}" ${selected === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(p.model)}${p.ready ? '' : ' · ' + CoLocale.text('待管理员开通')}</option>`,
        )
        .join('')
    );
  }
  function currentPlannerReady(mode) {
    const id = states[mode].plannerId || 'auto';
    return (service?.planners || []).some((p) => p.ready && (id === 'auto' || p.id === id));
  }
  function plannerMessage(mode) {
    if (!service) return '正在读取创作助手…';
    if (states[mode].plannerHealthNote) return states[mode].plannerHealthNote;
    return currentPlannerReady(mode)
      ? '创作助手已配置，将自动理解你的要求。'
      : service.domesticOnly
        ? '创作助手待管理员开通：DeepSeek。'
        : '创作助手待管理员开通：DeepSeek 或 OpenAI。';
  }
  function serviceMessage(mode) {
    if (!service) return '正在读取音乐模型…';
    if (states[mode].healthNote) return states[mode].healthNote;
    return currentEngineReady(mode) ? '音乐模型已配置，可直接开始创作。' : '音乐模型待管理员开通。';
  }
  function taskModels(mode) {
    return (service?.engines || [])
      .filter((e) => e.modes.includes(mode) && (states[mode].instrumental || e.vocals))
      .map(
        (e) =>
          `<span class="task-model ${e.ready && (mode !== 'restyle' || e.restyleReady) ? 'is-configured' : ''}"><span data-i18n-ignore>${esc(e.name)}</span><small>${e.ready && (mode !== 'restyle' || e.restyleReady) ? '已配置' : '待开通'}</small></span>`,
      )
      .join('');
  }
  function plannerModels() {
    return (service?.planners || [])
      .map(
        (p) =>
          `<span class="task-model ${p.ready ? 'is-configured' : ''}"><span data-i18n-ignore>${esc(p.name)} · ${esc(p.model)}</span><small>${p.ready ? '已配置' : '待开通'}</small></span>`,
      )
      .join('');
  }
  function modelWorkflow(mode) {
    const voice = mode === 'voice';
    return `<section class="music-model-settings" aria-label="音乐与换声模型"><div class="model-stage-heading"><h3>${voice ? '歌声转换模型' : '音乐生成模型'}</h3><button class="text-btn" data-agent-action="health">检查音乐服务</button></div><label class="field-label"><span class="sr-only">音乐与换声模型</span><select data-agent-field="engineId" aria-label="音乐与换声模型">${engineOptions(mode)}</select></label><div class="task-models" data-task-models>${taskModels(mode)}</div><p class="model-stage-status" data-agent-status>${serviceMessage(mode)}</p>
    <div data-engine-notes>${engineNotes(mode)}</div><details class="creative-assistant-settings"><summary>创作助手设置</summary><p class="helper">AI 助手会自动理解你的要求，普通用户无需调整。</p><label class="field-label">创作助手<select data-agent-field="plannerId" aria-label="创作助手">${plannerOptions(mode)}</select></label><div class="task-models" data-planner-models>${plannerModels()}</div><p class="model-stage-status" data-agent-planner-status>${plannerMessage(mode)}</p><button class="text-btn" data-agent-action="planner-health">检查助手服务</button></details></section>`;
  }
  function engineNotes(mode) {
    const s = states[mode];
    const rows = (service?.engines || []).filter(
      (e) =>
        e.modes.includes(mode) &&
        (s.instrumental || e.vocals) &&
        (!s.engineId || s.engineId === 'auto' || s.engineId === e.id),
    );
    rows.sort(
      (a, b) =>
        Number(b.ready && (mode !== 'restyle' || b.restyleReady)) -
        Number(a.ready && (mode !== 'restyle' || a.restyleReady)),
    );
    const e = rows[0];
    return [e?.executionNote, e?.cancellationNote]
      .filter(Boolean)
      .map((note) => `<p class="helper">${esc(note)}</p>`)
      .join('');
  }
  function generationLabel(mode) {
    const s = states[mode];
    if (s.busy || ['queued', 'running'].includes(s.job?.status)) return '正在处理…';
    return mode === 'voice'
      ? '开始换声'
      : s.plan
        ? '生成新版本'
        : mode === 'restyle'
          ? '开始改编'
          : '生成音乐';
  }
  function panel(mode) {
    const s = states[mode],
      cover = mode === 'restyle',
      voice = mode === 'voice';
    return `<section id="music-agent" class="panel agent-panel" data-agent-mode="${mode}" aria-label="MusicCraft 音乐 Agent">
      <div class="agent-heading"><div><span class="art-section-kicker" data-i18n-ignore>01 / THE CREATIVE DESK</span><h2 class="panel-title">音乐创作与改编</h2></div><span class="badge-small">MusicCraft Agent</span></div>
      <p>描述想法、上传素材，直接生成并试听你的作品。</p>
      <div class="agent-modes" role="group" aria-label="音乐任务">${[
        ['create', '创作新音乐'],
        ['restyle', '改编已有音乐'],
        ['voice', '用我的声音翻唱'],
      ]
        .map(
          ([id, label]) =>
            `<button class="btn ${mode === id ? 'btn-primary' : 'btn-outline'}" data-agent-mode-switch="${id}" aria-pressed="${mode === id}">${label}</button>`,
        )
        .join('')}</div>
      ${modelWorkflow(mode)}
      <div class="agent-layout"><div>
      <label class="field-label">${s.plan ? '补充要求或下一轮修改' : '你的音乐要求'}<textarea class="textarea" data-agent-field="instruction" placeholder="${voice ? '用参考歌声替换原唱，保留原曲旋律、歌词与伴奏。' : cover ? '改成木吉他流行风，尽量保留旋律，纯音乐' : '雨天听的安静钢琴和弦乐，纯音乐'}">${esc(s.instruction)}</textarea></label>
      <label class="field-label">源音频片段${cover || voice ? '' : '（改编时使用）'}<input type="file" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg" data-agent-field="file"></label><p class="helper" data-agent-file>${esc(s.file?.name || (s.assetId ? '沿用上一轮源音频' : voice ? '换声支持 10–40 秒片段；可用起点选择整首歌曲中的位置。' : '改编时请选择 10–60 秒的片段，最大 30 MB。制定计划时上传到应用，确认生成后发送给模型服务。'))}</p>
      ${voice ? `<label class="field-label">我的歌声参考录音<input type="file" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg" data-agent-field="referenceFile"></label><p class="helper" data-agent-reference>${esc(s.referenceFile?.name || (s.referenceId ? '沿用上一轮参考歌声' : '请上传自己 3–20 秒的清晰独唱，尽量没有伴奏和混响。'))}</p><p class="helper">先分离原唱与伴奏，再按参考音色转换歌声并混音。效果取决于录音和分离质量，原唱可能有残留。</p>` : ''}
      <div class="agent-controls">${voice ? `<label>原曲起点（秒）<input type="number" min="0" max="3600" value="${s.clipStart}" data-agent-field="clipStart"></label><label>人声音量（dB）<input type="number" min="-12" max="6" value="${s.vocalGain}" data-agent-field="vocalGain"></label>` : `<label>目标风格<select data-agent-field="style"><option value="">根据描述决定</option>${MusicCatalog.styles.map((style) => `<option value="${style.en}" ${s.style === style.en ? 'selected' : ''}>${style.name}</option>`).join('')}</select></label>`}<label>时长（秒）<input type="number" min="10" max="${voice ? 40 : 60}" step="1" value="${s.duration}" data-agent-field="duration"></label>${voice ? '<span>保留原曲旋律与歌词</span>' : `<label>随机种子<input type="number" min="0" max="2147483647" value="${s.seed}" data-agent-field="seed"></label><label><input type="checkbox" ${s.instrumental ? 'checked' : ''} data-agent-field="instrumental"> 纯音乐</label>`}</div>
      <div class="result-buttons"><button class="btn btn-primary" data-agent-action="plan" ${s.busy ? 'disabled' : ''}>${generationLabel(mode)}</button><button class="text-btn" data-agent-action="reset" ${s.busy ? 'disabled' : ''}>新建任务</button></div>
      </div><div class="agent-output" data-agent-output>${output(mode)}</div></div></section>`;
  }
  function output(mode) {
    const s = states[mode],
      p = s.plan?.brief,
      job = s.job;
    let html = s.error ? `<p class="agent-error" role="alert">${esc(s.error)}</p>` : '';
    if (!p)
      return (
        html +
        '<div class="agent-empty"><div class="art-empty-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="art-section-kicker" data-i18n-ignore>YOUR NEXT TRACK STARTS HERE</span><h3>你的音乐作品</h3><p class="helper">填写创意并开始生成，完成后在这里试听、下载和继续调整。</p></div>'
      );
    html += `<p class="agent-bound-engine" data-i18n-ignore>${esc(s.plan.engineName || '')}</p><h3 data-i18n-ignore>${esc(p.summary)}</h3><p><span>${p.task === 'voice_cover' ? '个人音色翻唱' : p.task === 'cover' ? '音频风格改编' : '文字创作'}</span> · ${p.duration} <span>秒</span> · <span>${p.instrumental ? '纯音乐' : '含人声'}</span>${p.bpm ? ' · ' + p.bpm + ' BPM' : ''}</p><p data-i18n-ignore>${esc(p.instruments.join('、'))}</p>`;
    for (const [label, entries] of [
      ['需要确认', p.questions],
      ['暂不支持', p.unsupported],
      ['说明', p.warnings],
    ])
      if (entries.length)
        html += `<p><strong>${label}</strong>：${entries.map(esc).join('；')}</p>`;
    if (!job && p.status === 'ready' && s.error)
      html += `<button class="btn btn-primary" data-agent-action="run" ${s.busy || !currentEngineReady(mode) ? 'disabled' : ''}>重试生成</button>`;
    if (job) {
      const labels = {
        queued: '排队中',
        running: '生成中',
        succeeded: '已完成',
        failed: '失败',
        cancelled: '已停止等待',
        interrupted: '任务被中断',
      };
      html += `<p role="status"><strong>${labels[job.status] || esc(job.status)}</strong> · <span>${esc(job.events?.at(-1)?.message || '')}</span></p>`;
      if (job.error) html += `<p class="agent-error">${esc(job.error)}</p>`;
      if (['queued', 'running'].includes(job.status))
        html += '<button class="btn btn-outline" data-agent-action="cancel">停止等待</button>';
      if (['failed', 'cancelled', 'interrupted'].includes(job.status))
        html += `<button class="btn btn-outline" data-agent-action="run" ${s.busy || !currentEngineReady(mode) ? 'disabled' : ''}>重新提交此计划</button>`;
      if (job.status === 'succeeded')
        html += `<p class="badge-small">真实模型输出 · ${esc(job.model)}</p><audio controls preload="metadata" src="${job.audioUrl}" aria-label="真实模型生成结果"></audio><a class="btn btn-outline" href="${job.audioUrl}" download="MusicCraft-${job.id}.${job.extension}">下载音频</a><label class="field-label">试听反馈<textarea class="textarea" data-agent-feedback placeholder="例如：吉他效果不错，但鼓太响，下一版希望降低鼓的存在感。">${esc(s.feedback || '')}</textarea></label><button class="btn btn-outline" data-agent-action="review" ${s.busy ? 'disabled' : ''}>请 Agent 整理反馈</button><p class="helper">上方输入修改要求，可沿用源素材继续生成新版本。</p>`;
    }
    if (s.review)
      html += `<div class="agent-review"><h3>试听反馈建议</h3><p class="helper" data-i18n-ignore>${esc(s.review.plannerName || '')} · ${esc(s.review.plannerModel || '')}</p><p>${esc(s.review.summary)}</p><p>${esc(s.review.suggested_revision)}</p><p class="helper">${esc(s.review.evidenceBoundary)}</p><button class="btn btn-outline" data-agent-action="use-review">按此建议生成新版本</button></div>`;
    if (job?.status === 'succeeded' && job.stems)
      html += `<details class="agent-stems"><summary>试听换声分轨</summary>${[
        ['source_clip', '原曲片段'],
        ['original_vocals', '分离出的原唱'],
        ['converted_vocals', '转换后的歌声'],
        ['accompaniment', '分离出的伴奏'],
      ]
        .filter(([key]) => job.stems[key])
        .map(
          ([key, label]) =>
            `<label class="field-label">${label}<audio controls preload="none" src="/api/jobs/${job.id}/audio/${key}"></audio></label>`,
        )
        .join('')}</details>`;
    return html;
  }
  function refresh(mode) {
    try {
      sessionStorage.setItem(
        'musiccraft-agent',
        JSON.stringify(
          Object.fromEntries(
            Object.entries(states).map(([key, s]) => [
              key,
              { ...s, file: null, referenceFile: null, busy: false },
            ]),
          ),
        ),
      );
    } catch {}
    const root = document.querySelector(`[data-agent-mode="${mode}"]`);
    if (!root) return;
    root.querySelector('[data-agent-output]').innerHTML = output(mode);
    const button = root.querySelector('[data-agent-action="plan"]');
    const active = ['queued', 'running'].includes(states[mode].job?.status);
    button.disabled =
      states[mode].busy || active || !currentPlannerReady(mode) || !currentEngineReady(mode);
    button.textContent = generationLabel(mode);
    root.querySelector('[data-agent-action="reset"]').disabled = states[mode].busy || active;
    root.querySelector('[data-agent-status]').textContent = serviceMessage(mode);
    const notes = root.querySelector('[data-engine-notes]');
    if (notes) notes.innerHTML = engineNotes(mode);
    root.querySelector('[data-agent-planner-status]').textContent = plannerMessage(mode);
    root.querySelectorAll('[data-agent-field]').forEach((node) => {
      node.disabled =
        states[mode].busy ||
        (['file', 'referenceFile', 'engineId', 'plannerId', 'instrumental'].includes(
          node.dataset.agentField,
        ) &&
          ['queued', 'running'].includes(states[mode].job?.status));
    });
    window.CoLocale?.apply(root);
  }
  async function startGeneration(mode) {
    const s = states[mode];
    s.job = await api('jobs', { planId: s.plan.id });
    const token = ++s.token;
    poll(mode, token).catch((error) => {
      s.error = '状态查询中断：' + error.message;
      refresh(mode);
    });
  }
  async function poll(mode, token) {
    const s = states[mode];
    while (s.token === token && ['queued', 'running'].includes(s.job?.status)) {
      await new Promise((done) => setTimeout(done, 1500));
      if (s.token !== token) return;
      const result = await api(`jobs/${s.job.id}`);
      if (s.token !== token) return;
      s.job = result;
      refresh(mode);
    }
  }
  document.addEventListener('input', (event) => {
    const root = event.target.closest('[data-agent-mode]');
    if (!root) return;
    if (event.target.hasAttribute('data-agent-feedback')) {
      states[root.dataset.agentMode].feedback = event.target.value;
      return;
    }
    const key = event.target.dataset.agentField;
    if (key === 'engineId' || key === 'plannerId') {
      const s = states[root.dataset.agentMode];
      s[key] = event.target.value;
      s.plan = null;
      s.job = null;
      s.review = null;
      s.healthNote = '';
      s.plannerHealthNote = '';
      s.error = '';
      s.token++;
      refresh(root.dataset.agentMode);
      return;
    }
    if (key && !['file', 'referenceFile'].includes(key))
      states[root.dataset.agentMode][key] =
        key === 'instrumental'
          ? event.target.checked
          : ['duration', 'seed', 'clipStart', 'vocalGain'].includes(key)
            ? Number(event.target.value)
            : event.target.value;
    if (key === 'instrumental') {
      const s = states[root.dataset.agentMode];
      const selected = service?.engines?.find((e) => e.id === s.engineId);
      if (!s.instrumental && selected && !selected.vocals) s.engineId = 'auto';
      s.plan = null;
      s.job = null;
      s.review = null;
      s.healthNote = '';
      s.plannerHealthNote = '';
      s.error = '';
      s.token++;
      root.querySelector('[data-agent-field="engineId"]').innerHTML = engineOptions(
        root.dataset.agentMode,
      );
      root.querySelector('[data-task-models]').innerHTML = taskModels(root.dataset.agentMode);
      refresh(root.dataset.agentMode);
    }
  });
  document.addEventListener('change', (event) => {
    const root = event.target.closest('[data-agent-mode]');
    if (!root) return;
    if (event.target.dataset.agentField === 'referenceFile') {
      const s = states[root.dataset.agentMode];
      s.referenceFile = event.target.files[0] || null;
      s.referenceId = null;
      s.plan = null;
      s.job = null;
      s.review = null;
      root.querySelector('[data-agent-reference]').textContent =
        s.referenceFile?.name || CoLocale.text('请选择参考歌声');
      refresh(root.dataset.agentMode);
      return;
    }
    if (event.target.dataset.agentField !== 'file') return;
    const s = states[root.dataset.agentMode];
    s.file = event.target.files[0] || null;
    s.assetId = null;
    s.plan = null;
    s.job = null;
    root.querySelector('[data-agent-file]').textContent = s.file?.name || '请选择源音频';
    refresh(root.dataset.agentMode);
    if (s.file && root.dataset.agentMode === 'create') {
      states.restyle.file = s.file;
      states.restyle.assetId = null;
      states.restyle.plan = null;
      states.restyle.job = null;
      states.restyle.review = null;
      if (!states.restyle.instruction) states.restyle.instruction = s.instruction;
      selectMode('restyle');
    }
  });
  document.addEventListener('click', async (event) => {
    const modeButton = event.target.closest('[data-agent-mode-switch]');
    if (modeButton) {
      selectMode(modeButton.dataset.agentModeSwitch);
      return;
    }
    const button = event.target.closest('[data-agent-action]'),
      root = button?.closest('[data-agent-mode]');
    if (!root) return;
    const mode = root.dataset.agentMode,
      s = states[mode],
      action = button.dataset.agentAction;
    const feedback = root.querySelector('[data-agent-feedback]')?.value || '';
    if (action === 'reset') {
      if (s.job && ['queued', 'running'].includes(s.job.status)) {
        s.error = '请先停止当前任务，再新建。';
        refresh(mode);
        return;
      }
      Object.assign(s, {
        instruction: '',
        feedback: '',
        healthNote: '',
        plannerHealthNote: '',
        file: null,
        referenceFile: null,
        referenceId: null,
        clipStart: 0,
        vocalGain: 0,
        assetId: null,
        plan: null,
        job: null,
        review: null,
        error: '',
        token: s.token + 1,
      });
      selectMode(mode);
      return;
    }
    if (s.busy && action !== 'cancel') return;
    s.error = '';
    if (
      ['plan', 'use-review', 'run'].includes(action) &&
      (!currentPlannerReady(mode) || !currentEngineReady(mode))
    ) {
      s.error = '创作服务尚未由项目管理员开通。';
      refresh(mode);
      return;
    }
    s.busy = true;
    refresh(mode);
    try {
      if (action === 'planner-health') {
        const health = await api(
          'health?kind=llm&plannerId=' + encodeURIComponent(s.plannerId || 'auto'),
        );
        s.plannerHealthNote = health.note;
      } else if (action === 'health') {
        service = await api('status');
        const health = await api(
          'health?kind=' +
            (mode === 'voice' ? 'voice' : 'music') +
            '&mode=' +
            mode +
            '&engineId=' +
            encodeURIComponent(s.engineId || 'auto'),
        );
        s.healthNote = health.note;
      } else if (action === 'plan' || action === 'use-review') {
        if (s.job && ['queued', 'running'].includes(s.job.status))
          throw Error('请先等待当前生成完成或停止等待，再制定下一版。');
        if (action === 'use-review') {
          s.instruction = s.review.suggested_revision;
          root.querySelector('[data-agent-field="instruction"]').value = s.instruction;
        }
        if (mode === 'voice' && !s.instruction.trim())
          s.instruction =
            'Use my reference singing voice, preserving source melody, lyrics and accompaniment.';
        if (!s.instruction.trim()) throw Error('请描述希望创作或修改的音乐。');
        if (['restyle', 'voice'].includes(mode) && !s.assetId) {
          if (!s.file) throw Error('请先选择用于改编的音频片段。');
          if (s.file.size > 30 * 1024 * 1024) throw Error('音频不能超过 30 MB。');
          s.assetId = (await api('assets', s.file, true)).id;
        }
        if (mode === 'voice' && !s.referenceId) {
          if (!s.referenceFile) throw Error('请上传自己的清晰歌声参考录音');
          if (s.referenceFile.size > 30 * 1024 * 1024) throw Error('音频不能超过 30 MB。');
          s.referenceId = (await api('assets', s.referenceFile, true)).id;
        }
        const result = await api('plans', {
          mode,
          engineId: s.engineId || 'auto',
          plannerId: s.plannerId || 'auto',
          language: CoLocale.language,
          referenceId: s.referenceId,
          clipStart: s.clipStart,
          vocalGain: s.vocalGain,
          instruction: s.instruction,
          style: s.style || '',
          controls: {
            duration: s.duration,
            seed: s.seed,
            instrumental: s.instrumental,
          },
          assetId: s.assetId,
          parentPlanId: s.plan?.id || null,
        });
        s.plan = result;
        s.job = null;
        s.review = null;
        s.token++;
        if (result.brief.status === 'ready') await startGeneration(mode);
      } else if (action === 'run') {
        await startGeneration(mode);
      } else if (action === 'cancel') {
        s.token++;
        s.job = await api(`jobs/${s.job.id}/cancel`, {});
      } else if (action === 'review') {
        if (!feedback.trim()) throw Error('请先试听并填写反馈。');
        s.review = await api(`jobs/${s.job.id}/review`, { feedback });
      }
    } catch (error) {
      s.error = error.message;
    } finally {
      s.busy = false;
      refresh(mode);
    }
  });
  function updateService() {
    return api('status')
      .then((value) => {
        service = value;
        for (const state of Object.values(states)) {
          state.healthNote = '';
          state.plannerHealthNote = '';
          if (state.engineId !== 'auto' && !service.engines.some((e) => e.id === state.engineId))
            state.engineId = 'auto';
          if (state.plannerId !== 'auto' && !service.planners.some((p) => p.id === state.plannerId))
            state.plannerId = 'auto';
        }
        document.querySelectorAll('[data-agent-mode]').forEach((root) => {
          const mode = root.dataset.agentMode;
          root.querySelector('[data-agent-field="engineId"]').innerHTML = engineOptions(mode);
          root.querySelector('[data-agent-field="plannerId"]').innerHTML = plannerOptions(mode);
          root.querySelector('[data-task-models]').innerHTML = taskModels(mode);
          root.querySelector('[data-planner-models]').innerHTML = plannerModels();
          refresh(mode);
        });
      })
      .catch(() => {});
  }
  updateService();
  window.addEventListener('musiccraft-connections-changed', updateService);
  document.addEventListener(
    'play',
    (event) => {
      if (!event.target.closest?.('[data-agent-output]')) return;
      audio.pause();
      if (studioPlaying) stopStudio();
      CoRemix.stop();
      document.querySelectorAll('[data-agent-output] audio').forEach((player) => {
        if (player !== event.target) player.pause();
      });
    },
    true,
  );
  window.addEventListener('musiccraft-language-changed', () => {
    const root = document.querySelector('[data-agent-mode]');
    if (root) root.outerHTML = panel(activeMode);
    refresh(activeMode);
  });
  for (const mode of ['create', 'restyle', 'voice'])
    if (['queued', 'running'].includes(states[mode].job?.status)) {
      poll(mode, states[mode].token).catch((error) => {
        states[mode].error = error.message;
        refresh(mode);
      });
    }
  return { panel, workspace: () => panel(activeMode), selectMode };
})();
