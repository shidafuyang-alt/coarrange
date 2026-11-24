'use strict';
// Six sample-aligned versions, plus the early AI cover, of one 20-second hook. Switching never moves the playhead.
window.CoRemix = (() => {
  const decks = [
    {
      id: 'original',
      name: '流行原曲',
      hint: '原曲片段',
      icon: 'mic-2',
      color: '#d9738f',
    },
    {
      id: 'chamber',
      name: '室内古典',
      hint: '小提琴领唱',
      icon: 'music-2',
      color: '#8d6fb8',
    },
    {
      id: 'nocturne',
      name: '钢琴夜曲',
      hint: '一架钢琴',
      icon: 'piano',
      color: '#4f7fb5',
    },
    {
      id: 'erhu',
      name: '西北喜宴',
      hint: '唢呐、二胡与锣鼓',
      icon: 'party-popper',
      color: '#d93a3a',
    },
    {
      id: 'lofi',
      name: '深夜 Lo-fi',
      hint: '萨克斯与电钢琴',
      icon: 'coffee',
      color: '#7c8b5b',
    },
    {
      id: 'chip',
      name: '8-bit 冒险',
      hint: '像素游戏机',
      icon: 'gamepad-2',
      color: '#2f9c8c',
    },
    {
      id: 'classical',
      name: '早期 AI 改编',
      hint: '对比：旋律走样',
      icon: 'history',
      color: '#6f6a78',
    },
  ];
  const remixCount = 6; // the last deck is a comparison and stays out of Auto-DJ
  let ctx,
    master,
    loading,
    melody,
    channels = [],
    playing = false,
    startedAt = 0,
    selected = 1,
    auto = false,
    lastBar = -1,
    generation = 0;
  const label = (s) => CoLocale.text(s);

  function view() {
    return `<div class="remix-deck" style="--deck:${decks[selected].color}"><div class="remix-head"><div><p class="eyebrow">ONE HOOK. SIX WORLDS.</p><h3>同一段副歌，随时变身。</h3></div><div class="remix-actions"><button class="btn btn-outline" data-remix="auto" aria-pressed="${auto}">${icon('shuffle')}自动 DJ</button><button class="btn btn-primary" data-remix="play">${icon(playing ? 'square' : 'play')}<span>${playing ? '停止' : '开始混音'}</span></button></div></div><canvas class="remix-canvas" height="190" aria-label="从人声提取的旋律轮廓"></canvas><div class="remix-keys">${decks.map((d, i) => `<button class="remix-key ${i === selected ? 'is-on' : ''}" data-remix-key="${i}" aria-pressed="${i === selected}" style="--key:${d.color}"><kbd>${i + 1}</kbd>${icon(d.icon)}<strong>${d.name}</strong><small>${d.hint}</small></button>`).join('')}</div><p class="helper">${icon('keyboard')}按 1–6 切换，7 听早期 AI 对比，0 开关自动 DJ，P 播放或停止。亮线是从人声提取的旋律，五个改编都演奏这条线。</p></div>`;
  }
  async function load() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.ratio.value = 16;
      limiter.attack.value = 0.002;
      master.connect(limiter).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') await ctx.resume();
    loading ||= Promise.all(
      decks.map(async (d) => {
        const response = await fetch(`assets/song-${d.id}.m4a`);
        if (!response.ok) throw Error(d.id);
        return ctx.decodeAudioData(await response.arrayBuffer());
      }),
    ).catch((error) => {
      loading = null;
      throw error;
    });
    return loading;
  }
  async function play() {
    const ticket = ++generation;
    const buffers = await load();
    if (ticket !== generation) return;
    if (studioPlaying) stopStudio();
    audio.pause();
    const when = ctx.currentTime + 0.08;
    master.gain.value = 1.5 * audio.volume;
    channels = buffers.map((buffer, i) => {
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = 20;
      gain.gain.value = i === selected ? 1 : 0;
      source.connect(gain).connect(master);
      source.start(when);
      return { source, gain };
    });
    startedAt = when;
    playing = true;
    lastBar = -1;
    refresh();
    requestAnimationFrame(frame);
  }
  function stop() {
    generation++;
    if (!playing) return;
    channels.forEach((c) => c.source.stop());
    channels = [];
    playing = false;
    refresh();
  }
  function toggle() {
    if (playing) stop();
    else
      play().catch(() => {
        toast('音频暂时无法播放，请稍后重试。');
      });
  }
  function select(i) {
    selected = i;
    channels.forEach((c, k) => {
      const now = ctx.currentTime;
      c.gain.gain.cancelScheduledValues(now);
      c.gain.gain.setTargetAtTime(k === i ? 1 : 0, now, 0.018);
    });
    refresh();
  }
  function setAuto(next) {
    auto = next;
    lastBar = -1;
    refresh();
    if (auto && !playing) toggle();
  }
  function refresh() {
    const root = document.querySelector('.remix-deck');
    if (!root) return;
    root.outerHTML = view();
    icons();
    draw();
  }
  const position = () => (playing ? Math.max(0, ctx.currentTime - startedAt) % 20 : 0);
  function draw() {
    const canvas = document.querySelector('.remix-canvas');
    if (!canvas || !melody) return;
    const ratio = devicePixelRatio || 1,
      w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    const g = canvas.getContext('2d');
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, w, h);
    const t = position(),
      color = decks[selected].color,
      muted = getComputedStyle(canvas).color;
    const pitches = melody.notes.map((n) => n[2]);
    const lo = Math.min(...pitches) - 2,
      hi = Math.max(...pitches) + 2;
    g.fillStyle = muted;
    g.globalAlpha = 0.14;
    for (let x = melody.firstBeat; x < 20; x += 60 / melody.bpm) g.fillRect((x / 20) * w, 0, 1, h);
    g.lineCap = 'round';
    let previous = null;
    for (const [time, duration, pitch] of melody.notes) {
      const x = (time / 20) * w,
        end = ((time + duration) / 20) * w,
        y = h - ((pitch - lo) / (hi - lo)) * h;
      const past = playing && time <= t,
        now = past && time + duration > t;
      g.strokeStyle = past ? color : muted;
      g.globalAlpha = past ? 1 : 0.4;
      if (previous && x - previous.end < 5) {
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(previous.end, previous.y);
        g.lineTo(x, y);
        g.stroke();
      }
      g.lineWidth = now ? 13 : 8;
      g.beginPath();
      g.moveTo(x + 3, y);
      g.lineTo(Math.max(x + 3, end - 3), y);
      g.stroke();
      previous = { end, y };
    }
    g.globalAlpha = 1;
    if (playing) {
      g.fillStyle = color;
      g.fillRect((t / 20) * w, 0, 2, h);
    }
  }
  function frame() {
    if (!playing) return;
    if (!document.querySelector('.remix-deck')) {
      stop();
      return;
    }
    if (auto) {
      // Four-beat bars start on the second beat of the excerpt.
      const bar = Math.floor((position() - melody.firstBeat - 0.625) / 2.5);
      if (bar !== lastBar) {
        if (lastBar !== -1) select((selected + 1) % remixCount);
        lastBar = bar;
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  async function mount() {
    melody ||= await (await fetch('assets/song-melody.json')).json();
    draw();
  }
  document.addEventListener('click', (e) => {
    const key = e.target.closest('[data-remix-key]');
    if (key) {
      if (auto) auto = false;
      select(+key.dataset.remixKey);
      if (!playing) toggle();
      return;
    }
    const action = e.target.closest('[data-remix]')?.dataset.remix;
    if (action === 'play') toggle();
    if (action === 'auto') setAuto(!auto);
  });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || document.querySelector('.modal')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (!document.querySelector('.remix-deck')) return;
    if (/^[1-7]$/.test(e.key)) {
      auto = false;
      select(+e.key - 1);
      if (!playing) toggle();
    } else if (e.key === '0') setAuto(!auto);
    else if (e.key.toLowerCase() === 'p') toggle();
  });
  window.addEventListener('resize', draw);
  return {
    view,
    mount,
    stop,
    get playing() {
      return playing;
    },
    volume(v) {
      if (master) master.gain.value = 1.5 * v;
    },
  };
})();
