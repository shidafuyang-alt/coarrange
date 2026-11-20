'use strict';
window.CoSampler = (() => {
  const cache = new Map();
  let noiseBuffer;
  async function load(ctx, id) {
    if (id === 'drums') return;
    if (cache.has(id)) return cache.get(id);
    const roots =
      id === 'erhu'
        ? [
            [69, 'A4.wav'],
            [76, 'E5.wav'],
          ]
        : [2, 3, 4, 5, 6].map((o) => [(o + 1) * 12, `C${o}.mp3`]);
    const promise = Promise.all(
      roots.map(async ([root, file]) => {
        const response = await fetch(`assets/instruments/${id}-${file}`);
        if (!response.ok) throw Error('音色文件暂时不可用');
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        return { root, buffer };
      }),
    ).catch((e) => {
      cache.delete(id);
      throw e;
    });
    cache.set(id, promise);
    return promise;
  }
  function drum(ctx, note, when, duration, velocity, destination) {
    const gain = ctx.createGain();
    gain.connect(destination);
    if (note <= 36) {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(130, when);
      osc.frequency.exponentialRampToValueAtTime(42, when + 0.13);
      gain.gain.setValueAtTime(velocity * 0.55, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
      osc.connect(gain);
      osc.start(when);
      osc.stop(when + 0.25);
      return [osc];
    }
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = note >= 42 ? 'highpass' : 'bandpass';
    filter.frequency.value = note >= 42 ? 6500 : 1700;
    const tail = note >= 42 ? 0.07 : 0.17;
    gain.gain.setValueAtTime(velocity * (note >= 42 ? 0.17 : 0.35), when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + tail);
    source.connect(filter);
    filter.connect(gain);
    source.start(when);
    source.stop(when + tail + 0.01);
    return [source];
  }
  async function schedule(ctx, id, pitch, when, duration, velocity, destination) {
    if (id === 'drums') return drum(ctx, pitch, when, duration, velocity, destination);
    const samples = await load(ctx, id);
    const sample = samples.reduce((best, s) =>
      Math.abs(s.root - pitch) < Math.abs(best.root - pitch) ? s : best,
    );
    const source = ctx.createBufferSource();
    source.buffer = sample.buffer;
    source.playbackRate.value = 2 ** ((pitch - sample.root) / 12);
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(destination);
    const sustained = [
      'erhu',
      'violin',
      'cello',
      'strings',
      'organ',
      'flute',
      'clarinet',
      'sax',
      'trumpet',
      'trombone',
      'accordion',
      'ocarina',
      'chip',
    ].includes(id);
    if (sustained && duration > sample.buffer.duration / source.playbackRate.value - 0.2) {
      source.loop = true;
      source.loopStart = sample.buffer.duration * 0.3;
      source.loopEnd = sample.buffer.duration * 0.75;
    }
    const attack = sustained ? 0.024 : 0.006,
      release = sustained ? 0.15 : 0.08;
    const level = velocity * (id === 'erhu' ? 0.7 : 0.8);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(level, when + attack);
    gain.gain.setValueAtTime(level, when + Math.max(attack, duration - 0.025));
    gain.gain.linearRampToValueAtTime(0, when + duration + release);
    source.start(when);
    source.stop(when + duration + release + 0.02);
    return [source];
  }
  return { load, schedule };
})();
