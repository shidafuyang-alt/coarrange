import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { configuration } from '../server/config.mjs';
import { createAPI } from '../server/api.mjs';
import { selectPlanner } from '../server/planners.mjs';
import { connectionVersion } from '../server/connections.mjs';

const root = resolve(import.meta.dirname, '..');
const wav = Buffer.alloc(48);
wav.write('RIFF');
wav.write('WAVE', 8);
const listen = async (server) => {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${server.address().port}`;
};
async function harness(t, scenario = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'musiccraft-planner-test-'));
  const captured = { llm: [], music: 0 };
  const fake = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const send = (value, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    if (req.url === '/deepseek/models' || req.url === '/openai/models') {
      captured.health = req.headers.authorization;
      send({ data: [{ id: 'model-fixture' }] });
      return;
    }
    if (req.url === '/deepseek/chat/completions' || req.url === '/openai/responses') {
      const provider = req.url.includes('deepseek') ? 'deepseek' : 'openai';
      const body = JSON.parse(Buffer.concat(chunks).toString());
      captured.llm.push({ provider, body, authorization: req.headers.authorization });
      if (scenario.denied && provider === 'deepseek') {
        send({}, 401);
        return;
      }
      if (scenario.quota && provider === 'openai') {
        send(
          {
            error: {
              code: 'credit_balance_exhausted',
              type: 'insufficient_quota',
              message: 'Sensitive provider diagnostic',
            },
          },
          429,
        );
        return;
      }
      const messages = provider === 'deepseek' ? body.messages : body.input;
      const input = JSON.parse(messages.at(-1).content);
      const value = input.human_feedback
        ? {
            summary: 'User feedback summary',
            verified: ['Audio file was returned'],
            listener_reports: [input.human_feedback],
            unverified: ['Melody quality'],
            suggested_revision: 'Reduce drums.',
          }
        : {
            status: 'ready',
            summary: 'Piano plan',
            task: 'text2music',
            caption: 'Quiet piano and soft strings, instrumental',
            lyrics: '[Instrumental]',
            bpm: 90,
            key_scale: 'C Major',
            instruments: ['piano'],
            cover_strength: 0.65,
            preserve: { melody: false, lyrics: false, backing: false },
            questions: [],
            unsupported: [],
            warnings: [],
          };
      const text = JSON.stringify(value);
      if (provider === 'deepseek')
        send({
          choices: [
            {
              finish_reason: scenario.truncated ? 'length' : 'stop',
              message: { content: scenario.blank ? '   ' : text },
            },
          ],
        });
      else
        send({
          status: scenario.incomplete ? 'incomplete' : 'completed',
          output: [
            {
              type: 'message',
              content: [
                scenario.refusal
                  ? { type: 'refusal', refusal: 'Not available' }
                  : { type: 'output_text', text },
              ],
            },
          ],
        });
    } else if (req.url === '/release_task') {
      captured.music++;
      send({ data: { task_id: 'fixture-task' } });
    } else if (req.url === '/query_result')
      send({
        data: [
          {
            task_id: 'fixture-task',
            status: 1,
            result: JSON.stringify([{ file: '/v1/audio', status: 1 }]),
          },
        ],
      });
    else if (req.url === '/v1/audio') {
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      res.end(wav);
    } else send({}, 404);
  });
  const provider = await listen(fake);
  const config = await configuration(root, {
    MUSICCRAFT_DOMESTIC_ONLY: 'false',
    MUREKA_API_KEY: '',
    MUSICCRAFT_MANAGED: 'true',
    DEEPSEEK_API_KEY: 'deepseek-project-secret',
    OPENAI_API_KEY: 'openai-project-secret',
    PROMPT_PROVIDER: 'deepseek',
    LLM_BASE_URL: '',
    LLM_MODEL: '',
    FAL_KEY: '',
    PROMPT_FAL_FALLBACK: 'false',
    ACESTEP_BASE_URL: scenario.noMusic ? '' : provider,
    VOICE_WORKER_API_KEY: '',
    VOICE_WORKER_BASE_URL: '',
    MUSICCRAFT_DATA_DIR: directory,
    MUSIC_TIMEOUT_MS: '1000',
    MUSIC_POLL_MS: '10',
  });
  config.planners.deepseek.base = provider + '/deepseek';
  config.planners.openai.base = provider + '/openai';
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
            headers: { 'X-MusicCraft-Client': 'web', 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    );
    return { status: res.status, data: await res.json() };
  };
  const plan = async (plannerId = 'auto') =>
    request('plans', {
      mode: 'create',
      plannerId,
      instruction: 'Quiet piano',
      controls: { duration: 20, seed: 42, instrumental: true },
    });
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
  return { config, captured, plan, request, directory };
}

test('DeepSeek uses Chat Completions with project key, JSON mode and explicit non-thinking mode', async (t) => {
  const h = await harness(t);
  const p = await h.plan('deepseek');
  assert.equal(p.status, 201);
  assert.equal(p.data.plannerId, 'deepseek');
  assert.equal(p.data.plannerModel, 'deepseek-flash');
  assert.equal(p.data.engineId, 'ace-local');
  const call = h.captured.llm[0];
  assert.equal(call.authorization, 'Bearer deepseek-project-secret');
  assert.equal(call.body.model, 'deepseek-flash');
  assert.equal(call.body.response_format.type, 'json_object');
  assert.equal(call.body.thinking.type, 'disabled');
  assert.equal(call.body.messages[0].role, 'system');
  assert.ok(!JSON.stringify(p).includes('project-secret'));
});
test('OpenAI uses Responses with its own key and records the exact planning model', async (t) => {
  const h = await harness(t);
  const p = await h.plan('openai');
  assert.equal(p.status, 201);
  assert.equal(p.data.plannerId, 'openai');
  assert.equal(p.data.plannerModel, 'gpt-5.4-mini');
  const call = h.captured.llm[0];
  assert.equal(call.authorization, 'Bearer openai-project-secret');
  assert.equal(call.body.model, 'gpt-5.4-mini');
  assert.equal(call.body.store, false);
  assert.equal(call.body.text.format.type, 'json_object');
  assert.equal(call.body.reasoning.effort, 'none');
  assert.equal(call.body.max_output_tokens, 4000);
  assert.equal(call.body.max_tokens, undefined);
  assert.equal(call.body.messages, undefined);
  assert.match(call.body.instructions, /MusicCraft/);
  assert.ok(
    call.body.input.some((item) => /json/i.test(item.content)),
    'Responses JSON mode requires JSON to appear in input, not only instructions',
  );
});
test('internal planning stays private even when music execution is unavailable', async (t) => {
  const h = await harness(t, { noMusic: true });
  const p = await h.plan('deepseek');
  assert.equal(p.status, 201);
  assert.equal(p.data.brief.caption, undefined);
  assert.equal(p.data.brief.lyrics, undefined);
  assert.equal(p.data.promptVersion, undefined);
  const saved = JSON.parse(await readFile(join(h.directory, p.data.id + '.json'), 'utf8'));
  assert.equal(saved.brief.caption, 'Quiet piano and soft strings, instrumental');
  assert.equal(saved.brief.lyrics, '[Instrumental]');
  assert.ok(saved.promptVersion);
  const job = await h.request('jobs', { planId: p.data.id });
  assert.equal(job.status, 503);
  assert.equal(h.captured.music, 0);
  const manifest = (await h.request('engines')).data;
  assert.equal(manifest.plannerConfigured, true);
  assert.ok(manifest.engines.every((x) => !x.ready));
});
test('parallel provider choices remain isolated and auto selection is explicit and configurable', async (t) => {
  const h = await harness(t);
  const [a, b] = await Promise.all([h.plan('deepseek'), h.plan('openai')]);
  assert.equal(a.data.plannerId, 'deepseek');
  assert.equal(b.data.plannerId, 'openai');
  assert.deepEqual(h.captured.llm.map((x) => x.authorization).sort(), [
    'Bearer deepseek-project-secret',
    'Bearer openai-project-secret',
  ]);
  assert.equal(selectPlanner(h.config, 'auto').id, 'deepseek');
  h.config.defaultPlanner = 'openai';
  assert.equal(selectPlanner(h.config, 'auto').id, 'openai');
});
test('catalogue and health disclose model roles, never provider URLs or keys', async (t) => {
  const h = await harness(t);
  const result = await h.request('status');
  assert.deepEqual(
    result.data.planners.map((x) => x.id),
    ['deepseek', 'openai'],
  );
  assert.ok(result.data.planners.every((x) => x.role === 'prompt-planning'));
  assert.ok(!JSON.stringify(result).includes('project-secret'));
  assert.ok(!JSON.stringify(result).includes(h.config.planners.deepseek.base));
  assert.equal((await h.request('health?kind=llm&plannerId=openai')).status, 200);
  assert.equal(h.captured.health, 'Bearer openai-project-secret');
});
test('an explicitly denied provider never falls back to another provider or a prepared Prompt', async (t) => {
  const h = await harness(t, { denied: true });
  const result = await h.plan('deepseek');
  assert.ok(result.status >= 400);
  assert.equal(h.captured.llm.length, 1);
  assert.equal(h.captured.llm[0].provider, 'deepseek');
  assert.equal(h.captured.music, 0);
});
for (const [scenario, provider] of [
  [{ blank: true }, 'deepseek'],
  [{ truncated: true }, 'deepseek'],
  [{ incomplete: true }, 'openai'],
  [{ refusal: true }, 'openai'],
])
  test(`incomplete, blank and refused Prompt output is rejected: ${JSON.stringify(scenario)}`, async (t) => {
    const h = await harness(t, scenario);
    assert.ok((await h.plan(provider)).status >= 400);
    assert.equal(h.captured.music, 0);
  });
test('listening feedback uses the planner bound to the original plan and keys affect configuration version', async (t) => {
  const h = await harness(t);
  const p = (await h.plan('openai')).data;
  const job = (await h.request('jobs', { planId: p.id })).data;
  let state;
  for (let i = 0; i < 100; i++) {
    state = (await h.request('jobs/' + job.id)).data;
    if (['succeeded', 'failed'].includes(state.status)) break;
    await new Promise((done) => setTimeout(done, 10));
  }
  assert.equal(state.status, 'succeeded', state.error);
  const result = await h.request(`jobs/${job.id}/review`, { feedback: 'Please reduce drums' });
  assert.equal(result.status, 200);
  assert.equal(result.data.plannerId, 'openai');
  assert.equal(h.captured.llm.at(-1).provider, 'openai');
  assert.match(result.data.evidenceBoundary, /未收到音频/);
  const version = connectionVersion(h.config);
  h.config.planners.openai.key = 'rotated';
  assert.notEqual(connectionVersion(h.config), version);
});

test('exhausted project credit produces an actionable error without exposing provider diagnostics', async (t) => {
  const h = await harness(t, { quota: true });
  const result = await h.plan('openai');
  assert.equal(result.status, 503);
  assert.match(result.data.error, /额度不足/);
  assert.ok(!JSON.stringify(result).includes('Sensitive provider diagnostic'));
  assert.equal(h.captured.llm.length, 1);
  assert.equal(h.captured.music, 0);
});
