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
  'song-chamber': {
    title: 'hate that i made you love me · 室内古典',
    subtitle: '转录旋律 · 重新编配',
    style: 'Classical / Melody-locked',
    cover: 'assets/cover-classical.png',
    src: 'assets/song-chamber.m4a',
    duration: '0:20',
    caseStudy: true,
  },
  'song-nocturne': {
    title: 'hate that i made you love me · 钢琴夜曲',
    subtitle: '转录旋律 · 重新编配',
    style: 'Piano / Melody-locked',
    cover: 'assets/cover-classical.png',
    src: 'assets/song-nocturne.m4a',
    duration: '0:20',
    caseStudy: true,
  },
  'song-erhu': {
    title: 'hate that i made you love me · 西北喜宴',
    subtitle: '转录旋律 · 重新编配',
    style: 'Northwest wedding / Melody-locked',
    cover: 'assets/cover-pop.png',
    src: 'assets/song-erhu.m4a',
    duration: '0:20',
    caseStudy: true,
  },
  'song-lofi': {
    title: 'hate that i made you love me · 深夜 Lo-fi',
    subtitle: '转录旋律 · 重新编配',
    style: 'Lo-fi / Melody-locked',
    cover: 'assets/cover-classical.png',
    src: 'assets/song-lofi.m4a',
    duration: '0:20',
    caseStudy: true,
  },
  'song-chip': {
    title: 'hate that i made you love me · 8-bit 冒险',
    subtitle: '转录旋律 · 重新编配',
    style: 'Chiptune / Melody-locked',
    cover: 'assets/cover-pop.png',
    src: 'assets/song-chip.m4a',
    duration: '0:20',
    caseStudy: true,
  },
  'song-classical': {
    title: 'hate that i made you love me · 早期 AI 改编',
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
  current = 'song-chamber',
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
let libraryFavorites = false;
function setView(next) {
  const target =
    { home: 'workspace', create: 'workspace', transform: 'workspace', favorites: 'library' }[
      next
    ] || next;
  if (next === 'create' || next === 'transform')
    MusicCraftAgent.selectMode(next === 'create' ? 'create' : 'restyle');
  if (target === 'library') {
    libraryFavorites = next === 'favorites';
    const section = document.querySelector('#library');
    if (section) {
      section.innerHTML = libraryView();
      icons();
    }
  }
  location.hash = target;
  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document
    .querySelectorAll('.nav-item[data-view]')
    .forEach((button) =>
      button.classList.toggle(
        'active',
        button.dataset.view === next || (next !== 'favorites' && button.dataset.view === target),
      ),
    );
}
function render() {
  view = 'workspace';
  $('#breadcrumb').textContent = 'MusicCraft 音乐工作区';
  if (document.getElementById('workspace')) {
    document.getElementById('arrange').innerHTML = CoStudio.view();
    document.getElementById('library').innerHTML = libraryView();
  } else main.innerHTML = homeView();
  icons();
  paintNotes();
  if ($('.remix-deck')) CoRemix.mount().catch(() => {});
  updatePlayer();
}
function trackCard(key) {
  const t = tracks[key];
  return `<div class="compare-track"><div class="cover-wrap"><img src="${t.cover}" alt="${key === 'pop' ? '银色流动雕塑' : '光影中的三角钢琴'}"><button class="cover-play" data-play="${key}" aria-label="试听${t.title}">${icon('play')}</button></div><div class="track-info"><h3>${t.title}</h3><p>${key === 'pop' ? '轻快节奏，合成器与电子鼓' : '保留旋律，换上钢琴与弦乐'}</p><div class="tag-row"><span class="tag ${key === 'pop' ? 'rose' : ''}">${key === 'pop' ? '原始编配' : '风格改编'}</span><span class="tag">${key === 'pop' ? '流行' : '室内古典'}</span><span class="tag">0:38</span></div></div></div>`;
}
function homeView() {
  return `<section id="workspace" class="workspace-section"><div class="art-hero">
    <div class="art-hero-copy"><div class="art-eyebrow"><span class="art-spark" aria-hidden="true">✳</span><span data-i18n-ignore>MUSICCRAFT — A STUDIO FOR YOUR IMAGINATION</span></div>
    <h1 data-i18n-ignore><span>Make it</span><em>your sound.</em></h1>
    <p class="art-intro">让每一种声音，成为你的作品。</p><p class="art-description">重塑歌曲风格，用自己的声音翻唱，或让一个灵感长成旋律。</p>
    <div class="art-actions"><a class="btn btn-primary" href="#music-agent">进入创作 ${icon('arrow-up-right')}</a><button class="art-listen" data-view="examples">${icon('headphones')}<span>先听听灵感</span></button></div>
    </div>
    <div class="art-record-scene" aria-hidden="true"><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span><span class="art-scene-note" data-i18n-ignore>PLAY. REIMAGINE. REPEAT.</span><div class="art-record"><div class="art-record-label"><span data-i18n-ignore>MC / SIDE A</span><span class="record-flower">✳</span><i></i><span data-i18n-ignore>ORIGINAL BY YOU</span></div></div><span class="art-record-caption" data-i18n-ignore>AN OPEN SPACE<br>FOR A NEW FREQUENCY.</span><span class="art-scene-cross">+</span></div>
    <div class="art-hero-foot"><span data-i18n-ignore>FROM AN IDEA TO A NEW FREQUENCY</span><div><span>风格重塑</span><i></i><span>个人音色</span><i></i><span>灵感作曲</span></div></div>
    </div>${MusicCraftConnections.panel()}${MusicCraftAgent.workspace()}</section><section id="arrange" class="workspace-section">${CoStudio.view()}</section><section id="examples" class="workspace-section"><div class="section-head"><div><h2>风格试听与对比</h2><p>本区为预制试听，播放和切换风格不调用实时模型。</p></div></div>${themePlayground()}${songCaseStudy()}</section><section id="library" class="workspace-section">${libraryView()}</section>`;
}
function showResult(key, kind) {
  musicStyleResult(key, kind);
}
function libraryView() {
  const all = libraryFavorites
    ? Object.keys(tracks).filter((k) => favorites.includes(k))
    : Object.keys(tracks);
  return `<div class="view-title"><p class="eyebrow">YOUR LITTLE COLLECTION OF SOUNDS</p><h1>${libraryFavorites ? '喜欢的声音，留在这里。' : '每个版本，都值得听见。'}</h1><p>${libraryFavorites ? '点击播放器或列表中的爱心，把喜欢的版本收藏起来。' : '真实改编与原创示例都在这里。播放、比较，或者带走它。'}</p></div><div class="library-toolbar"><label class="search">${icon('search')}<input id="library-search" aria-label="搜索作品" placeholder="搜索作品、风格…"></label><span class="count">${all.length} 个版本 · 保存在此浏览器</span></div><div class="track-list" id="track-list">${all.length ? all.map(trackRow).join('') : '<div class="empty-library">还没有收藏。去试听一首喜欢的音乐吧。</div>'}</div><p class="compare-note">${icon('info')}包含用户提供的歌曲片段、真实 AI 改编与原创程序编配示例。封面为 AI 图像。</p>`;
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
      ? {
          ...tracks.pop,
          title: customFilename,
          subtitle: '上传文件 · 仅本地试听',
        }
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
  CoRemix.stop();
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
  const library = document.getElementById('library');
  if (library) {
    library.innerHTML = libraryView();
    icons();
  }
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
    body = `<p>MusicCraft 将音乐创作、风格改编、个人音色翻唱与 MIDI 编曲放在同一工作区。</p><p>DeepSeek 在后台理解创意；Mureka 负责音乐创作和风格改编，Seed-VC 负责个人换声。</p><p>上传原歌曲和自己的清晰歌声参考，点击开始换声即可完成分离、转换与混音。</p><p>预制示例可直接试听；真实生成与换声需要相应模型服务。</p>`;
  }
  $('#modal-root').innerHTML =
    `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x')}</button></div>${body}<button class="btn btn-primary" data-action="close-modal">${type === 'compare' ? '继续听音乐' : '知道了，开始探索'}</button></section></div>`;
  icons();
  $('.modal [data-action="close-modal"]').focus();
}
async function startStudio() {
  CoRemix.stop();
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
    CoRemix.volume(audio.volume);
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
    document.querySelector('[data-agent-field="instruction"]')?.focus();
  }
  if (
    e.code === 'Space' &&
    !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName) &&
    !$('.modal')
  ) {
    e.preventDefault();
    if (location.hash === '#arrange') $('#studio-play')?.click();
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
  const next = location.hash.slice(1) || 'workspace';
  const target =
    { home: 'workspace', create: 'workspace', transform: 'workspace', favorites: 'library' }[
      next
    ] || next;
  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
const initialSection = location.hash.slice(1) || 'workspace';
render();
if (initialSection !== 'workspace') setView(initialSection);
ensureScore().catch(() => {});
