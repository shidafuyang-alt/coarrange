'use strict';
const $ = (q, root = document) => root.querySelector(q),
  $$ = (q, root = document) => [...root.querySelectorAll(q)];
const icon = (n) => `<i data-lucide="${n}"></i>`;
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const tracks = {
  pop: {
    title: '晴日来信',
    subtitle: '原创旋律 · 流行编配',
    style: '流行 / Synth-pop',
    cover: 'assets/cover-pop.png',
    src: 'assets/pop.m4a',
    midi: 'assets/pop.mid',
  },
  classical: {
    title: '晴日来信 · 室内乐版',
    subtitle: '同一段旋律 · 钢琴与弦乐',
    style: '古典 / Chamber',
    cover: 'assets/cover-classical.png',
    src: 'assets/classical.m4a',
    midi: 'assets/classical.mid',
  },
  soft: {
    title: '晴日来信 · 轻柔版',
    subtitle: '修订版本 · 更轻的弦乐',
    style: '古典 / Soft chamber',
    cover: 'assets/cover-classical.png',
    src: 'assets/classical-soft.m4a',
    midi: 'assets/classical-soft.mid',
  },
};
for (const s of MusicCatalog.styles) {
  if (!tracks[s.id])
    tracks[s.id] = {
      title: '晴日来信 · ' + s.name,
      subtitle: '原创主题 · AI 风格改编',
      style: s.name + ' / ' + s.en,
      cover: s.group === '反差实验室' ? 'assets/cover-pop.png' : 'assets/cover-classical.png',
      src: 'assets/theme-' + s.id + '.m4a',
      duration: '0:38',
      theme: true,
    };
}
Object.assign(tracks, {
  'song-original': {
    title: 'hate that i made you love me · 原曲',
    subtitle: '用户提供的 MP3 · 0:47–1:07 片段',
    style: 'Pop / Source excerpt',
    cover: 'assets/cover-pop.png',
    src: 'assets/song-original.m4a',
    duration: '0:20',
    caseStudy: true,
  },
  'song-classical': {
    title: 'hate that i made you love me · 古典改编',
    subtitle: '真实 AI 改编 · 古典再创作',
    style: 'Classical / AI cover',
    cover: 'assets/cover-classical.png',
    src: 'assets/song-classical.m4a',
    duration: '0:20',
    caseStudy: true,
  },
  'song-alternative': {
    title: 'hate that i made you love me · 另一版改编',
    subtitle: '真实 AI 改编 · 另一种演绎',
    style: 'Classical / Alternative',
    cover: 'assets/cover-classical.png',
    src: 'assets/song-alternative.m4a',
    duration: '0:20',
    caseStudy: true,
  },
});
let view = 'home',
  current = 'song-classical',
  chosenStyle = 'classical',
  customAudio = null,
  customFilename = '',
  score = null,
  studioNotes = null,
  studioName = '晴日来信 · 室内乐编配',
  studioPlaying = false,
  studioPosition = 0,
  studioStarted = 0,
  studioTimer = null,
  studioContext = null,
  studioMaster = null,
  studioNodes = [],
  studioGains = [],
  bpm = 108,
  transpose = 0,
  mutes = [false, false, false, false],
  solos = [false, false, false, false],
  volumes = [0.75, 0.6, 0.65, 0.5],
  revisionReady = false;
let favorites = [];
try {
  favorites = JSON.parse(localStorage.getItem('coarrange-favorites') || '[]');
} catch {}
const audio = new Audio(tracks[current].src);
audio.preload = 'metadata';
audio.volume = 0.7;
const main = $('#main');
function icons() {
  if (window.lucide) lucide.createIcons();
  window.CoLocale?.apply();
}
function toast(message) {
  $('#toast').textContent = window.CoLocale ? CoLocale.text(message) : message;
  $('#toast').classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => $('#toast').classList.remove('show'), 3400);
}
function time(t) {
  if (!Number.isFinite(t)) return '0:00';
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}
function setView(next) {
  if (view === 'hum' && next !== 'hum') window.HumToMusic?.leave();
  if (studioPlaying) stopStudio();
  view = next;
  location.hash = next;
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function render() {
  const titles = {
    home: '你的音乐工作室',
    create: '灵感创作',
    transform: '风格转换',
    arrange: '编曲工作台',
    hum: '哼唱成曲',
    library: '我的作品库',
    favorites: '我的收藏',
  };
  $('#breadcrumb').textContent = titles[view] || titles.home;
  $$('[data-view]').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === view && b.classList.contains('nav-item')),
  );
  main.innerHTML = (
    {
      home: homeView,
      create: createView,
      transform: transformView,
      arrange: arrangeView,
      hum: () => window.HumToMusic.view(),
      library: libraryView,
      favorites: libraryView,
    }[view] || homeView
  )();
  icons();
  if (view === 'arrange') paintNotes();
  if (view === 'hum') window.HumToMusic?.sync();
  updatePlayer();
}
function trackCard(key) {
  const t = tracks[key];
  return `<div class="compare-track"><div class="cover-wrap"><img src="${t.cover}" alt="${key === 'pop' ? '银色流动雕塑' : '光影中的三角钢琴'}"><button class="cover-play" data-play="${key}" aria-label="试听${t.title}">${icon('play')}</button></div><div class="track-info"><h3>${t.title}</h3><p>${key === 'pop' ? '轻快节奏，合成器与电子鼓' : '保留旋律，换上钢琴与弦乐'}</p><div class="tag-row"><span class="tag ${key === 'pop' ? 'rose' : ''}">${key === 'pop' ? '原始编配' : '风格改编'}</span><span class="tag">${key === 'pop' ? '流行' : '室内古典'}</span><span class="tag">0:38</span></div></div></div>`;
}
function homeView() {
  return `<div class="greeting"><div><p class="eyebrow">A LITTLE IDEA. A WHOLE NEW SOUND.</p><h1>今天，想听见什么灵感？</h1></div><span>你的音乐，不必从专业开始。</span></div><section class="hero"><div class="hero-copy"><p class="eyebrow">SAME TUNE. WILDLY DIFFERENT.</p><h2>熟悉的旋律，<br>听点<span>不一样。</span></h2><p>摇滚、民谣、爵士，或让二胡和迪斯科碰个面。<br>一首原创主题，十三种打开方式。</p><div class="hero-actions"><button class="btn btn-primary" data-play="erhu">${icon('play')}听二胡蹦迪</button><button class="btn btn-light" data-view="arrange">${icon('sliders-horizontal')}自己配一版</button></div></div><div class="hero-art genre-hero-art" aria-hidden="true"><div class="hero-record">${icon('audio-lines')}</div><span class="hero-instrument erhu-badge">${icon('disc-3')}ERHU × DISCO</span><span class="hero-instrument rock-badge">${icon('guitar')}A LITTLE ROCK</span><span class="hero-instrument chip-badge">${icon('gamepad-2')}8-BIT ADVENTURE</span></div></section>${themePlayground()}${songCaseStudy()}<div class="section-head"><h2>从这里，开始你的创作</h2><span>选一种方式，剩下的慢慢来。</span></div><div class="creation-grid"><button class="creation-card" data-view="create"><span class="card-icon">${icon('sparkles')}</span><h3>把想法变成音乐</h3><p>说说心情，找一个喜欢的声音。</p>${icon('chevron-right').replace('<i ', '<i class="card-chev" ')}</button><button class="creation-card" data-view="transform"><span class="card-icon rose">${icon('shuffle')}</span><h3>给音乐换种风格</h3><p>保留熟悉的旋律，听见新的可能。</p>${icon('chevron-right').replace('<i ', '<i class="card-chev" ')}</button><button class="creation-card" data-view="arrange"><span class="card-icon blue">${icon('sliders-horizontal')}</span><h3>亲手调整编曲</h3><p>让鼓轻一点，或让钢琴多一点。</p>${icon('chevron-right').replace('<i ', '<i class="card-chev" ')}</button></div>`;
}
function styleChoices() {
  return musicStyleChoices();
}
function emptyResult() {
  return `<div class="result-empty">${icon('audio-lines')}<h3>你的灵感，会在这里响起</h3><p>先选一个方向，预览编曲计划与示例。</p></div>`;
}
function createView() {
  return `<div class="view-title"><p class="eyebrow">FROM A THOUGHT TO A MELODY</p><h1>先说说，你想听见什么。</h1><p>不用专业词汇。一种心情、一个画面，都可以是开始。</p></div><div class="workspace-grid"><section class="panel"><div class="panel-title">${icon('sparkles')}你的音乐灵感</div><label class="field-label" for="prompt">描述一个想法（可选）</label><textarea id="prompt" class="textarea" placeholder="比如：午后的阳光洒进房间，一首温柔的钢琴曲，带一点弦乐，适合安静地发呆。"></textarea><div class="suggestions">${['下班路上，轻快一点', '雨天的钢琴和弦乐', '像夏天一样的流行音乐'].map((t) => `<button class="suggestion" data-prompt="${t}">${t}</button>`).join('')}</div><span class="field-label">选择声音方向</span>${styleChoices()}<button class="btn btn-primary full" data-action="preview-plan">${icon('sparkles')}试听这个方向</button><p class="helper">${icon('info')}文字用于记录方向，试听为已准备的风格样例。</p></section><section class="panel" id="result-panel">${emptyResult()}</section></div>`;
}
function transformView() {
  return `<div class="view-title"><p class="eyebrow">FAMILIAR MELODY. A DIFFERENT WORLD.</p><h1>熟悉的旋律，换一种心情。</h1><p>先比较你选的歌曲，再探索自己的音乐想法。</p></div>${songCaseStudy()}<div class="section-head"><div><h2>继续探索上传与编曲</h2><p>下方使用另一首原创示例；上传文件仅本地试听。</p></div></div><div class="workspace-grid"><section class="panel"><div class="panel-title">${icon('disc-3')}选择你的音乐</div><label class="dropzone" id="audio-drop" for="audio-upload">${icon('upload-cloud')}<strong>点击或拖入一段音频</strong><p>MP3、WAV、M4A · 最大 30 MB · 仅在浏览器本地读取</p><input class="file-input" id="audio-upload" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg"></label><div class="source-pill"><img src="assets/cover-pop.png" alt="音乐封面"><div><strong id="source-name">${customFilename ? '<span data-i18n-ignore>' + escapeHTML(customFilename) + '</span>' : '晴日来信 · 流行原版'}</strong><span id="source-desc">${customFilename ? '已上传 · 可本地试听' : '已为你准备 · 0:38 · 原创演示素材'}</span></div><button class="icon-btn" aria-label="试听源音频" data-action="play-source">${icon('play')}</button></div><span class="field-label">你想把它变成什么风格？</span>${styleChoices()}<div class="toggle-row"><span>保留主旋律 <small class="badge-small">示例已保留</small></span><span class="locked-label">${icon('lock-keyhole')} 固定示例</span></div><button class="btn btn-primary full" data-action="preview-transform">${icon('shuffle')}${customFilename ? '试听本站改编示例' : '预览流行转古典'}</button><p class="helper">${icon('info')}${customFilename ? '你上传的音频可试听；本版不改编上传文件，结果仍为「晴日来信」的预制示例。' : '示例保留同一旋律，分别编配与渲染。实时风格转换将在模型接入后提供。'}</p>${customFilename ? '<button class="text-btn" data-action="reset-source">恢复内置示例</button>' : ''}</section><section class="panel" id="result-panel">${emptyResult()}</section></div>`;
}
function showResult(key, kind) {
  musicStyleResult(key, kind);
}
function libraryView() {
  const all =
    view === 'favorites'
      ? Object.keys(tracks).filter((k) => favorites.includes(k))
      : Object.keys(tracks);
  return `<div class="view-title"><p class="eyebrow">YOUR LITTLE COLLECTION OF SOUNDS</p><h1>${view === 'favorites' ? '喜欢的声音，留在这里。' : '每个版本，都值得听见。'}</h1><p>${view === 'favorites' ? '点击播放器或列表中的爱心，把喜欢的版本收藏起来。' : '真实改编与原创示例都在这里。播放、比较，或者带走它。'}</p></div><div class="library-toolbar"><label class="search">${icon('search')}<input id="library-search" aria-label="搜索作品" placeholder="搜索作品、风格…"></label><span class="count">${all.length} 个版本 · 保存在此浏览器</span></div><div class="track-list" id="track-list">${all.length ? all.map(trackRow).join('') : '<div class="empty-library">还没有收藏。去试听一首喜欢的音乐吧。</div>'}</div><p class="compare-note">${icon('info')}包含用户提供的歌曲片段、真实 AI 改编与原创程序编配示例。封面为 AI 图像。</p>`;
}
function trackRow(key) {
  const t = tracks[key];
  return `<div class="track-row" data-search="${t.title.toLowerCase()} ${t.style.toLowerCase()}"><img src="${t.cover}" alt="${t.title}封面"><div><h3>${t.title}</h3><p>${t.subtitle}</p></div><span>${t.style}</span><span>${t.duration || '0:38'}</span><button class="icon-btn" data-play="${key}" aria-label="播放${t.title}">${icon('play')}</button><button class="icon-btn favorite-btn ${favorites.includes(key) ? 'is-active' : ''}" data-fav="${key}" aria-label="${favorites.includes(key) ? '取消收藏' : '收藏'}${t.title}">${icon('heart')}</button></div>`;
}
function arrangeView() {
  return CoStudio.view();
}
async function ensureScore() {
  if (!score) score = await (await fetch('assets/score.json')).json();
  return score;
}
async function paintNotes() {
  await CoStudio.paint();
}
function updatePlayer() {
  const t =
    current === 'source'
      ? { ...tracks.pop, title: customFilename, subtitle: '上传文件 · 仅本地试听' }
      : tracks[current] || tracks.pop;
  $('#player-cover').src = t.cover;
  $('#player-title').toggleAttribute('data-i18n-ignore', current === 'source');
  $('#player-title').textContent = t.title;
  $('#player-subtitle').textContent = t.subtitle;
  $('#main-play').innerHTML = icon(audio.paused ? 'play' : 'pause');
  $('#main-play').setAttribute('aria-label', audio.paused ? '播放' : '暂停');
  $('.now-playing .favorite-btn').classList.toggle('is-active', favorites.includes(current));
  $('#loop-button').classList.toggle('is-active', audio.loop);
  $('#loop-button').setAttribute('aria-pressed', String(audio.loop));
  $('#audio-label').textContent =
    current === 'source'
      ? '本地上传音频'
      : tracks[current]?.caseStudy
        ? '真实歌曲改编案例'
        : tracks[current]?.theme
          ? '原创主题 · AI 改编'
          : '原创编配示例';
  updateSongCase();
  icons();
}
async function playTrack(key) {
  if (studioPlaying) stopStudio();
  if (key === 'source' && customAudio) {
    if (current !== 'source') {
      audio.src = customAudio;
      current = 'source';
    }
    $('#player-title').textContent = customFilename;
    $('#player-subtitle').textContent = '上传文件 · 仅本地试听';
    $('#audio-label').textContent = '本地上传音频';
  } else {
    if (!tracks[key]) return;
    if (current !== key) {
      current = key;
      audio.src = tracks[key].src;
    }
    $('#audio-label').textContent = tracks[key].caseStudy
      ? '真实歌曲改编案例'
      : tracks[key].theme
        ? '原创主题 · AI 改编'
        : '原创编配示例';
    updatePlayer();
  }
  try {
    await audio.play();
    $('#main-play').innerHTML = icon('pause');
    $('#main-play').setAttribute('aria-label', '暂停');
    icons();
  } catch {
    toast('音频暂时无法播放，请稍后重试。');
  }
}
function saveFavorite(key) {
  if (!tracks[key]) return;
  favorites = favorites.includes(key) ? favorites.filter((k) => k !== key) : [...favorites, key];
  try {
    localStorage.setItem('coarrange-favorites', JSON.stringify(favorites));
  } catch {}
  if (view === 'favorites' || view === 'library') render();
  updatePlayer();
  toast(favorites.includes(key) ? '已加入收藏' : '已取消收藏');
}
function download(path, name) {
  const a = document.createElement('a');
  a.href = path;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}
function showModal(type) {
  if (type === 'settings' && window.openPreferences) {
    openPreferences();
    return;
  }
  let title, body;
  if (type === 'settings') {
    title = '让这里，更像你的空间';
    body = `<p>当前版本无需账号，收藏保存在此浏览器。</p><div class="toggle-row"><span>循环播放</span><button class="toggle" role="switch" aria-label="循环播放" aria-checked="${audio.loop}" data-action="switch-loop"></button></div><div class="help-step">${icon('plug-zap')}<div><strong>模型接入 · 后续配置</strong><p>初版不发送生成请求，也不收集 API 密钥。音乐样例已准备好，可以直接试听。</p></div></div><div class="help-step">${icon('palette')}<div><strong>柔雾配色</strong><p>紫灰用于主要操作，粉灰用于柔和调整，深色文字保持清晰。</p></div></div>`;
  } else if (type === 'compare') {
    title = '同一旋律，切换着听';
    body = `<p>切换版本会尽量保留播放位置，方便比较编曲差异。</p>${Object.keys(tracks)
      .map(
        (k) =>
          `<div class="help-step"><img src="${tracks[k].cover}" alt="" style="width:44px;height:44px;border-radius:7px"><div style="flex:1"><strong>${tracks[k].title}</strong><p>${tracks[k].subtitle}</p></div><button class="icon-btn" data-compare="${k}" aria-label="切换到${tracks[k].title}">${icon('play')}</button></div>`,
      )
      .join('')}`;
  } else {
    title = '从喜欢的声音开始';
    body = `<p>CoArrange 是一个面向音乐初学者的创作工作台。先试听，再选择一种方式开始。</p><div class="help-step">${icon('sparkles')}<div><strong>灵感创作</strong><p>用日常语言描述想法，查看编曲计划和对应的固定试听样例。</p></div></div><div class="help-step">${icon('shuffle')}<div><strong>风格转换</strong><p>比较流行与古典编配；上传文件可本地试听，尚不支持实时改编。</p></div></div><div class="help-step">${icon('sliders-horizontal')}<div><strong>编曲工作台</strong><p>真实调整声部音量、速度与移调，导入旋律 MIDI，再导出你的编曲。</p></div></div><p style="margin-top:16px">新增歌曲案例由本地 ACE-Step 模型预先生成。其他试听为原创程序编配示例。网站尚未接入实时生成或 LLM API。</p>`;
  }
  $('#modal-root').innerHTML =
    `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x')}</button></div>${body}<button class="btn btn-primary" data-action="close-modal">${type === 'compare' ? '继续听音乐' : '知道了，开始探索'}</button></section></div>`;
  icons();
  $('.modal [data-action="close-modal"]').focus();
}
async function startStudio() {
  await CoStudio.play();
}
function stopStudio() {
  CoStudio.stop();
}
function updateMix() {
  CoStudio.mix();
}
async function restartStudio() {
  await CoStudio.restart();
}
function applyMixUI() {
  CoStudio.mixUI();
}
function vlq(n) {
  const a = [n & 127];
  while ((n >>= 7)) a.unshift((n & 127) | 128);
  return a;
}
async function exportMidi() {
  await CoStudio.exportMidi();
}
function intBytes(v, n) {
  return Array.from({ length: n }, (_, i) => (v >> (8 * (n - i - 1))) & 255);
}
function parseMidi(buffer) {
  const v = new DataView(buffer);
  let pos = 0;
  function u8() {
    if (pos >= v.byteLength) throw Error('文件不完整');
    return v.getUint8(pos++);
  }
  function u16() {
    return (u8() << 8) | u8();
  }
  function u32() {
    return (u8() << 24) | (u8() << 16) | (u8() << 8) | u8();
  }
  function str(n) {
    return String.fromCharCode(...Array.from({ length: n }, u8));
  }
  function variable() {
    let n = 0,
      b,
      count = 0;
    do {
      b = u8();
      n = (n << 7) | (b & 127);
      if (++count > 4) throw Error('MIDI 格式错误');
    } while (b & 128);
    return n;
  }
  if (str(4) !== 'MThd') throw Error('请选择标准 MIDI 文件');
  const len = u32(),
    format = u16(),
    count = u16(),
    division = u16();
  if (division & 32768 || format > 1) throw Error('暂支持 PPQ 格式的 Type 0/1 MIDI');
  pos += len - 6;
  let tempo = 500000,
    raw = [],
    tempos = [];
  for (let k = 0; k < count; k++) {
    if (str(4) !== 'MTrk') throw Error('MIDI 轨道格式错误');
    const chunkLength = u32(),
      end = pos + chunkLength;
    let tick = 0,
      running = 0,
      active = new Map();
    while (pos < end) {
      tick += variable();
      let status = u8();
      if (status < 128) {
        pos--;
        status = running;
      } else if (status < 240) running = status;
      if (status === 255) {
        const type = u8(),
          n = variable();
        if (type === 81 && n === 3) {
          const value = (u8() << 16) | (u8() << 8) | u8();
          tempos.push({ tick, tempo: value });
          if (tick === 0) tempo = value;
        } else pos += n;
        if (type === 47) {
          pos = end;
          break;
        }
      } else if (status === 240 || status === 247) pos += variable();
      else {
        const type = status >> 4,
          ch = status & 15,
          a = u8(),
          b = type === 12 || type === 13 ? 0 : u8();
        const id = ch * 128 + a;
        if (ch === 9) continue;
        if (type === 9 && b > 0) active.set(id, { tick, pitch: a, velocity: b });
        if (type === 8 || (type === 9 && b === 0)) {
          const n = active.get(id);
          if (n) {
            raw.push({ ...n, end: tick });
            active.delete(id);
          }
        }
      }
    }
    pos = end;
  }
  if (!raw.length) throw Error('没有找到可播放的旋律音符');
  tempos.sort((a, b) => a.tick - b.tick);
  function secs(tick) {
    let last = 0,
      seconds = 0,
      t = 500000;
    for (const e of tempos) {
      if (e.tick > tick) break;
      seconds += ((e.tick - last) * t) / 1e6 / division;
      last = e.tick;
      t = e.tempo;
    }
    return seconds + ((tick - last) * t) / 1e6 / division;
  }
  const highestTrack = raw.sort((a, b) => a.tick - b.tick || b.pitch - a.pitch);
  return highestTrack.slice(0, 2000).map((n) => ({
    track: 0,
    pitch: n.pitch,
    velocity: n.velocity,
    time: secs(n.tick) + 0.5556,
    duration: Math.max(0.05, secs(n.end) - secs(n.tick)),
  }));
}
function accompany(notes) {
  const chroma = new Array(12).fill(0);
  notes.forEach((n) => (chroma[n.pitch % 12] += n.duration));
  let key = 0,
    best = -Infinity;
  const major = [0, 2, 4, 5, 7, 9, 11];
  for (let k = 0; k < 12; k++) {
    const s = chroma.reduce((a, v, p) => a + v * (major.includes((p - k + 12) % 12) ? 1 : -1.5), 0);
    if (s > best) {
      best = s;
      key = k;
    }
  }
  const beat = 60 / 108,
    end = Math.min(65, Math.max(...notes.map((n) => (n.time + n.duration) / beat)));
  const result = [...notes.filter((n) => n.time < end * beat)];
  const triads = [
    [0, 4, 7],
    [9, 12, 16],
    [5, 9, 12],
    [7, 11, 14],
  ];
  for (let b = 0; b < Math.ceil(end / 4); b++) {
    const c = triads[b % 4].map((p) => 48 + key + p);
    for (const p of c)
      result.push({
        track: 1,
        pitch: p,
        velocity: 48,
        time: (b * 4 + 1) * beat,
        duration: 3.7 * beat,
      });
    for (let i = 0; i < 2; i++)
      result.push({
        track: 2,
        pitch: c[0] - 12,
        velocity: 62,
        time: (b * 4 + 1 + i * 2) * beat,
        duration: 1.8 * beat,
      });
    for (let i = 0; i < 8; i++)
      result.push({
        track: 3,
        pitch: c[i % 3] + 12,
        velocity: 45,
        time: (b * 4 + 1 + i * 0.5) * beat,
        duration: 0.4 * beat,
      });
  }
  return result;
}
async function handleMidi(file) {
  await CoStudio.importMidi(file);
}
function handleAudio(file) {
  if (!file) return;
  if (file.size > 30 * 1024 * 1024) {
    toast('请选择小于 30 MB 的音频文件');
    return;
  }
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name)) {
    toast('请选择 MP3、WAV 或 M4A 音频');
    return;
  }
  if (customAudio) URL.revokeObjectURL(customAudio);
  customAudio = URL.createObjectURL(file);
  customFilename = file.name;
  render();
  toast('已在本地载入音频；本版可试听，尚不执行实时改编。');
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button,[data-view]');
  if (!b) return;
  if (b.dataset.view) {
    setView(b.dataset.view);
    return;
  }
  if (b.dataset.play) {
    playTrack(b.dataset.play);
    return;
  }
  if (b.dataset.compare) {
    if (current === b.dataset.compare) {
      playTrack(current);
      return;
    }
    const at = audio.currentTime;
    current = b.dataset.compare;
    audio.src = tracks[current].src;
    audio.addEventListener(
      'loadedmetadata',
      () => {
        audio.currentTime = Math.min(at, audio.duration || 0);
      },
      { once: true },
    );
    playTrack(current);
    return;
  }
  if (b.dataset.fav) {
    saveFavorite(b.dataset.fav);
    return;
  }
  if (b.dataset.style) {
    chosenStyle = b.dataset.style;
    $$('[data-style]').forEach((x) => {
      x.classList.toggle('selected', x.dataset.style === chosenStyle);
      x.setAttribute('aria-pressed', String(x.dataset.style === chosenStyle));
    });
    return;
  }
  if (b.dataset.prompt) {
    $('#prompt').value = CoLocale.text(b.dataset.prompt);
    if (b.dataset.prompt.includes('流行')) chosenStyle = 'pop';
    else chosenStyle = 'classical';
    $$('[data-style]').forEach((x) => {
      x.classList.toggle('selected', x.dataset.style === chosenStyle);
      x.setAttribute('aria-pressed', String(x.dataset.style === chosenStyle));
    });
    return;
  }
  if (b.dataset.mute !== undefined) {
    const i = +b.dataset.mute;
    mutes[i] = !mutes[i];
    applyMixUI();
    return;
  }
  if (b.dataset.solo !== undefined) {
    const i = +b.dataset.solo;
    solos[i] = !solos[i];
    applyMixUI();
    return;
  }
  switch (b.dataset.action) {
    case 'toggle':
      if (studioPlaying) stopStudio();
      if (audio.paused) playTrack(current);
      else audio.pause();
      break;
    case 'next':
    case 'previous': {
      const keys = Object.keys(tracks),
        idx = keys.indexOf(current);
      playTrack(keys[(idx + (b.dataset.action === 'next' ? 1 : keys.length - 1)) % keys.length]);
      break;
    }
    case 'favorite':
      saveFavorite(current);
      break;
    case 'loop':
      audio.loop = !audio.loop;
      updatePlayer();
      break;
    case 'download':
      if (current === 'source') download(customAudio, customFilename);
      else download(tracks[current].src, tracks[current].title + '.m4a');
      break;
    case 'help':
    case 'settings':
    case 'compare':
      showModal(b.dataset.action);
      break;
    case 'close-modal':
      $('#modal-root').innerHTML = '';
      break;
    case 'switch':
      b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true'));
      break;
    case 'switch-loop':
      audio.loop = !audio.loop;
      b.setAttribute('aria-checked', String(audio.loop));
      updatePlayer();
      break;
    case 'preview-plan': {
      const prompt = $('#prompt').value.trim();
      showResult(chosenStyle, 'create');
      if (prompt)
        $('#user-plan').innerHTML =
          '<span>你的方向：</span><span data-i18n-ignore>' +
          escapeHTML(prompt) +
          '</span><span>。试听使用本站对应风格的固定示例。</span>';
      icons();
      break;
    }
    case 'preview-transform':
      showResult(chosenStyle, 'transform');
      break;
    case 'play-source':
      playTrack(customAudio ? 'source' : 'pop');
      break;
    case 'reset-source':
      if (current === 'source') {
        audio.pause();
        current = 'pop';
        audio.src = tracks.pop.src;
      }
      if (customAudio) URL.revokeObjectURL(customAudio);
      customAudio = null;
      customFilename = '';
      render();
      break;
    case 'soft-revision':
      revisionReady = true;
      playTrack('soft');
      toast('正在试听已渲染的轻柔版：弦乐更轻，钢琴更突出。');
      $$('.version-chip').forEach((x) => x.classList.toggle('active', x.dataset.play === 'soft'));
      break;
    case 'studio-play':
      if (studioPlaying) stopStudio();
      else
        try {
          await startStudio();
        } catch {
          toast('编曲播放暂时不可用，请重试。');
        }
      break;
    case 'export-midi':
      exportMidi();
      break;
    case 'reset-studio':
      await CoStudio.reset();
      break;
    case 'piano-focus':
      CoStudio.focus();
      toast('已突出钢琴，降低其他声部音量。');
      break;
    case 'soften':
      volumes = volumes.map((v) => v * 0.75);
      applyMixUI();
      toast('已降低各声部音量。');
      break;
    case 'slow-down':
      bpm = Math.max(50, bpm - 12);
      $('#studio-bpm').value = bpm;
      restartStudio();
      toast('速度已调整为 ' + bpm + ' BPM。');
      break;
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'library-search') {
    const q = e.target.value.toLowerCase();
    $$('.track-row').forEach(
      (r) => (r.hidden = !(r.dataset.search + ' ' + r.textContent.toLowerCase()).includes(q)),
    );
  }
  if (e.target.dataset.mix !== undefined) {
    volumes[+e.target.dataset.mix] = +e.target.value;
    updateMix();
  }
  if (e.target.id === 'volume') {
    audio.volume = +e.target.value;
    if (studioMaster) studioMaster.gain.value = 0.38 * +e.target.value;
  }
  if (e.target.id === 'seek' && audio.duration)
    audio.currentTime = (Number(e.target.value) / 1000) * audio.duration;
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'audio-upload') handleAudio(e.target.files[0]);
  if (e.target.id === 'midi-upload') handleMidi(e.target.files[0]);
  if (e.target.id === 'studio-bpm') {
    bpm = Math.max(50, Math.min(180, +e.target.value || 108));
    e.target.value = bpm;
    restartStudio();
  }
  if (e.target.id === 'studio-key') {
    transpose = +e.target.value;
    restartStudio();
    paintNotes();
  }
});
document.addEventListener('dragover', (e) => {
  const zone = e.target.closest('.dropzone');
  if (zone) {
    e.preventDefault();
    zone.classList.add('dragover');
  }
});
document.addEventListener('dragleave', (e) =>
  e.target.closest('.dropzone')?.classList.remove('dragover'),
);
document.addEventListener('drop', (e) => {
  const zone = e.target.closest('.dropzone');
  if (zone) {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleAudio(e.dataTransfer.files[0]);
  }
});
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) $('#modal-root').innerHTML = '';
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('#modal-root').innerHTML = '';
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    setView('create');
    $('#prompt')?.focus();
  }
  if (
    e.code === 'Space' &&
    !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName) &&
    !$('.modal')
  ) {
    e.preventDefault();
    if (view === 'arrange') $('#studio-play')?.click();
    else $('#main-play').click();
  }
  if (e.key === 'Tab' && $('.modal')) {
    const els = $$('button,input,select,a[href]', $('.modal'));
    const first = els[0],
      last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
audio.addEventListener('timeupdate', () => {
  $('#elapsed').textContent = time(audio.currentTime);
  $('#duration').textContent = time(audio.duration);
  $('#seek').value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
});
audio.addEventListener('loadedmetadata', () => ($('#duration').textContent = time(audio.duration)));
audio.addEventListener('play', updatePlayer);
audio.addEventListener('pause', updatePlayer);
audio.addEventListener('ended', updatePlayer);
audio.addEventListener('error', () => toast('这个音频无法播放，请尝试其他格式或内置样例。'));
window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1) || 'home';
  if (next !== view) {
    if (view === 'hum') window.HumToMusic?.leave();
    if (studioPlaying) stopStudio();
    view = next;
    render();
  }
});
view = location.hash.slice(1) || 'home';
render();
ensureScore().catch(() => {});
