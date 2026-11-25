import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { configuration } from '../server/config.mjs';
import { createAPI } from '../server/api.mjs';
import { runFal, downloadFal } from '../server/fal.mjs';
import { generateMusic, selectEngine } from '../server/engines.mjs';
import { mediaReady } from '../server/media.mjs';
import { connectionVersion } from '../server/connections.mjs';

const root = resolve(import.meta.dirname, '..');
const wav = Buffer.alloc(44 + 3200);
wav.write('RIFF');
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16000, 24);
wav.writeUInt32LE(32000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(3200, 40);
const brief = {
  task: 'text2music',
  caption: 'Quiet piano instrumental',
  lyrics: '[Instrumental]',
  duration: 20,
  instrumental: true,
  seed: 42,
};
const listen = async (server) => {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${server.address().port}`;
};
async function harness(t, scenario = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'musiccraft-cloud-test-'));
  const captured = { submissions: [], downloads: [], cancels: 0, polls: 0 };
  let provider;
  const fake = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const send = (value, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    if (req.url === '/audio') {
      captured.downloads.push(req.headers.authorization);
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      res.end(wav);
      return;
    }
    assert.equal(req.headers.authorization, 'Key fixture-cloud-key');
    if (req.method === 'POST') {
      if (scenario.failure) {
        send({}, scenario.failure);
        return;
      }
      const id = 'job-' + (captured.submissions.length + 1);
      const base = req.url.split('/').slice(0, 3).join('/') + '/requests/' + id;
      captured.submissions.push({ endpoint: req.url, input: JSON.parse(raw), id });
      send({
        request_id: id,
        response_url: provider + base,
        status_url: scenario.foreign
          ? 'https://example.invalid/status'
          : provider + base + '/status',
        cancel_url: provider + base + '/cancel',
      });
    } else if (req.url.endsWith('/cancel')) {
      captured.cancels++;
      send({ status: 'CANCELLATION_REQUESTED' });
    } else if (req.url.endsWith('/status')) {
      captured.polls++;
      send({ status: scenario.pending || captured.polls === 1 ? 'IN_QUEUE' : 'COMPLETED' });
    } else {
      const id = req.url.split('/').at(-1),
        submission = captured.submissions.find((x) => x.id === id);
      if (submission.endpoint === '/openrouter/router') {
        const input = JSON.parse(submission.input.prompt).at(-1);
        const data = JSON.parse(input.content);
        send({
          output: JSON.stringify({
            ...brief,
            status: 'ready',
            summary: 'Plan',
            task: data.mode === 'restyle' ? 'cover' : 'text2music',
            bpm: 90,
            key_scale: 'C Major',
            instruments: ['piano'],
            cover_strength: 0.6,
            preserve: { melody: false, lyrics: false, backing: false },
            questions: [],
            unsupported: [],
            warnings: [],
          }),
        });
      } else
        send({
          audio: scenario.audioString ? provider + '/audio' : { url: provider + '/audio' },
          seed: 42,
        });
    }
  });
  provider = await listen(fake);
  const config = await configuration(root, {
    MUSICCRAFT_DOMESTIC_ONLY: 'false',
    MUREKA_API_KEY: '',
    FAL_KEY: 'fixture-cloud-key',
    PROMPT_FAL_FALLBACK: 'true',
    DEEPSEEK_API_KEY: '',
    OPENAI_API_KEY: '',
    LLM_BASE_URL: '',
    LLM_MODEL: '',
    MUSICCRAFT_MANAGED: 'true',
    ACESTEP_BASE_URL: '',
    VOICE_WORKER_API_KEY: '',
    VOICE_WORKER_BASE_URL: '',
    MUSICCRAFT_DATA_DIR: directory,
    MUSIC_TIMEOUT_MS: '1000',
    MUSIC_POLL_MS: '10',
  });
  config.fal.base = provider;
  config.fal.testDownloadOrigins = [provider];
  config.mediaReady = await mediaReady(config);
  const api = await createAPI(config);
  const app = createServer((req, res) =>
    api.handle(req, res, new URL(req.url, 'http://localhost')),
  );
  const base = await listen(app);
  const request = async (path, body) => {
    const res = await fetch(
      base + '/api/' + path,
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-MusicCraft-Client': 'web' },
            body: JSON.stringify(body),
          },
    );
    return { status: res.status, data: await res.json() };
  };
  t.after(async () => {
    api.close();
    app.closeAllConnections();
    fake.closeAllConnections();
    await Promise.all([
      new Promise((done) => app.close(done)),
      new Promise((done) => fake.close(done)),
    ]);
    await rm(directory, { recursive: true, force: true });
  });
  return { config, captured, request, directory };
}

test('managed catalogue exposes models, rejects shared settings edits, and never exposes credentials', async (t) => {
  const h = await harness(t);
  const result = await h.request('engines');
  assert.equal(result.data.engines.length, 5);
  assert.equal(result.data.engines.find((x) => x.id === 'ace-cloud').ready, true);
  assert.equal(result.data.engines.find((x) => x.id === 'seed-studio').ready, false);
  assert.ok(!JSON.stringify(result).includes('fixture-cloud-key'));
  assert.ok(!JSON.stringify(result).includes(h.config.fal.base));
  assert.equal((await h.request('connections')).status, 403);
  assert.equal(
    (await h.request('connections', { music: { base: 'https://untrusted.invalid' } })).status,
    403,
  );
  const check = await h.request('health?kind=music&engineId=ace-cloud');
  assert.equal(check.data.reachable, false); // Configuration is deliberately not called a live health check.
  assert.equal(h.captured.submissions.length, 0);
});
test('server rejects unsuitable or unactivated engines before spending planner credits', async (t) => {
  const h = await harness(t);
  const input = {
    mode: 'create',
    instruction: 'A sung pop song',
    controls: { duration: 20, seed: 42, instrumental: false },
  };
  assert.equal((await h.request('plans', { ...input, engineId: 'stable-cloud' })).status, 400);
  assert.equal((await h.request('plans', { ...input, engineId: 'seed-studio' })).status, 400);
  h.config.fal.key = '';
  assert.equal((await h.request('plans', { ...input, engineId: 'auto' })).status, 503);
  assert.equal(h.captured.submissions.length, 0);
});
test('cloud planner binds each plan to its own engine and cloud generation returns playable bytes', async (t) => {
  const h = await harness(t);
  const plan = async (engineId) =>
    h.request('plans', {
      mode: 'create',
      engineId,
      instruction: 'Quiet piano music',
      controls: { duration: 20, seed: 42, instrumental: true },
    });
  const a = (await plan('ace-cloud')).data,
    b = (await plan('stable-cloud')).data;
  assert.equal(a.engineId, 'ace-cloud');
  assert.equal(b.engineId, 'stable-cloud');
  const j = (await h.request('jobs', { planId: a.id })).data;
  let result;
  for (let i = 0; i < 100; i++) {
    result = (await h.request('jobs/' + j.id)).data;
    if (['succeeded', 'failed'].includes(result.status)) break;
    await new Promise((done) => setTimeout(done, 10));
  }
  assert.equal(result.status, 'succeeded', result.error);
  assert.equal(result.model, 'ACE-Step · Cloud');
  const submission = h.captured.submissions.find((x) => x.endpoint === '/fal-ai/ace-step');
  assert.equal(submission.input.duration, 20);
  assert.equal(submission.input.lyrics, '[inst]');
  assert.deepEqual(h.captured.downloads, [undefined]); // API keys must never go to media CDNs.
  assert.equal((await h.request('jobs', { planId: a.id })).data.id, j.id);
});
test('Stable Audio has its own input mapping and handles documented string file outputs', async (t) => {
  const h = await harness(t, { audioString: true });
  const result = await generateMusic(
    h.config,
    'stable-cloud',
    brief,
    null,
    new AbortController().signal,
    () => {},
  );
  assert.equal(result.extension, 'wav');
  assert.equal(result.data.subarray(0, 4).toString(), 'RIFF');
  const input = h.captured.submissions[0].input;
  assert.equal(input.seconds_total, 20);
  assert.equal(input.prompt, brief.caption);
  assert.equal(input.tags, undefined);
});
test('remix crops and decodes source audio before uploading, without exposing filesystem paths', async (t) => {
  const h = await harness(t);
  assert.equal(h.config.mediaReady, true, 'npm ci must install ffmpeg-static for the remix path');
  const path = join(h.directory, 'source.wav');
  await writeFile(path, wav);
  await generateMusic(
    h.config,
    'ace-cloud',
    { ...brief, task: 'cover' },
    { path, extension: 'wav' },
    new AbortController().signal,
    () => {},
  );
  const input = h.captured.submissions[0].input;
  assert.equal(h.captured.submissions[0].endpoint, '/fal-ai/ace-step/audio-to-audio');
  assert.match(input.audio_url, /^data:audio\/wav;base64,/);
  assert.equal(input.edit_mode, 'remix');
  assert.ok(!JSON.stringify(input).includes(h.directory));
});
test('cloud authorization/credit failures never trigger demo output or a second paid submission', async (t) => {
  const h = await harness(t, { failure: 402 });
  await assert.rejects(
    generateMusic(h.config, 'ace-cloud', brief, null, new AbortController().signal, () => {}),
    /额度不足/,
  );
  assert.equal(h.captured.downloads.length, 0);
});
test('cancelling cloud waiting sends cancellation to the matching remote task', async (t) => {
  const h = await harness(t, { pending: true });
  const abort = new AbortController();
  const pending = runFal(h.config, 'fal-ai/ace-step', { tags: 'piano' }, abort.signal);
  while (!h.captured.polls) await new Promise((done) => setTimeout(done, 5));
  abort.abort();
  await assert.rejects(pending);
  assert.equal(h.captured.cancels, 1);
});
test('foreign queue and audio URLs are rejected and cloud key changes invalidate plans', async (t) => {
  const h = await harness(t, { foreign: true });
  await assert.rejects(
    runFal(h.config, 'fal-ai/ace-step', { tags: 'piano' }, new AbortController().signal),
    /无效的任务地址/,
  );
  await assert.rejects(
    downloadFal(h.config, 'http://169.254.169.254/latest/meta-data', new AbortController().signal),
    /不受支持/,
  );
  const version = connectionVersion(h.config);
  h.config.fal.key = 'rotated-key';
  assert.notEqual(connectionVersion(h.config), version);
  assert.throws(
    () => selectEngine({ ...h.config, mediaReady: false }, 'ace-cloud', 'restyle'),
    /音频处理/,
  );
});
