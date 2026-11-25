import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the real click handler; no music or LLM credentials are used by this fixture.
async function frontend(t, status = 'ready', title = '') {
  const calls = [],
    listeners = {},
    nodes = new Map(),
    saved = new Map();
  const root = {
    dataset: { agentMode: 'create' },
    querySelector(selector) {
      if (!nodes.has(selector))
        nodes.set(selector, { innerHTML: '', textContent: '', value: '', disabled: false });
      return nodes.get(selector);
    },
    querySelectorAll() {
      return [];
    },
  };
  let libraryReloads = 0;
  const scope = {
    MusicCraftLibrary: {
      load() {
        libraryReloads++;
      },
    },
    setTimeout: (callback) => setTimeout(callback, 1),
    sessionStorage: {
      getItem: (key) => saved.get(key) || null,
      setItem: (key, value) => saved.set(key, value),
    },
    CoLocale: { text: (x) => x, apply() {}, language: 'zh' },
    MusicCatalog: { styles: [] },
    addEventListener() {},
    document: {
      addEventListener(name, fn) {
        (listeners[name] ||= []).push(fn);
      },
      querySelector(selector) {
        return selector.includes('data-agent-mode') ? root : null;
      },
      querySelectorAll(selector) {
        return selector === '[data-agent-mode]' ? [root] : [];
      },
    },
    fetch: async (path, options) => {
      calls.push({ path, body: options?.body ? JSON.parse(options.body) : undefined });
      let value;
      if (path === '/api/status')
        value = {
          engines: [
            {
              id: 'ace-cloud',
              name: 'ACE Fixture',
              modes: ['create'],
              ready: true,
              vocals: true,
              restyleReady: true,
            },
          ],
          planners: [{ id: 'deepseek', name: 'DeepSeek', model: 'fixture-llm', ready: true }],
        };
      else if (path === '/api/plans')
        value = {
          id: 'fixture-plan',
          engineName: 'ACE Fixture',
          brief: {
            status,
            task: 'text2music',
            summary: 'A quiet piano piece',
            instruments: ['piano'],
            duration: 20,
            instrumental: true,
            bpm: null,
            questions: status === 'ready' ? [] : ['Which mood?'],
            unsupported: [],
            warnings: [],
          },
        };
      else if (path === '/api/jobs') value = { id: 'fixture-job', status: 'queued', events: [] };
      else if (path === '/api/jobs/fixture-job')
        value = {
          id: 'fixture-job',
          status: 'succeeded',
          model: 'ACE Fixture',
          audioUrl: '/api/jobs/fixture-job/audio',
          extension: 'wav',
          events: [],
        };
      else throw Error('Unexpected fixture request: ' + path);
      return { ok: true, json: async () => value };
    },
  };
  scope.window = scope;
  vm.runInNewContext(await readFile(new URL('../web/agent-ui.js', import.meta.url), 'utf8'), scope);
  await new Promise((done) => setTimeout(done, 5));
  listeners.input[0]({
    target: {
      closest: () => root,
      hasAttribute: () => false,
      dataset: { agentField: 'instruction' },
      value: 'Quiet piano music',
    },
  });
  if (title)
    listeners.input[0]({
      target: {
        closest: () => root,
        hasAttribute: () => false,
        dataset: { agentField: 'title' },
        value: title,
      },
    });
  const button = { dataset: { agentAction: 'plan' }, closest: () => root };
  const click = {
    target: { closest: (selector) => (selector === '[data-agent-action]' ? button : null) },
  };
  await listeners.click[0](click);
  await new Promise((done) => setTimeout(done, 10));
  return {
    calls,
    nodes,
    html: scope.MusicCraftAgent.workspace(),
    saved,
    scope,
    listeners,
    libraryReloads,
  };
}

test('one Generate click privately plans then queues music, without a Prompt confirmation UI', async (t) => {
  const h = await frontend(t);
  assert.deepEqual(
    h.calls.map((c) => c.path),
    ['/api/status', '/api/plans', '/api/jobs', '/api/jobs/fixture-job'],
  );
  assert.equal(h.calls[2].body.planId, 'fixture-plan');
  assert.equal(h.libraryReloads, 1);
  assert.match(h.nodes.get('[data-agent-output]').innerHTML, /<audio/);
  assert.doesNotMatch(h.html, /generated-prompt|copy-prompt|生成 Prompt|确认 Prompt|提示词版本/);
});
test('clarification is shown to the user and never automatically submitted to a music model', async (t) => {
  const h = await frontend(t, 'needs_clarification');
  assert.deepEqual(
    h.calls.map((c) => c.path),
    ['/api/status', '/api/plans'],
  );
  assert.match(h.nodes.get('[data-agent-output]').innerHTML, /Which mood\?/);
});

test('prepared-track and Agent playback pause each other without pausing the active player', async (t) => {
  const h = await frontend(t);
  const pauses = { main: 0, first: 0, second: 0, remix: 0 };
  const first = {
    pause() {
      pauses.first++;
    },
    closest: () => ({}),
  };
  const second = {
    pause() {
      pauses.second++;
    },
  };
  h.scope.audio = {
    pause() {
      pauses.main++;
    },
  };
  h.scope.studioPlaying = false;
  h.scope.CoRemix = {
    stop() {
      pauses.remix++;
    },
  };
  h.scope.document.querySelectorAll = () => [first, second];
  h.listeners.play[0]({ target: h.scope.audio });
  assert.deepEqual(pauses, { main: 0, first: 1, second: 1, remix: 0 });
  h.listeners.play[0]({ target: first });
  assert.deepEqual(pauses, { main: 1, first: 1, second: 2, remix: 1 });
});

test('optional track name is sent to the job endpoint and kept out of planning', async (t) => {
  const h = await frontend(t, 'ready', '我的翻唱名字');
  assert.equal(h.calls.find((call) => call.path === '/api/jobs').body.title, '我的翻唱名字');
  assert.equal(h.calls.find((call) => call.path === '/api/plans').body.title, undefined);
  assert.match(h.html, /作品名称（可选）/);
});
