/**
 * Minimal check that @spotify/basic-pitch transcribes three different
 * generated recordings before the browser page uses the same function.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transcribeSamples } from './transcribe.mjs';

const SR = 22050;
const here = path.dirname(fileURLToPath(import.meta.url));
const modelRoot = path.join(here, 'node_modules', '@spotify', 'basic-pitch');

function tone(midi, duration) {
  const count = Math.floor(duration * SR);
  const out = new Float32Array(count);
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const attack = Math.floor(0.03 * SR);
  const release = Math.floor(0.05 * SR);
  for (let i = 0; i < count; i++) {
    const time = i / SR;
    const vibrato = frequency * (1 + 0.006 * Math.sin(2 * Math.PI * 5 * time));
    let sample = 0.62 * Math.sin(2 * Math.PI * vibrato * time);
    sample += 0.2 * Math.sin(2 * Math.PI * 2 * vibrato * time);
    let envelope = 1;
    if (i < attack) envelope = i / attack;
    else if (i > count - release) envelope = (count - i) / release;
    out[i] = sample * envelope * 0.8;
  }
  return out;
}

function render(spec) {
  const end = Math.max(...spec.map(([, start, duration]) => start + duration)) + 0.2;
  const audio = new Float32Array(Math.floor(end * SR));
  for (const [midi, start, duration] of spec) {
    const rendered = tone(midi, duration);
    const offset = Math.floor(start * SR);
    for (let i = 0; i < rendered.length && offset + i < audio.length; i++)
      audio[offset + i] += rendered[i];
  }
  return audio;
}

function subsequence(actual, expected, tolerance = 1) {
  let index = 0;
  for (const pitch of expected) {
    while (index < actual.length && Math.abs(actual[index] - pitch) > tolerance) index += 1;
    if (index >= actual.length) return false;
    index += 1;
  }
  return true;
}

function serveModel() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      const file = path.normalize(path.join(modelRoot, decodeURIComponent(url.pathname)));
      if (!file.startsWith(modelRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        'content-type': file.endsWith('.json') ? 'application/json' : 'application/octet-stream',
        'access-control-allow-origin': '*',
      });
      fs.createReadStream(file).pipe(response);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        modelUrl: `http://127.0.0.1:${port}/model/model.json`,
      });
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const recordings = {
  scale: render(
    [60, 62, 64, 65, 67, 65, 64, 62, 60].map((midi, index) => [midi, index * 0.46, 0.34]),
  ),
  repeated: render([0, 1, 2].map((index) => [72, index * 0.72, 0.4])),
  mixed: render([
    [60, 0.1, 1.1],
    [64, 1.45, 0.2],
    [67, 1.85, 1.0],
  ]),
};

const { server, modelUrl } = await serveModel();
try {
  const results = {};
  for (const [name, audio] of Object.entries(recordings)) {
    results[name] = await transcribeSamples(audio, modelUrl);
    console.log(name, results[name].ok, results[name].notes.map((note) => note.pitch).join(','));
  }
  const scale = results.scale.notes.map((note) => note.pitch);
  const repeated = results.repeated.notes.map((note) => note.pitch);
  const mixed = results.mixed.notes.map((note) => note.duration);
  assert(results.scale.ok, results.scale.message);
  assert(subsequence(scale, [60, 62, 64, 65, 67]), `scale up ${scale}`);
  assert(subsequence(scale, [67, 65, 64, 62, 60]), `scale down ${scale}`);
  assert(
    results.repeated.ok &&
      repeated.every((pitch) => Math.abs(pitch - 72) <= 1) &&
      repeated.length >= 2,
    `repeated ${repeated}`,
  );
  assert(results.mixed.ok && Math.max(...mixed) / Math.min(...mixed) > 2, `durations ${mixed}`);
  assert(scale.join() !== repeated.join(), 'recordings produced the same notes');
  assert(results.scale.midi[0] === 0x4d && results.scale.midi[1] === 0x54, 'midi header');
  const silence = await transcribeSamples(new Float32Array(SR * 2), modelUrl);
  assert(!silence.ok && silence.notes.length === 0, 'silence was transcribed');
  console.log('three recordings transcribed');
} finally {
  server.close();
}
