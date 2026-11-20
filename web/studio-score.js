'use strict';
window.CoScore = (() => {
  const beat = 60 / 108;
  const chords = [
    [48, 52, 55],
    [45, 48, 52],
    [41, 45, 48],
    [43, 47, 50],
    [48, 52, 55],
    [41, 45, 48],
    [43, 47, 50],
    [48, 52, 55],
  ];
  function arrange(melody, style, parts) {
    const notes = melody.map((n) => ({ ...n, track: 0 }));
    const add = (track, pitch, b, d, v) =>
      notes.push({ track, pitch, time: (b + 1) * beat, duration: d * beat, velocity: v });
    const end = Math.min(128, Math.max(...melody.map((n) => (n.time + n.duration) / beat)) - 1),
      bars = Math.ceil(end / 4);
    const swing = ['jazz', 'circus', 'lofi'].includes(style);
    if (swing)
      notes.forEach((n) => {
        const b = n.time / beat - 1;
        if (Math.abs((b % 1) - 0.5) < 0.08) n.time += 0.13 * beat;
      });
    for (let bar = 0; bar < bars; bar++) {
      const c = chords[bar % 8],
        base = bar * 4;
      const seventh = bar % 8 === 3 || bar % 8 === 6 ? c[0] + 10 : c[0] + 11;
      const extended = ['jazz', 'bossa', 'lofi'].includes(style)
        ? [c[0] + 12, c[1] + 12, c[2] + 12, seventh + 12]
        : c.map((p) => p + 12);
      if (['folk', 'classical', 'soft', 'bossa'].includes(style)) {
        const offsets =
          style === 'bossa' ? [0, 0.75, 1.5, 2.5, 3.25] : [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
        offsets.forEach((o, i) =>
          add(1, extended[i % extended.length], base + o, 0.55, 45 + (i % 3) * 5),
        );
      } else if (style === 'chiptune') {
        for (let i = 0; i < 16; i++) add(1, extended[i % 3] + 12, base + i * 0.25, 0.17, 40);
      } else {
        const offsets =
          style === 'reggae'
            ? [0.5, 1.5, 2.5, 3.5]
            : style === 'circus'
              ? [1, 3]
              : style === 'funk'
                ? [0.5, 1.25, 2.5, 3.25]
                : style === 'jazz'
                  ? [0.66, 2, 3.66]
                  : [0, 1.5, 2.5, 3.5];
        for (const o of offsets)
          for (const p of style === 'rock' ? [c[0], c[0] + 7, c[0] + 12] : extended)
            add(1, p, base + o, style === 'rock' ? 0.5 : 0.32, style === 'rock' ? 61 : 48);
      }
      if (style === 'jazz')
        for (let i = 0; i < 4; i++)
          add(
            2,
            [c[0] - 12, c[1] - 12, c[2] - 12, bar % 2 ? c[0] - 13 : c[2] - 13][i],
            base + i,
            0.85,
            64,
          );
      else
        for (const [i, o] of (['erhu', 'funk', 'pop', 'chiptune'].includes(style)
          ? [0, 0.75, 1.5, 2, 2.75, 3.5]
          : [0, 2]
        ).entries())
          add(
            2,
            c[0] - 12 + (i % 2 && ['erhu', 'funk', 'chiptune'].includes(style) ? 12 : 0),
            base + o,
            0.65,
            68,
          );
      if (parts[3]) {
        if (['classical', 'soft', 'folk', 'bossa', 'lofi'].includes(style))
          for (const p of c) add(3, p + 24, base, 3.3, style === 'soft' ? 27 : 34);
        else if (style === 'circus')
          for (const o of [2.66, 3.33]) add(3, c[Math.floor(o) % 3] + 24, base + o, 0.16, 48);
        else if (style === 'chiptune')
          for (let i = 0; i < 4; i++) add(3, c[i % 3] + 24, base + i + 0.25, 0.24, 35);
        else if (bar % 2 === 1)
          for (let i = 0; i < 3; i++) add(3, c[i] + 24, base + 2.5 + i * 0.5, 0.3, 42);
      }
      const drum = parts.indexOf('drums');
      if (drum >= 0) {
        const kicks = style === 'erhu' ? [0, 1, 2, 3] : style === 'reggae' ? [2] : [0, 2, 2.75];
        kicks.forEach((o) => add(drum, 36, base + o, 0.12, 84));
        (style === 'reggae' ? [2] : [1, 3]).forEach((o) =>
          add(drum, 38, base + o, 0.1, style === 'lofi' ? 48 : 65),
        );
        for (let i = 0; i < 8; i++)
          add(drum, 42, base + i * 0.5 + (swing && i % 2 ? 0.13 : 0), 0.07, i % 2 ? 36 : 46);
      }
    }
    return notes;
  }
  function additional(melody, index, instrument) {
    if (instrument === 'drums')
      return arrange(melody, 'pop', ['piano', 'strings', 'bass', 'harp', 'drums'])
        .filter((n) => n.track === 4)
        .map((n) => ({ ...n, track: index }));
    const lead = [
      'erhu',
      'violin',
      'flute',
      'clarinet',
      'sax',
      'trumpet',
      'ocarina',
      'chip',
    ].includes(instrument);
    return melody
      .filter((n, i) => lead || i % 3 === 0)
      .map((n) => ({
        ...n,
        track: index,
        pitch: Math.min(100, n.pitch + (lead ? 0 : -12)),
        velocity: lead ? Math.round(n.velocity * 0.65) : 38,
      }));
  }
  return { arrange, additional };
})();
