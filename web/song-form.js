'use strict';
// Turns a short hummed melody into Intro / A / A' / Outro. The A section keeps
// the hummed pitches, relative timing, durations and velocities.
window.CoSong = (() => {
  const BEAT = 60 / 108;
  const SCALE = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
  };
  const DEGREE = {
    major: { I: [0, 4, 7], ii: [2, 5, 9], IV: [5, 9, 0], V: [7, 11, 2], vi: [9, 0, 4] },
    minor: { i: [0, 3, 7], III: [3, 7, 10], iv: [5, 8, 0], V: [7, 11, 2], VI: [8, 0, 3] },
  };

  function pc(n) {
    return ((n % 12) + 12) % 12;
  }
  function analyze(notes) {
    let best = { tonic: 0, mode: 'major', score: -1e9 };
    for (let tonic = 0; tonic < 12; tonic++) {
      for (const mode of ['major', 'minor']) {
        const triad = mode === 'major' ? [0, 4, 7] : [0, 3, 7];
        let score = 0;
        for (const note of notes) {
          const rel = pc(note.pitch - tonic);
          const weight = note.duration * (note.duration >= 0.7 ? 1.45 : 1);
          score += SCALE[mode].includes(rel) ? weight : -0.9 * weight;
          if (rel === 0) score += 0.4 * weight;
          if (triad.includes(rel)) score += 0.2 * weight;
        }
        if (score > best.score) best = { tonic, mode, score };
      }
    }
    return best;
  }
  function snap(pitch, key) {
    const scale = SCALE[key.mode];
    for (let step = 0; step < 3; step++) {
      if (scale.includes(pc(pitch + step - key.tonic))) return pitch + step;
      if (scale.includes(pc(pitch - step - key.tonic))) return pitch - step;
    }
    return pitch;
  }
  function relative(melody) {
    const start = Math.min(...melody.map((note) => note.time));
    return melody
      .map((note) => ({
        pitch: note.pitch,
        onset: (note.time - start) / BEAT,
        dur: note.duration / BEAT,
        velocity: note.velocity,
      }))
      .sort((a, b) => a.onset - b.onset);
  }
  function barsOf(phrase) {
    const end = Math.max(...phrase.map((note) => note.onset + note.dur), 1);
    return Math.max(2, Math.min(8, Math.ceil(end / 4)));
  }
  function vary(phrase, key) {
    const developed = phrase.map((note, index) => {
      if (index < Math.min(3, phrase.length)) return { ...note };
      const onset = note.onset + (index % 2 ? 0.25 : 0);
      const dur = index === phrase.length - 1 ? note.dur * 1.4 : note.dur * (index % 2 ? 0.8 : 1);
      return {
        pitch: snap(note.pitch + (key.mode === 'minor' ? 3 : 2), key),
        onset,
        dur,
        velocity: Math.max(48, note.velocity - 8),
      };
    });
    for (let index = Math.min(3, developed.length); index < developed.length; index++) {
      const previous = developed[index - 1].onset + developed[index - 1].dur;
      if (developed[index].onset < previous) developed[index].onset = previous + 0.08;
    }
    const last = developed[developed.length - 1];
    let cursor = last.onset + last.dur + 0.2;
    let pitch = last.pitch;
    const tonic = pitch - pc(pitch - key.tonic);
    let guard = 0;
    while (pitch - 1 > tonic && guard < 5) {
      pitch = snap(pitch - 1, key);
      if (pitch <= tonic) break;
      developed.push({ pitch, onset: cursor, dur: 0.55, velocity: 70 });
      cursor += 0.6;
      guard += 1;
    }
    developed.push({
      pitch: tonic >= 48 ? tonic : tonic + 12,
      onset: cursor,
      dur: 1.8,
      velocity: 78,
    });
    return developed;
  }
  function slowed(phrase) {
    const slice = phrase.slice(-Math.min(4, phrase.length));
    const origin = slice[0].onset;
    return slice.map((note, index) => ({
      ...note,
      onset: (note.onset - origin) * 1.25,
      dur: note.dur * 1.35,
      velocity: Math.max(46, note.velocity - 10 - index * 4),
    }));
  }
  function place(phrase, startBeat) {
    return phrase.map((note) => ({
      track: 0,
      pitch: note.pitch,
      velocity: note.velocity,
      time: (startBeat + 1 + note.onset) * BEAT,
      duration: note.dur * BEAT,
    }));
  }
  function choose(notes, key, fallback) {
    const table = DEGREE[key.mode];
    let best = fallback;
    let bestScore = -1e9;
    for (const [name, tones] of Object.entries(table)) {
      let score = name === fallback ? 0.25 : 0;
      for (const note of notes) {
        const hit = tones.includes(pc(note.pitch - key.tonic));
        score += hit ? note.dur : -0.4 * note.dur;
      }
      if (score > bestScore) {
        best = name;
        bestScore = score;
      }
    }
    return best;
  }
  function pattern(style, section) {
    const busy = section === '发展';
    const thin = section === '前奏' || section === '结尾';
    if (thin) return { hits: [0], sustain: 3.4, bass: [0], drums: false };
    if (style === 'rock')
      return {
        hits: busy ? [0, 1, 2, 3] : [0, 2],
        sustain: 0.5,
        bass: [0, 2],
        power: true,
        drums: true,
      };
    if (style === 'jazz' || style === 'lofi' || style === 'circus')
      return {
        hits: busy ? [0, 1.5, 2.5, 3.5] : [0, 2.5],
        sustain: 0.85,
        bass: [0, 1, 2, 3],
        swing: true,
        drums: style !== 'circus',
      };
    if (style === 'folk')
      return { hits: busy ? [0, 1, 2, 3] : [0, 1.5, 3], sustain: 0.7, bass: [0, 2], drums: false };
    if (style === 'chiptune' || style === 'erhu' || style === 'pop')
      return {
        hits: busy ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] : [0, 1, 2, 3],
        sustain: 0.35,
        bass: [0, 2],
        drums: true,
      };
    return {
      hits: busy ? [0, 1, 2, 3] : [0, 2],
      sustain: busy ? 0.8 : 1.6,
      bass: [0, 2],
      drums: false,
    };
  }
  function accompany(list, section, start, bars, phrase, key, style, parts) {
    const plan = pattern(style, section.name);
    const fallback = {
      前奏: ['I', 'V', 'I', 'V'],
      主题: ['I', 'vi', 'IV', 'V'],
      发展: ['vi', 'IV', 'V', 'I'],
      结尾: ['IV', 'V', 'I', 'I'],
    }[section.name].map((degree) =>
      key.mode === 'minor' ? { I: 'i', vi: 'VI', IV: 'iv' }[degree] || degree : degree,
    );
    const gain =
      section.name === '前奏'
        ? 0.62
        : section.name === '发展'
          ? 0.9
          : section.name === '结尾'
            ? 0.55
            : 0.78;
    for (let bar = 0; bar < bars; bar++) {
      const barBeat = start + bar * 4;
      const inside = phrase.filter(
        (note) => note.onset >= bar * 4 - 0.05 && note.onset < (bar + 1) * 4,
      );
      const degree = inside.length
        ? choose(inside, key, fallback[bar % fallback.length])
        : fallback[bar % fallback.length];
      const tones = DEGREE[key.mode][degree] || DEGREE[key.mode][key.mode === 'minor' ? 'i' : 'I'];
      const root = tones[0];
      const lowest = inside.length ? Math.min(...inside.map((note) => note.pitch)) : 72;
      const color = tones.map((tone) => {
        let pitch = pc(key.tonic + tone) + 60;
        while (pitch > lowest - 3) pitch -= 12;
        while (pitch < 52) pitch += 12;
        return pitch;
      });
      let bass = pc(key.tonic + root) + 36;
      while (bass < 36) bass += 12;
      while (bass > 48) bass -= 12;
      for (const hit of plan.bass) {
        const when = hit + (plan.swing && Math.abs((hit % 1) - 0.5) < 0.2 ? 0.13 : 0);
        list.push(note(2, bass + (hit % 2 ? 12 : 0), barBeat + when, 0.7, 70 * gain));
      }
      for (const hit of plan.hits) {
        const when = hit + (plan.swing && Math.abs((hit % 1) - 0.5) < 0.2 ? 0.13 : 0);
        const voices = plan.power ? [color[0], color[0] + 7] : color;
        voices.forEach((pitch, index) => {
          list.push(note(1, pitch, barBeat + when, plan.sustain, (42 + index * 4) * gain));
        });
      }
      if (parts[3] && !plan.power && section.name !== '前奏') {
        list.push(
          note(
            3,
            color[color.length - 1] + 12,
            barBeat,
            Math.min(3.2, plan.sustain + 1),
            30 * gain,
          ),
        );
      }
      const drum = parts.indexOf('drums');
      if (drum >= 0 && plan.drums && section.name !== '前奏') {
        list.push(note(drum, 36, barBeat, 0.12, 78 * gain));
        if (section.name !== '结尾') list.push(note(drum, 38, barBeat + 2, 0.1, 60 * gain));
      }
    }
  }
  function note(track, pitch, beat, duration, velocity) {
    return {
      track,
      pitch: Math.max(24, Math.min(96, Math.round(pitch))),
      time: (beat + 1) * BEAT,
      duration: Math.max(0.08, duration) * BEAT,
      velocity: Math.max(1, Math.min(127, Math.round(velocity))),
    };
  }
  function realize(melody, style, parts) {
    const source = relative(melody);
    const key = analyze(melody);
    const theme = source;
    const developed = vary(source, key);
    const ending = slowed(source);
    const tonicPitch =
      source[source.length - 1].pitch - pc(source[source.length - 1].pitch - key.tonic);
    const endStart = ending[ending.length - 1].onset + ending[ending.length - 1].dur + 0.3;
    ending.push({
      pitch: tonicPitch < 48 ? tonicPitch + 12 : tonicPitch,
      onset: endStart,
      dur: 2.2,
      velocity: 64,
    });
    let intro = 4;
    let outro = 4;
    let aBars = barsOf(theme);
    let primeBars = barsOf(developed);
    let outroBars = Math.max(outro, barsOf(ending));
    let total = intro + aBars + primeBars + outroBars;
    while (total > 18 && intro > 2) {
      intro -= 2;
      total -= 2;
    }
    while (total > 18 && outroBars > 2) {
      outroBars -= 1;
      total -= 1;
    }
    while (total < 10) {
      outroBars += 2;
      total += 2;
    }
    const sections = [
      { id: 'intro', name: '前奏', start: 0, bars: intro },
      { id: 'A', name: '主题', start: intro * 4, bars: aBars },
      { id: 'prime', name: '发展', start: (intro + aBars) * 4, bars: primeBars },
      { id: 'outro', name: '结尾', start: (intro + aBars + primeBars) * 4, bars: outroBars },
    ];
    const introMotif = source.slice(0, Math.min(3, source.length)).map((item, index) => ({
      ...item,
      onset: index * 1.5,
      dur: Math.max(item.dur, 1.1),
      pitch: item.pitch > 64 ? item.pitch - 12 : item.pitch,
      velocity: Math.round(item.velocity * 0.62),
    }));
    const notes = [
      ...place(introMotif, Math.max(0, intro * 4 - 6)),
      ...place(theme, sections[1].start),
      ...place(developed, sections[2].start),
      ...place(ending, sections[3].start),
    ];
    for (const section of sections) {
      const local =
        section.id === 'intro'
          ? introMotif
          : section.id === 'A'
            ? theme
            : section.id === 'prime'
              ? developed
              : ending;
      accompany(notes, section, section.start, section.bars, local, key, style, parts);
    }
    return { notes, sections, key, style };
  }
  return { realize, analyze };
})();
