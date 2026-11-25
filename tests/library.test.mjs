import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { configuration } from '../server/config.mjs';
import { createAPI } from '../server/api.mjs';

test('existing music is backfilled, private prompts omitted, trash/restoration persist without deleting audio', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'musiccraft-library-'));
  const ids = [];
  for (const mode of ['voice', 'restyle', 'create']) {
    const planId = randomUUID(),
      id = randomUUID();
    ids.push(id);
    await writeFile(
      join(directory, planId + '.json'),
      JSON.stringify({
        id: planId,
        kind: 'plan',
        mode,
        brief: {
          summary: 'My <song>',
          caption: 'PRIVATE_PROMPT',
          lyrics: 'PRIVATE_LYRICS',
          duration: 20,
        },
      }),
    );
    await writeFile(
      join(directory, id + '.json'),
      JSON.stringify({
        id,
        kind: 'job',
        planId,
        status: 'succeeded',
        output: id + '.wav',
        extension: 'wav',
        model: 'fixture',
        createdAt: '2026-11-26',
        finishedAt: '2026-11-26',
      }),
    );
    await writeFile(join(directory, id + '.wav'), 'preserved audio');
  }
  const failedId = randomUUID();
  await writeFile(
    join(directory, failedId + '.json'),
    JSON.stringify({ id: failedId, kind: 'job', status: 'failed' }),
  );
  const config = await configuration(directory, { MUSICCRAFT_DATA_DIR: directory });
  let api = await createAPI(config);
  const server = createServer((req, res) =>
    api.handle(req, res, new URL(req.url, 'http://localhost')),
  );
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}/api/library`;
  t.after(async () => {
    api.close();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    await rm(directory, { recursive: true, force: true });
  });
  const list = async () => {
    const response = await fetch(base);
    assert.equal(response.status, 200);
    return response.json();
  };
  const initial = await list();
  assert.equal(initial.items.length, 3);
  assert.deepEqual(
    new Set(initial.items.map((item) => item.mode)),
    new Set(['voice', 'restyle', 'create']),
  );
  assert.doesNotMatch(JSON.stringify(initial), /PRIVATE_|planId|\.wav/);
  assert.ok(initial.items.every((item) => !item.deletedAt));
  assert.equal((await fetch(base + '/' + ids[0], { method: 'DELETE' })).status, 403);
  assert.equal(
    (
      await fetch(base + '/' + ids[0], {
        method: 'DELETE',
        headers: { 'X-MusicCraft-Client': 'web', Origin: 'https://other.invalid' },
      })
    ).status,
    403,
  );
  const mutate = (path, method) =>
    fetch(base + path, { method, headers: { 'X-MusicCraft-Client': 'web' } });
  assert.equal((await mutate('/' + failedId, 'DELETE')).status, 409);
  assert.equal((await mutate('/' + ids[0], 'DELETE')).status, 200);
  assert.equal((await mutate('/' + ids[0], 'DELETE')).status, 200);
  assert.equal(await readFile(join(directory, ids[0] + '.wav'), 'utf8'), 'preserved audio');
  api.close();
  api = await createAPI(config);
  assert.ok((await list()).items.find((item) => item.id === ids[0]).deletedAt);
  assert.equal((await mutate('/' + ids[0] + '/restore', 'POST')).status, 200);
  api.close();
  api = await createAPI(config);
  assert.equal((await list()).items.find((item) => item.id === ids[0]).deletedAt, null);
});

async function frontendLibrary(store = new Map()) {
  const id = 'a'.repeat(36),
    calls = [];
  let item = {
    id,
    mode: 'voice',
    title: '<img onerror=bad>',
    model: 'Seed-VC',
    duration: 20,
    deletedAt: null,
  };
  const scope = {
    Event: class {},
    dispatchEvent() {},
    addEventListener() {},
    localStorage: {
      getItem: (key) => store.get(key),
      setItem: (key, value) => store.set(key, value),
    },
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      if (options.method === 'DELETE') item = { ...item, deletedAt: '2026-11-26' };
      if (options.method === 'POST') item = { ...item, deletedAt: null };
      return {
        ok: true,
        json: async () =>
          options.method === 'GET' ? { items: [item, { id: 'invalid', mode: 'voice' }] } : item,
      };
    },
  };
  scope.window = scope;
  vm.runInNewContext(await readFile(new URL('../web/library.js', import.meta.url), 'utf8'), scope);
  return { library: scope.MusicCraftLibrary, calls, store };
}

test('personal tracks can be listed, deleted and restored through the library client', async () => {
  const h = await frontendLibrary();
  await h.library.load();
  const [key, track] = h.library.tracks()[0];
  assert.equal(h.library.tracks().length, 1);
  assert.equal(track.title, '<img onerror=bad>');
  assert.match(track.src, /^\/api\/jobs\/[a-f0-9-]{36}\/audio$/);
  assert.equal(track.generated, true);
  await h.library.change(key);
  assert.equal(h.library.tracks()[0][1].deleted, true);
  await h.library.load();
  assert.equal(h.library.tracks()[0][1].deleted, true);
  await h.library.change(key, true);
  assert.equal(h.library.tracks()[0][1].deleted, false);
  assert.ok(
    h.calls
      .filter((call) => call.method !== 'GET')
      .every((call) => call.headers['X-MusicCraft-Client'] === 'web'),
  );
});

test('hiding and restoring a demo survives browser reload and never deletes shared audio', async () => {
  const h = await frontendLibrary();
  await h.library.change('pop');
  const reopened = await frontendLibrary(h.store);
  assert.equal(reopened.library.hidden('pop'), true);
  await reopened.library.change('pop', true);
  assert.equal(reopened.library.hidden('pop'), false);
  assert.equal(h.calls.length + reopened.calls.length, 0);
});
