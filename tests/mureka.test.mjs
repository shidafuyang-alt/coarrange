import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { configuration } from '../server/config.mjs';
import { engineCatalog, selectEngine, generateMusic } from '../server/engines.mjs';
import { plannerCatalog, selectPlanner } from '../server/planners.mjs';
import { connectionVersion } from '../server/connections.mjs';
import { downloadMureka } from '../server/mureka.mjs';
import { mediaReady } from '../server/media.mjs';

const brief = {
  task: 'text2music',
  caption: 'Quiet piano instrumental',
  lyrics: '[Instrumental]',
  duration: 10,
  instrumental: true,
  seed: 42,
};
function wave(seconds = 12) {
  const wav = Buffer.alloc(44 + 16000 * 2 * seconds);
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
  wav.writeUInt32LE(wav.length - 44, 40);
  return wav;
}
async function harness(t, scenario = {}) {
  const captured = { submissions: [], uploads: [], downloads: [], queries: 0 };
  let base;
  const fake = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const send = (data, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    if (req.url === '/audio') {
      captured.downloads.push(req.headers.authorization);
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      res.end(wave());
      return;
    }
    assert.equal(req.headers.authorization, 'Bearer fixture-mureka-key');
    if (req.url === '/v1/files/upload') {
      captured.uploads.push({ raw, contentType: req.headers['content-type'] });
      send({ id: 'uploaded-1' });
    } else if (req.method === 'POST') {
      captured.submissions.push({ path: req.url, body: JSON.parse(raw.toString()) });
      if (scenario.error)
        send({ error: { message: 'Do not expose fixture-mureka-key' } }, scenario.error);
      else send({ id: 'task-1', status: 'preparing' });
    } else if (req.url.includes('/query/')) {
      captured.queries++;
      send({
        id: 'task-1',
        status: scenario.pending ? 'queued' : scenario.failed ? 'failed' : 'succeeded',
        failed_reason: 'private provider detail',
        choices: [{ url: base + '/audio' }],
      });
    } else send({}, 404);
  });
  await new Promise((done) => fake.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${fake.address().port}`;
  t.after(() => {
    fake.closeAllConnections();
    return new Promise((done) => fake.close(done));
  });
  const config = await configuration(resolve(import.meta.dirname, '..'), {
    MUSICCRAFT_DOMESTIC_ONLY: 'true',
    MUREKA_API_KEY: 'fixture-mureka-key',
    DEEPSEEK_API_KEY: '',
    OPENAI_API_KEY: '',
    FAL_KEY: '',
    LLM_BASE_URL: '',
    LLM_MODEL: '',
    PROMPT_FAL_FALLBACK: 'false',
    ACESTEP_BASE_URL: '',
    VOICE_WORKER_API_KEY: '',
    VOICE_WORKER_BASE_URL: '',
    MUSIC_POLL_MS: '10',
    MUSIC_TIMEOUT_MS: '5000',
  });
  config.mureka.base = base;
  config.mureka.testDownloadOrigins = [base];
  config.mediaReady = await mediaReady(config);
  assert.equal(config.mediaReady, true);
  return { config, captured };
}
const signal = () => new AbortController().signal;

test('domestic mode selects Mureka and refuses overseas providers even with configured credentials', async (t) => {
  const { config } = await harness(t);
  config.fal.key = 'overseas-key';
  config.planners.openai.key = 'overseas-key';
  assert.deepEqual(
    engineCatalog(config).map((e) => e.id),
    ['mureka-cloud', 'ace-local', 'seed-studio'],
  );
  assert.deepEqual(
    plannerCatalog(config).map((e) => e.id),
    ['deepseek'],
  );
  assert.throws(() => selectPlanner(config), /尚未开通/);
  assert.throws(() => selectPlanner(config, 'openai'), /无效/);
  assert.throws(() => selectEngine(config, 'ace-cloud', 'create'), /不支持/);
  assert.equal(selectEngine(config, 'auto', 'create').id, 'mureka-cloud');
  assert.throws(
    () => selectEngine({ ...config, mediaReady: false }, 'mureka-cloud', 'create'),
    /尚未开通/,
  );
  const version = connectionVersion(config);
  config.mureka.key += '-rotated';
  assert.notEqual(version, connectionVersion(config));
});

test('Mureka instrumental uses n=1 and no unsupported seed/duration, then produces a real cropped MP3', async (t) => {
  const { config, captured } = await harness(t);
  const result = await generateMusic(config, 'mureka-cloud', brief, null, signal());
  assert.equal(result.extension, 'mp3');
  assert.equal(result.seed, null);
  assert.equal(result.providerTaskId, 'task-1');
  assert.ok(result.data.length > 1000);
  assert.deepEqual(captured.submissions, [
    {
      path: '/v1/instrumental/generate',
      body: { model: 'mureka-9.5', prompt: brief.caption, n: 1 },
    },
  ]);
  assert.deepEqual(captured.downloads, [undefined]);
});

test('Mureka vocal creation sends internal lyrics only to the song endpoint', async (t) => {
  const { config, captured } = await harness(t);
  await generateMusic(
    config,
    'mureka-cloud',
    { ...brief, instrumental: false, lyrics: '[Verse]\n清晨的风' },
    null,
    signal(),
  );
  assert.equal(captured.submissions[0].path, '/v1/song/generate');
  assert.equal(captured.submissions[0].body.lyrics, '[Verse]\n清晨的风');
  assert.equal(captured.uploads.length, 0);
});

test('Mureka remix uploads actual MP3 multipart and preserves source lyrics by omitting invented text', async (t) => {
  const { config, captured } = await harness(t);
  await generateMusic(
    config,
    'mureka-cloud',
    { ...brief, task: 'cover', instrumental: false, lyrics: 'invented text' },
    { data: wave() },
    signal(),
  );
  assert.equal(captured.uploads.length, 1);
  assert.match(captured.uploads[0].contentType, /^multipart\/form-data; boundary=/);
  const upload = captured.uploads[0].raw.toString('latin1');
  assert.match(upload, /name="purpose"\r\n\r\nremix/);
  assert.match(upload, /filename="source.mp3"/);
  assert.match(upload, /Content-Type: audio\/mpeg/);
  const submission = captured.submissions[0];
  assert.equal(submission.path, '/v1/song/remix');
  assert.equal(submission.body.upload_audio_id, 'uploaded-1');
  assert.equal(submission.body.lyrics, undefined);
  assert.equal(submission.body.n, 1);
});

test('short remix and excessive prompts are rejected before paid submission or upload', async (t) => {
  const { config, captured } = await harness(t);
  await assert.rejects(
    generateMusic(config, 'mureka-cloud', { ...brief, task: 'cover' }, { data: wave(2) }, signal()),
    /至少 10 秒/,
  );
  await assert.rejects(
    generateMusic(config, 'mureka-cloud', { ...brief, caption: 'x'.repeat(1025) }, null, signal()),
    /超出/,
  );
  assert.equal(captured.submissions.length, 0);
  assert.equal(captured.uploads.length, 0);
});

test('provider failures are sanitized and paid submissions are not retried', async (t) => {
  const { config, captured } = await harness(t, { error: 402 });
  await assert.rejects(generateMusic(config, 'mureka-cloud', brief, null, signal()), (error) => {
    assert.match(error.message, /额度不足/);
    assert.ok(!error.message.includes('fixture-mureka-key'));
    return true;
  });
  assert.equal(captured.submissions.length, 1);
});

test('cancel stops Mureka polling without inventing an undocumented remote cancellation call', async (t) => {
  const { config, captured } = await harness(t, { pending: true });
  const abort = new AbortController();
  await assert.rejects(
    generateMusic(config, 'mureka-cloud', brief, null, abort.signal, (status) => {
      if (status === 'queued') abort.abort();
    }),
    /abort/i,
  );
  const queries = captured.queries;
  await new Promise((done) => setTimeout(done, 30));
  assert.equal(captured.queries, queries);
  assert.equal(captured.submissions.length, 1);
});

test('Mureka rejects foreign result URLs before network access', async (t) => {
  const { config } = await harness(t);
  for (const url of [
    'https://example.com/song.mp3',
    'http://cdn.mureka.ai/song.mp3',
    'https://cdn.mureka.ai.evil.test/a',
    'https://key@cdn.mureka.ai/a',
  ])
    await assert.rejects(downloadMureka(config, url, signal()), /不受支持/);
});
