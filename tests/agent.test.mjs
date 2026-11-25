import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { configuration } from '../server/config.mjs';
import { createAPI } from '../server/api.mjs';

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
const listen = async (server) => {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${server.address().port}`;
};

async function harness(t, scenario = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'musiccraft-agent-test-'));
  const captured = { submissions: 0, prompts: [], polls: 0 };
  const fake = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const send = (value, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    if (req.url === '/v1/chat/completions') {
      const body = JSON.parse(raw);
      captured.prompts.push(body);
      if (scenario.badJSON) {
        send({ choices: [{ message: { content: 'invalid' } }] });
        return;
      }
      const input = JSON.parse(body.messages.at(-1).content);
      if (input.human_feedback) {
        send({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: '根据用户反馈整理',
                  verified: ['已返回音频文件'],
                  listener_reports: [input.human_feedback],
                  unverified: ['旋律保留'],
                  suggested_revision: '保持吉他，减少鼓的存在感。',
                }),
              },
            },
          ],
        });
        return;
      }
      const brief = {
        status: scenario.unsupported ? 'unsupported' : 'ready',
        summary: '制作安静的音乐',
        questions: [],
        unsupported: scenario.unsupported ? ['个人声音克隆'] : [],
        task: scenario.wrongTask
          ? 'shell'
          : input.mode === 'voice'
            ? 'voice_cover'
            : input.mode === 'restyle'
              ? 'cover'
              : 'text2music',
        caption: 'Quiet acoustic guitar and piano, instrumental.',
        lyrics: '[Instrumental]',
        instrumental: true,
        instruments: ['guitar', 'piano'],
        duration: 999,
        bpm: 90,
        key_scale: 'C Major',
        seed: 999,
        cover_strength: 0.65,
        preserve: {
          melody: input.mode === 'restyle',
          lyrics: false,
          backing: false,
        },
        warnings: [],
        assetId: '/etc/passwd',
      };
      send({ choices: [{ message: { content: JSON.stringify(brief) } }] });
    } else if (req.url === '/v1/models') {
      send({ data: [{ id: 'fixture-model-a' }, { id: 'fixture-model-b' }] });
    } else if (req.url === '/v1/jobs') {
      captured.voiceUpload = raw;
      send({ id: 'f'.repeat(32), status: 'queued' }, 202);
    } else if (req.url === '/v1/jobs/' + 'f'.repeat(32) + '/cancel') {
      captured.voiceCancelled = true;
      send({ status: 'canceled' });
    } else if (req.url === '/v1/jobs/' + 'f'.repeat(32)) {
      send({
        status: scenario.pending ? 'running' : 'succeeded',
        stage: 'convert',
        message: 'fixture conversion',
        artifacts: Object.fromEntries(
          ['result', 'source_clip', 'original_vocals', 'converted_vocals', 'accompaniment'].map(
            (key) => [key, '/v1/jobs/' + 'f'.repeat(32) + '/audio/' + key],
          ),
        ),
      });
    } else if (req.url.startsWith('/v1/jobs/') && req.url.includes('/audio/')) {
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      res.end(wav);
    } else if (req.url === '/release_task') {
      captured.submissions++;
      captured.release = raw;
      captured.multipart = req.headers['content-type']?.startsWith('multipart/form-data');
      if (scenario.submitFailure) {
        send({}, 500);
        return;
      }
      send({ code: 200, data: { task_id: 'fixture-task' } });
    } else if (req.url === '/query_result') {
      captured.polls++;
      const status = scenario.pending || captured.polls === 1 ? 0 : scenario.failed ? 2 : 1;
      send({
        code: 200,
        data: [
          {
            task_id: 'fixture-task',
            status,
            result: JSON.stringify([
              {
                file: scenario.foreignURL
                  ? 'http://example.invalid/v1/audio?path=x'
                  : '/v1/audio?path=fixture.wav',
                status: 1,
                dit_model: 'fixture-not-a-real-model',
                seed_value: '42',
              },
            ]),
          },
        ],
      });
    } else if (req.url.startsWith('/v1/audio')) {
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      res.end(scenario.invalidAudio ? Buffer.from('{}') : wav);
    } else if (req.url === '/health') send({ code: 200, data: { status: 'ok' } });
    else send({}, 404);
  });
  const provider = await listen(fake);
  const config = await configuration(root, {
    MUSICCRAFT_DOMESTIC_ONLY: 'false',
    MUREKA_API_KEY: '',
    FAL_KEY: '',
    MUSICCRAFT_MANAGED: 'false',
    DEEPSEEK_API_KEY: '',
    OPENAI_API_KEY: '',
    PROMPT_FAL_FALLBACK: 'false',
    LLM_BASE_URL: provider + '/v1',
    LLM_MODEL: 'fixture-llm',
    LLM_API_KEY: 'test-secret',
    ACESTEP_BASE_URL: provider,
    VOICE_WORKER_API_KEY: '',
    VOICE_WORKER_BASE_URL: provider,
    MUSICCRAFT_DATA_DIR: directory,
    MUSIC_POLL_MS: '10',
    MUSIC_TIMEOUT_MS: '1000',
  });
  const api = await createAPI(config);
  const server = createServer(async (req, res) => {
    await api.handle(req, res, new URL(req.url, 'http://localhost'));
  });
  const base = await listen(server);
  t.after(async () => {
    api.close();
    server.closeAllConnections();
    fake.closeAllConnections();
    await Promise.all([
      new Promise((done) => server.close(done)),
      new Promise((done) => fake.close(done)),
    ]);
    await new Promise((done) => setTimeout(done, 50));
    await rm(directory, { recursive: true, force: true });
  });
  const request = async (path, body, headers = {}) => {
    const response = await fetch(
      base + '/api/' + path,
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: {
              'X-MusicCraft-Client': 'web',
              'Content-Type': 'application/json',
              ...headers,
            },
            body: Buffer.isBuffer(body) ? body : JSON.stringify(body),
          },
    );
    return { status: response.status, data: await response.json() };
  };
  const plan = async (extra = {}) =>
    request('plans', {
      mode: 'create',
      instruction: '安静的木吉他纯音乐',
      controls: { duration: 20, seed: 42, instrumental: true },
      ...extra,
    });
  const finished = async (id) => {
    for (let i = 0; i < 150; i++) {
      const { data } = await request('jobs/' + id);
      if (['succeeded', 'failed', 'cancelled'].includes(data.status)) return data;
      await new Promise((done) => setTimeout(done, 15));
    }
    throw Error('fixture job timed out');
  };
  return { request, plan, captured, finished, base, provider, directory };
}

test('real HTTP contract: planner, generation, range playback, review, revision, idempotence', async (t) => {
  const h = await harness(t);
  const { data: plan, status } = await h.plan();
  assert.equal(status, 201);
  assert.equal(plan.brief.duration, 20);
  assert.equal(plan.brief.seed, 42);
  assert.equal(plan.assetId, null);
  assert.equal(plan.brief.assetId, undefined);
  assert.equal(plan.promptVersion, undefined);
  assert.equal(plan.brief.caption, undefined);
  assert.equal(plan.brief.lyrics, undefined);
  assert.equal(h.captured.prompts[0].messages[0].role, 'system');
  const { data: job } = await h.request('jobs', { planId: plan.id });
  assert.equal((await h.finished(job.id)).status, 'succeeded');
  assert.equal((await h.request('jobs', { planId: plan.id })).data.id, job.id);
  assert.equal(h.captured.submissions, 1);
  assert.equal(JSON.parse(h.captured.release).task_type, 'text2music');
  assert.equal(
    JSON.parse(h.captured.release).prompt,
    'Quiet acoustic guitar and piano, instrumental.',
  );
  assert.equal(JSON.parse(h.captured.release).use_random_seed, false);
  const audio = await fetch(h.base + `/api/jobs/${job.id}/audio`, {
    headers: { Range: 'bytes=0-3' },
  });
  assert.equal(audio.status, 206);
  assert.equal(await audio.text(), 'RIFF');
  const review = await h.request(`jobs/${job.id}/review`, {
    feedback: '鼓太响',
  });
  assert.equal(review.status, 200);
  assert.match(review.data.evidenceBoundary, /未收到音频/);
  const revision = await h.plan({
    parentPlanId: plan.id,
    instruction: '鼓少一些',
  });
  assert.equal(revision.data.parentPlanId, plan.id);
  assert.ok(h.captured.prompts.at(-1).messages.at(-1).content.includes('previous_brief'));
  const statusResult = await h.request('status');
  assert.ok(!JSON.stringify(statusResult).includes('test-secret'));
});
test('uploaded source is sent as multipart to cover, never a model-provided path', async (t) => {
  const h = await harness(t);
  const { data: asset } = await h.request('assets', wav);
  const { data: plan } = await h.plan({ mode: 'restyle', assetId: asset.id });
  const { data: job } = await h.request('jobs', { planId: plan.id });
  assert.equal((await h.finished(job.id)).status, 'succeeded');
  assert.equal(h.captured.multipart, true);
  assert.match(h.captured.release, /name="src_audio"/);
  assert.match(h.captured.release, /cover/);
  assert.ok(!h.captured.release.includes('/etc/passwd'));
});
test('unsupported request cannot execute', async (t) => {
  const h = await harness(t, { unsupported: true });
  const { data } = await h.plan();
  assert.equal((await h.request('jobs', { planId: data.id })).status, 409);
  assert.equal(h.captured.submissions, 0);
});
for (const scenario of ['badJSON', 'wrongTask'])
  test(`invalid LLM output rejected: ${scenario}`, async (t) => {
    const h = await harness(t, { [scenario]: true });
    assert.ok((await h.plan()).status >= 400);
    assert.equal(h.captured.submissions, 0);
  });
for (const scenario of ['failed', 'submitFailure', 'foreignURL', 'invalidAudio'])
  test(`provider failure never becomes demo success: ${scenario}`, async (t) => {
    const h = await harness(t, { [scenario]: true });
    const { data: p } = await h.plan(),
      { data: j } = await h.request('jobs', { planId: p.id });
    const job = await h.finished(j.id);
    assert.equal(job.status, 'failed');
    assert.equal(job.audioUrl, null);
  });
test('cancel interrupts waiting and never exposes an output', async (t) => {
  const h = await harness(t, { pending: true });
  const { data: p } = await h.plan(),
    { data: j } = await h.request('jobs', { planId: p.id });
  const cancelled = await h.request(`jobs/${j.id}/cancel`, {});
  assert.equal(cancelled.data.status, 'cancelled');
  assert.equal((await h.request(`jobs/${j.id}/audio`)).status, 409);
});
test('validate bounds, source, upload type, and cross-origin writes', async (t) => {
  const h = await harness(t);
  assert.equal((await h.plan({ controls: { duration: 999 } })).status, 400);
  assert.equal((await h.plan({ mode: 'restyle' })).status, 400);
  assert.equal((await h.request('assets', Buffer.from('not audio'))).status, 400);
  assert.equal((await h.request('plans', {}, { Origin: 'https://untrusted.invalid' })).status, 403);
  assert.equal(h.captured.prompts.length, 0);
});
test('model settings hide keys, discover real models and invalidate old plans', async (t) => {
  const h = await harness(t);
  const { data: p } = await h.plan();
  const current = (await h.request('connections')).data;
  assert.equal(current.llm.hasKey, true);
  assert.ok(!JSON.stringify(current).includes('test-secret'));
  const listed = await h.request('models?kind=music');
  assert.deepEqual(listed.data.models, ['fixture-model-a', 'fixture-model-b']);
  const saved = await h.request('connections', {
    llm: { ...current.llm, key: '' },
    music: { ...current.music, model: 'fixture-model-b', key: 'music-private-key' },
    voice: { ...current.voice, key: '' },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.llm.hasKey, true);
  assert.ok(!JSON.stringify(saved).includes('music-private-key'));
  assert.equal((await h.request('jobs', { planId: p.id })).status, 409);
  const fresh = (await h.plan()).data;
  const job = (await h.request('jobs', { planId: fresh.id })).data;
  assert.equal((await h.finished(job.id)).status, 'succeeded');
  assert.equal(JSON.parse(h.captured.release).model, 'fixture-model-b');
  const { readFile } = await import('node:fs/promises');
  assert.equal(
    JSON.parse(await readFile(join(h.directory, 'connections.json'), 'utf8')).music.model,
    'fixture-model-b',
  );
});
test('changing an endpoint clears a saved key instead of forwarding it to a new host', async (t) => {
  const h = await harness(t);
  const current = (await h.request('connections')).data;
  const saved = await h.request('connections', {
    llm: { ...current.llm, base: h.provider + '/different-v1', key: '' },
    music: current.music,
    voice: current.voice,
  });
  assert.equal(saved.data.llm.hasKey, false);
  assert.equal(
    (
      await h.request('connections', {
        llm: { ...current.llm, base: 'file:///private/key' },
        music: current.music,
        voice: current.voice,
      })
    ).status,
    400,
  );
});
test('voice source/reference upload, async conversion, stems and range playback', async (t) => {
  const h = await harness(t);
  const source = (await h.request('assets', wav)).data,
    reference = (await h.request('assets', wav)).data;
  const p = (
    await h.plan({
      mode: 'voice',
      assetId: source.id,
      referenceId: reference.id,
      clipStart: 15,
      vocalGain: -2,
    })
  ).data;
  assert.equal(p.brief.task, 'voice_cover');
  assert.equal(p.brief.instrumental, false);
  assert.deepEqual(p.brief.preserve, { melody: true, lyrics: true, backing: true });
  const job = (await h.request('jobs', { planId: p.id })).data;
  const done = await h.finished(job.id);
  assert.equal(done.status, 'succeeded');
  assert.equal(done.model, 'Seed-VC + Demucs');
  assert.match(h.captured.voiceUpload, /name="source"/);
  assert.match(h.captured.voiceUpload, /name="reference"/);
  assert.match(h.captured.voiceUpload, /"clip_start":15/);
  const stem = await fetch(h.base + `/api/jobs/${job.id}/audio/converted_vocals`, {
    headers: { Range: 'bytes=0-3' },
  });
  assert.equal(stem.status, 206);
  assert.equal(await stem.text(), 'RIFF');
});
test('voice plan needs reference and bounded clip controls', async (t) => {
  const h = await harness(t);
  const source = (await h.request('assets', wav)).data;
  assert.equal((await h.plan({ mode: 'voice', assetId: source.id })).status, 400);
  assert.equal(
    (await h.plan({ mode: 'voice', assetId: source.id, referenceId: source.id, clipStart: -1 }))
      .status,
    400,
  );
  assert.equal(
    (
      await h.plan({
        mode: 'voice',
        assetId: source.id,
        referenceId: source.id,
        controls: { duration: 60 },
      })
    ).status,
    400,
  );
});
test('voice cancellation is forwarded to the dedicated worker', async (t) => {
  const h = await harness(t, { pending: true });
  const asset = (await h.request('assets', wav)).data;
  const p = (await h.plan({ mode: 'voice', assetId: asset.id, referenceId: asset.id })).data;
  const job = (await h.request('jobs', { planId: p.id })).data;
  for (let i = 0; i < 20 && !h.captured.voiceUpload; i++)
    await new Promise((r) => setTimeout(r, 10));
  await h.request(`jobs/${job.id}/cancel`, {});
  for (let i = 0; i < 20 && !h.captured.voiceCancelled; i++)
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(h.captured.voiceCancelled, true);
});
