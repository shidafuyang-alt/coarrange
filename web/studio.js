'use strict';
window.CoStudio = (() => {
  const catalog = MusicCatalog.instruments,
    styles = MusicCatalog.styles;
  const find = (id) => catalog.find((i) => i.id === id);
  const state = {
    style: 'classical',
    parts: ['piano', 'strings', 'cello', 'harp'],
    pans: [-0.15, 0.25, -0.2, 0.15],
    melody: null,
    target: null,
    category: '全部',
    request: 0,
    preview: [],
  };
  let initializing;
  async function initialize() {
    if (state.melody) return;
    initializing ||= ensureScore().then(() => {
      state.melody = score.notes
        .filter((n) => n.track === 0 && n.pitch >= 65)
        .map((n) => ({ ...n }));
      studioNotes = CoScore.arrange(state.melody, state.style, state.parts);
    });
    await initializing;
  }
  function view() {
    const preset = styles.find((s) => s.id === state.style);
    return `<div class="view-title studio-header"><section><p class="eyebrow">BUILD YOUR OWN UNEXPECTED SOUND.</p><h1>编曲，放开玩。</h1><p>让二胡领唱，让贝斯蹦迪。换乐器、加声部，亲手听见反差。</p></section><div><label class="btn btn-outline midi-upload-label" for="midi-upload">${icon('upload')}导入 MIDI<input type="file" id="midi-upload" class="file-input" accept=".mid,.midi"></label><button class="btn btn-primary" data-action="export-midi">${icon('download')}导出 MIDI</button></div></div>
    <section class="instrument-intro"><div><span class="card-icon">${icon('music-2')}</span><div><h2>你的乐器架，今天想加谁？</h2><p>31 种音色 · 二胡真实采样 · 最多 8 个声部</p></div></div><button class="btn btn-primary" data-add-instrument ${state.parts.length >= 8 ? 'disabled' : ''}>${icon('plus')}添加乐器</button></section>
    <div class="studio-toolbar"><strong id="studio-name">${studioName}</strong><span class="spacer"></span><label>配器起点<select id="studio-preset" aria-label="选择编曲风格">${styles.map((s) => `<option value="${s.id}" ${s.id === state.style ? 'selected' : ''}>${s.name}</option>`).join('')}</select></label><label>速度 <input type="number" id="studio-bpm" aria-label="编曲速度 BPM" min="50" max="180" value="${bpm}"> BPM</label><label>移调 <select id="studio-key" aria-label="移调半音">${[-2, -1, 0, 1, 2].map((v) => `<option value="${v}" ${v === transpose ? 'selected' : ''}>${v === 0 ? '原调' : (v > 0 ? '＋' : '−') + Math.abs(v) + ' 半音'}</option>`).join('')}</select></label><button class="text-btn" data-action="reset-studio">重置</button></div>
    <div class="studio-layout"><section class="studio-main"><div class="bar-ruler"><span>声部 / 钢琴卷帘</span><div>${Array.from({ length: 8 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div></div>${state.parts
      .map((id, k) => {
        const ins = find(id);
        return `<div class="studio-track ${mutes[k] ? 'muted' : ''}" data-track="${k}"><div class="track-controls"><button class="instrument-name" data-change-instrument="${k}" title="更换乐器">${icon(ins.icon)}<span>${ins.name}</span>${icon('chevrons-up-down')}</button><div class="track-mix"><button class="mix-btn ${mutes[k] ? 'active' : ''}" data-mute="${k}" aria-label="静音${ins.name}" aria-pressed="${mutes[k]}">M</button><button class="mix-btn ${solos[k] ? 'active' : ''}" data-solo="${k}" aria-label="独奏${ins.name}" aria-pressed="${solos[k]}">S</button><input type="range" min="0" max="1" step=".01" value="${volumes[k]}" data-mix="${k}" aria-label="${ins.name}音量"><button class="track-remove" data-remove-part="${k}" aria-label="移除${ins.name}" ${state.parts.length <= 1 ? 'disabled' : ''}>${icon('x')}</button></div></div><div class="piano-roll" id="roll-${k}" aria-label="${ins.name}前八小节音符"></div></div>`;
      })
      .join(
        '',
      )}<div class="studio-bottom"><button class="btn btn-primary" data-action="studio-play" id="studio-play">${icon(studioPlaying ? 'pause' : 'play')}${studioPlaying ? '暂停编曲' : '播放编曲'}</button><span>M 静音 · S 独奏 · 滑杆调整音量</span><span id="studio-time">${time(studioPosition)}</span></div></section>
    <aside class="studio-side"><section class="panel studio-palette"><h3>试点不按常理的</h3><p>这些组合会真正改变音符、节奏和乐器。</p>${[
      'erhu',
      'circus',
      'chiptune',
      'rock',
      'folk',
      'jazz',
    ]
      .map((id) => {
        const s = styles.find((s) => s.id === id);
        return `<button class="suggestion ${id === state.style ? 'selected' : ''}" data-studio-preset="${id}">${icon(s.icon)}${s.name}</button>`;
      })
      .join(
        '',
      )}<div class="tip-box"><strong>一个小提示</strong><p>点击乐器名称就能替换音色。先按 S 单独听，再把其他乐器加回来。</p></div><button class="text-btn" data-action="soften">${icon('feather')}整体柔和一点</button></section></aside></div>
    <p class="studio-info">工作台可实时更换乐器、增删声部与导出 MIDI。这里是原创主题的可编辑配器；AI 试听版本与工作台演奏会有差别。</p>`;
  }
  async function preset(id) {
    await initialize();
    stop();
    const style = styles.find((s) => s.id === id) || styles[1];
    state.style = style.id;
    state.parts = [...style.parts];
    state.pans = state.parts.map((_, i) => ((i % 3) - 1) * 0.2);
    mutes = state.parts.map(() => false);
    solos = state.parts.map(() => false);
    volumes = state.parts.map((_, i) => (i === 0 ? 0.75 : 0.5));
    studioNotes = CoScore.arrange(state.melody, state.style, state.parts);
    studioName = '晴日来信 · ' + style.name;
    studioPosition = 0;
    bpm = 108;
    transpose = 0;
    render();
  }
  async function paint() {
    await initialize();
    const notes = studioNotes || [];
    state.parts.forEach((_, k) => {
      const el = document.querySelector(`#roll-${k}`);
      if (!el) return;
      const part = notes.filter((n) => n.track === k && n.time < (32 * 60) / 108 + 0.56);
      if (!part.length) {
        el.innerHTML = '';
        return;
      }
      const low = Math.min(...part.map((n) => n.pitch)),
        high = Math.max(...part.map((n) => n.pitch));
      el.innerHTML = part
        .map(
          (n) =>
            `<span class="note" style="left:${Math.max(0, ((n.time - 0.5556) / ((32 * 60) / 108)) * 100)}%;width:${Math.max(0.35, (n.duration / ((32 * 60) / 108)) * 100)}%;top:${8 + ((high - n.pitch) / Math.max(1, high - low)) * 65}%" title="MIDI ${n.pitch}"></span>`,
        )
        .join('');
    });
  }
  async function play() {
    await initialize();
    if (studioPlaying) return;
    audio.pause();
    updatePlayer();
    studioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    await studioContext.resume();
    const token = ++state.request;
    studioPlaying = true;
    const button = document.querySelector('#studio-play');
    if (button) {
      button.disabled = true;
      button.textContent = CoLocale.text('正在加载音色…');
    }
    try {
      await Promise.all([...new Set(state.parts)].map((id) => CoSampler.load(studioContext, id)));
      if (token !== state.request) return;
      state.preview.forEach((n) => {
        try {
          n.stop();
        } catch {}
      });
      state.preview = [];
      studioMaster = studioContext.createGain();
      studioMaster.gain.value = 0.34 * Number(document.querySelector('#volume').value);
      const compressor = studioContext.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.ratio.value = 6;
      studioMaster.connect(compressor);
      compressor.connect(studioContext.destination);
      studioGains = state.parts.map((_, i) => {
        const g = studioContext.createGain(),
          pan = studioContext.createStereoPanner();
        g.gain.value = volumes[i];
        pan.pan.value = state.pans[i] || 0;
        g.connect(pan);
        pan.connect(studioMaster);
        return g;
      });
      mix();
      const ratio = bpm / 108,
        base = studioContext.currentTime + 0.08;
      const end = Math.max(...studioNotes.map((n) => (n.time + n.duration) / ratio)) + 1;
      if (studioPosition >= end - 0.1) studioPosition = 0;
      studioStarted = base - studioPosition;
      const jobs = studioNotes.map(async (n) => {
        const start = n.time / ratio - studioPosition,
          dur = n.duration / ratio;
        if (start + dur < 0) return;
        const nodes = await CoSampler.schedule(
          studioContext,
          state.parts[n.track],
          state.parts[n.track] === 'drums'
            ? n.pitch
            : Math.min(108, Math.max(24, n.pitch + transpose)),
          base + Math.max(0, start),
          Math.max(0.03, dur + Math.min(0, start)),
          n.velocity / 127,
          studioGains[n.track],
        );
        studioNodes.push(...nodes);
      });
      await Promise.all(jobs);
      studioTimer = setInterval(() => {
        studioPosition = Math.max(0, studioContext.currentTime - studioStarted);
        const el = document.querySelector('#studio-time');
        if (el) el.textContent = time(studioPosition);
        if (studioPosition > end) {
          stop();
          studioPosition = 0;
        }
      }, 100);
      if (button) {
        button.disabled = false;
        button.innerHTML = icon('pause') + '暂停编曲';
      }
      icons();
    } catch (error) {
      stop();
      toast('音色加载失败，请重试。');
      throw error;
    }
  }
  function stop() {
    state.request++;
    if (studioPlaying && studioContext)
      studioPosition = Math.max(0, studioContext.currentTime - studioStarted);
    studioNodes.forEach((n) => {
      try {
        n.stop();
      } catch {}
    });
    studioNodes = [];
    studioMaster?.disconnect();
    clearInterval(studioTimer);
    studioPlaying = false;
    const b = document.querySelector('#studio-play');
    if (b) {
      b.disabled = false;
      b.innerHTML = icon('play') + '播放编曲';
      icons();
    }
  }
  function mix() {
    const solo = solos.some(Boolean);
    studioGains.forEach((g, i) =>
      g.gain.setTargetAtTime(
        mutes[i] || (solo && !solos[i]) ? 0 : (volumes[i] ?? 0.5),
        studioContext.currentTime,
        0.025,
      ),
    );
  }
  function mixUI() {
    state.parts.forEach((_, i) => {
      const row = document.querySelector(`[data-track="${i}"]`);
      if (!row) return;
      row.classList.toggle('muted', mutes[i]);
      for (const key of ['mute', 'solo']) {
        const b = row.querySelector(`[data-${key}]`),
          active = (key === 'mute' ? mutes : solos)[i];
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      }
      row.querySelector('[data-mix]').value = volumes[i];
    });
    mix();
  }
  async function restart() {
    const was = studioPlaying;
    stop();
    studioPosition = 0;
    if (was) await play();
  }
  async function audition(id) {
    studioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    await studioContext.resume();
    await CoSampler.load(studioContext, id);
    state.preview.forEach((n) => {
      try {
        n.stop();
      } catch {}
    });
    state.preview = [];
    const gain = studioContext.createGain();
    gain.gain.value = 0.3;
    gain.connect(studioContext.destination);
    for (const [i, p] of (id === 'drums' ? [36, 42, 38, 42] : [69, 72, 76]).entries())
      state.preview.push(
        ...(await CoSampler.schedule(
          studioContext,
          id,
          p,
          studioContext.currentTime + 0.05 + i * 0.3,
          0.35,
          0.7,
          gain,
        )),
      );
  }
  function chooser(target) {
    state.target = target;
    state.category = '全部';
    document.querySelector('#modal-root').innerHTML =
      `<div class="modal-overlay"><section class="modal instrument-modal" role="dialog" aria-modal="true" aria-label="乐器架"><div class="modal-head"><div><p class="eyebrow">A NEW VOICE IN YOUR ARRANGEMENT</p><h2>${target === 'add' ? '给编曲加一位新成员' : '换一种音色，听听看。'}</h2></div><button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x')}</button></div><label class="search instrument-search">${icon('search')}<input id="instrument-search" aria-label="搜索乐器" placeholder="搜索二胡、吉他、萨克斯…"></label><div class="instrument-categories">${['全部', ...new Set(catalog.map((i) => i.group))].map((g) => `<button class="suggestion ${g === '全部' ? 'active' : ''}" data-instrument-category="${g}">${g}</button>`).join('')}</div><div class="instrument-library">${catalog.map((i) => `<article class="instrument-option" data-instrument-id="${i.id}" data-instrument-group="${i.group}" data-search="${i.name} ${i.en.toLowerCase()}"><button class="instrument-choose" data-instrument-choice="${i.id}"><span class="instrument-symbol">${icon(i.icon)}</span><strong>${i.name}</strong><small>${i.id === 'erhu' ? '伯克利 BISA · 真实录音' : i.id === 'drums' ? '鼓组合成' : i.group}</small></button><button class="icon-btn" data-audition="${i.id}" aria-label="试听${i.name}">${icon('volume-2')}</button></article>`).join('')}</div><p class="helper">先点喇叭试听，再点乐器名称加入。二胡录音来自伯克利 BISA；通用音色使用 FluidR3 音源。<a href="assets/instrument-credits.html" target="_blank" rel="noopener">音源署名与授权</a></p></section></div>`;
    icons();
    document.querySelector('#instrument-search').focus();
  }
  function filter() {
    const query = document.querySelector('#instrument-search').value.toLowerCase();
    document
      .querySelectorAll('.instrument-option')
      .forEach(
        (el) =>
          (el.hidden =
            !(state.category === '全部' || el.dataset.instrumentGroup === state.category) ||
            !el.dataset.search.toLowerCase().includes(query)),
      );
  }
  async function choose(id) {
    await initialize();
    stop();
    const target = state.target;
    if (target === 'add') {
      if (state.parts.length >= 8) return;
      const index = state.parts.length;
      state.parts.push(id);
      state.pans.push(index % 2 ? 0.2 : -0.2);
      volumes.push(0.45);
      mutes.push(false);
      solos.push(false);
      studioNotes.push(...CoScore.additional(state.melody, index, id));
    } else {
      const wasDrum = state.parts[target] === 'drums';
      state.parts[target] = id;
      if (wasDrum !== (id === 'drums')) {
        studioNotes = studioNotes.filter((n) => n.track !== target);
        studioNotes.push(...CoScore.additional(state.melody, target, id));
      }
    }
    studioPosition = 0;
    document.querySelector('#modal-root').innerHTML = '';
    render();
    toast('已更新乐器，点播放听听变化。');
  }
  function remove(index) {
    stop();
    if (state.parts.length <= 1) return;
    state.parts.splice(index, 1);
    state.pans.splice(index, 1);
    mutes.splice(index, 1);
    solos.splice(index, 1);
    volumes.splice(index, 1);
    studioNotes = studioNotes
      .filter((n) => n.track !== index)
      .map((n) => ({ ...n, track: n.track > index ? n.track - 1 : n.track }));
    studioPosition = 0;
    render();
  }
  async function importMidi(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('请选择小于 2 MB 的旋律 MIDI');
      return;
    }
    try {
      await initialize();
      stop();
      state.melody = parseMidi(await file.arrayBuffer());
      studioNotes = CoScore.arrange(state.melody, state.style, state.parts);
      studioName = file.name.replace(/\.midi?$/i, '') + ' · 模板伴奏';
      studioPosition = 0;
      render();
      toast('已导入旋律，可继续更换乐器与风格。');
    } catch (e) {
      toast('无法读取：' + e.message);
    }
  }
  async function exportMidi() {
    await initialize();
    const chunks = [];
    state.parts.forEach((id, k) => {
      const channel = id === 'drums' ? 9 : k,
        ins = find(id),
        name = new TextEncoder().encode(ins.en + (id === 'erhu' ? ' (GM fiddle mapping)' : ''));
      const events = [
        { t: 0, m: [255, 3, ...vlq(name.length), ...name] },
        { t: 0, m: [0xc0 | channel, ins.program] },
      ];
      if (k === 0) {
        const tempo = Math.round((60 / bpm) * 1e6);
        events.push({
          t: 0,
          m: [255, 81, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255],
        });
      }
      if (!mutes[k] && (!solos.some(Boolean) || solos[k]))
        for (const n of studioNotes.filter((n) => n.track === k)) {
          const pitch = Math.max(0, Math.min(127, n.pitch + (id === 'drums' ? 0 : transpose)));
          events.push(
            {
              t: Math.round((n.time / (60 / 108)) * 480),
              m: [0x90 | channel, pitch, Math.max(1, Math.round(n.velocity * volumes[k]))],
            },
            {
              t: Math.round(((n.time + n.duration) / (60 / 108)) * 480),
              m: [0x80 | channel, pitch, 0],
            },
          );
        }
      events.sort((a, b) => a.t - b.t);
      let last = 0,
        data = [];
      for (const event of events) {
        data.push(...vlq(event.t - last), ...event.m);
        last = event.t;
      }
      data.push(0, 255, 47, 0);
      chunks.push(77, 84, 114, 107, ...intBytes(data.length, 4), ...data);
    });
    const bytes = new Uint8Array([
        77,
        84,
        104,
        100,
        0,
        0,
        0,
        6,
        0,
        1,
        0,
        state.parts.length,
        1,
        224,
        ...chunks,
      ]),
      url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
    download(url, 'CoArrange-' + state.style + '.mid');
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('已导出当前乐器、音符与速度。');
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.hasAttribute('data-add-instrument')) chooser('add');
      if (b.dataset.changeInstrument !== undefined) chooser(+b.dataset.changeInstrument);
      if (b.dataset.instrumentCategory) {
        state.category = b.dataset.instrumentCategory;
        document
          .querySelectorAll('[data-instrument-category]')
          .forEach((x) => x.classList.toggle('active', x === b));
        filter();
      }
      if (b.dataset.audition) await audition(b.dataset.audition);
      if (b.dataset.instrumentChoice) await choose(b.dataset.instrumentChoice);
      if (b.dataset.removePart !== undefined) remove(+b.dataset.removePart);
      if (b.dataset.studioPreset) await preset(b.dataset.studioPreset);
      if (b.dataset.openStudioPreset) {
        await preset(b.dataset.openStudioPreset);
        setView('arrange');
      }
    } catch (error) {
      toast('音色加载失败，请重试。');
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'instrument-search') filter();
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'studio-preset') preset(e.target.value);
  });
  return {
    view,
    paint,
    play,
    stop,
    mix,
    mixUI,
    restart,
    exportMidi,
    importMidi,
    preset,
    reset: () => preset('classical'),
    focus: () => {
      volumes = state.parts.map((_, i) => (i === 0 ? 0.9 : 0.25));
      mixUI();
    },
    get parts() {
      return state.parts;
    },
  };
})();
