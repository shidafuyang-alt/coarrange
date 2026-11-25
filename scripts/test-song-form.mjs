import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const BEAT = 60 / 108;
const five = [
  { pitch: 64, time: 0.729, duration: 0.395, velocity: 92 },
  { pitch: 67, time: 1.31, duration: 0.395, velocity: 90 },
  { pitch: 69, time: 1.891, duration: 0.406, velocity: 93 },
  { pitch: 67, time: 2.471, duration: 0.396, velocity: 88 },
  { pitch: 65, time: 3.041, duration: 0.406, velocity: 91 },
];
const dmajor = [0, 0.42, 0.7, 1.35, 1.9, 2.55, 3.4].map((time, index) => ({
  pitch: [62, 64, 66, 69, 67, 64, 62][index],
  time: 0.5556 + time,
  duration: [0.38, 0.22, 0.55, 0.4, 0.5, 0.7, 0.9][index],
  velocity: [84, 80, 86, 90, 88, 82, 92][index],
}));

const context = { window: {}, console };
context.window = context;
vm.createContext(context);
vm.runInContext(await readFile(new URL('../web/song-form.js', import.meta.url), 'utf8'), context);
const { CoSong } = context;

function close(actual, expected, label) {
  if (Math.abs(actual - expected) > 0.004) {
    throw new Error(`${label}: ${actual} !== ${expected}`);
  }
}
function melodyIn(song, section) {
  const from = (section.start + 1) * BEAT - 0.002;
  const to = (section.start + section.bars * 4 + 1) * BEAT - 0.002;
  return song.notes
    .filter((note) => note.track === 0 && note.time >= from && note.time < to)
    .sort((a, b) => a.time - b.time);
}
function check(name, melody, style, parts) {
  const song = CoSong.realize(melody, style, parts);
  const ids = song.sections.map((section) => section.id).join(',');
  if (ids !== 'intro,A,prime,outro') throw new Error(`${name} section order ${ids}`);
  const last = song.sections.at(-1);
  const seconds = (last.start + last.bars * 4) * BEAT;
  if (seconds < 20 || seconds > 40) throw new Error(`${name} length ${seconds.toFixed(2)}s`);
  const theme = song.sections[1];
  const heard = melodyIn(song, theme);
  const source = [...melody].sort((a, b) => a.time - b.time);
  if (heard.length !== source.length) throw new Error(`${name} A has ${heard.length} notes`);
  const origin = source[0].time;
  source.forEach((note, index) => {
    const got = heard[index];
    if (got.pitch !== note.pitch) throw new Error(`${name} A pitch ${got.pitch}`);
    if (got.velocity !== note.velocity) throw new Error(`${name} A velocity ${got.velocity}`);
    close(got.duration, note.duration, `${name} A duration`);
    close(got.time, (theme.start + 1 + (note.time - origin) / BEAT) * BEAT, `${name} A time`);
  });
  const developed = melodyIn(song, song.sections[2]);
  for (let index = 0; index < Math.min(3, source.length); index++) {
    if (developed[index].pitch !== source[index].pitch) {
      throw new Error(`${name} A' head pitch ${developed[index].pitch}`);
    }
  }
  const aDensity =
    song.notes.filter((note) => note.track !== 0 && inSection(note, theme)).length / theme.bars;
  const prime = song.sections[2];
  const primeDensity =
    song.notes.filter((note) => note.track !== 0 && inSection(note, prime)).length / prime.bars;
  if (primeDensity <= aDensity) throw new Error(`${name} development is not denser`);
  const outro = melodyIn(song, song.sections[3]);
  const tonic = ((outro.at(-1).pitch % 12) + 12) % 12;
  if (tonic !== song.key.tonic) throw new Error(`${name} ending is not the tonic`);
  const ranges = song.sections.map((section) => melodyIn(song, section));
  ranges.forEach((notes, index) => {
    if (!notes.length) throw new Error(`${name} empty melody in ${song.sections[index].id}`);
  });
  return { song, seconds };
}
function inSection(note, section) {
  const from = (section.start + 1) * BEAT - 0.002;
  const to = (section.start + section.bars * 4 + 1) * BEAT - 0.002;
  return note.time >= from && note.time < to;
}

const classical = check('five', five, 'classical', ['piano', 'strings', 'cello', 'harp']);
const jazz = CoSong.realize(five, 'jazz', ['sax', 'piano', 'upright', 'marimba', 'drums']);
const classicalA = melodyIn(classical.song, classical.song.sections[1]);
const jazzA = melodyIn(jazz, jazz.sections[1]);
classicalA.forEach((note, index) => close(jazzA[index].time, note.time, 'jazz swung the theme'));
const dSong = check('d-major', dmajor, 'folk', ['flute', 'steel', 'upright', 'banjo']);
if (dSong.song.key.tonic !== 2 || dSong.song.key.mode !== 'major') {
  throw new Error(`D major detected as ${dSong.song.key.mode} ${dSong.song.key.tonic}`);
}

const out = new URL('../artifacts/hum-to-song/', import.meta.url);
await mkdir(out, { recursive: true });
await writeFile(new URL('five-classical.mid', out), midi(classical.song));
await writeFile(new URL('dmajor-folk.mid', out), midi(dSong.song));
await writeFile(new URL('five-classical.wav', out), wav(classical.song));
await writeFile(new URL('dmajor-folk.wav', out), wav(dSong.song));
await writeFile(
  new URL('listen.html', out),
  `<!doctype html><meta charset="utf-8"><title>Hum-to-Song V0</title>
<style>body{font-family:sans-serif;max-width:720px;margin:32px auto;line-height:1.5}audio{width:100%}</style>
<h1>Hum-to-Song V0 结构试听</h1>
<p>这两段是正弦和三角波的结构草图，用来听前奏、主题、发展和结尾。真实音色请在工作台播放。</p>
<h2>五音旋律 · 室内古典 · ${classical.seconds.toFixed(1)} 秒</h2>
<audio controls src="five-classical.wav"></audio>
<h2>D 大调旋律 · 民谣 · ${dSong.seconds.toFixed(1)} 秒</h2>
<audio controls src="dmajor-folk.wav"></audio>`,
);
const wavPath = fileURLToPath(new URL('five-classical.wav', out));
const info = spawnSync('afinfo', [wavPath], { encoding: 'utf8' });
if (info.status !== 0) throw new Error(info.stderr || 'preview wav did not decode');
console.log(
  `song form ok · five ${classical.seconds.toFixed(1)}s · D major ${dSong.seconds.toFixed(1)}s`,
);

function midi(song) {
  const tracks = new Map();
  for (const note of song.notes) {
    const list = tracks.get(note.track) || [];
    list.push(note);
    tracks.set(note.track, list);
  }
  const chunks = [];
  for (const [track, notes] of [...tracks.entries()].sort((a, b) => a[0] - b[0])) {
    const channel = track === 4 ? 9 : Math.min(track, 8);
    const events = [{ t: 0, m: [0xc0 | channel, track === 0 ? 0 : 48] }];
    if (track === 0) events.push({ t: 0, m: [255, 81, 3, 0x07, 0xa1, 0x20] });
    for (const note of notes) {
      const pitch = Math.max(0, Math.min(127, note.pitch));
      events.push(
        { t: Math.round((note.time / BEAT) * 480), m: [0x90 | channel, pitch, note.velocity] },
        {
          t: Math.round(((note.time + note.duration) / BEAT) * 480),
          m: [0x80 | channel, pitch, 0],
        },
      );
    }
    events.sort((a, b) => a.t - b.t || a.m[0] - b.m[0]);
    let last = 0;
    const data = [];
    for (const event of events) {
      data.push(...vlq(event.t - last), ...event.m);
      last = event.t;
    }
    data.push(0, 255, 47, 0);
    chunks.push(77, 84, 114, 107, ...intBytes(data.length, 4), ...data);
  }
  return Buffer.from([77, 84, 104, 100, 0, 0, 0, 6, 0, 1, 0, tracks.size, 1, 224, ...chunks]);
}
function vlq(value) {
  const bytes = [value & 127];
  value >>= 7;
  while (value) {
    bytes.unshift((value & 127) | 128);
    value >>= 7;
  }
  return bytes;
}
function intBytes(value, size) {
  return Array.from({ length: size }, (_, index) => (value >> ((size - index - 1) * 8)) & 255);
}
function wav(song) {
  const rate = 22050;
  const end = Math.max(...song.notes.map((note) => note.time + note.duration)) + 0.2;
  const samples = new Float32Array(Math.ceil(end * rate));
  for (const note of song.notes) {
    const freq = 440 * 2 ** ((note.pitch - 69) / 12);
    const start = Math.floor(note.time * rate);
    const length = Math.floor(note.duration * rate);
    const gain = (note.velocity / 127) * (note.track === 0 ? 0.22 : 0.05);
    for (let i = 0; i < length && start + i < samples.length; i++) {
      const phase = (2 * Math.PI * freq * i) / rate;
      const wave = note.track === 0 ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
      const env = Math.min(1, i / 200, (length - i) / 400);
      samples[start + i] += wave * gain * env;
    }
  }
  const pcm = Buffer.alloc(samples.length * 2);
  samples.forEach((value, index) => {
    pcm.writeInt16LE(Math.max(-1, Math.min(1, value)) * 32767, index * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
