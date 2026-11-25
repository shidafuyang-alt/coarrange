import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const settle = () => new Promise((done) => setImmediate(done));
async function remix(deferred) {
  const listeners = {},
    frames = [],
    sources = [],
    gains = [],
    fetched = [];
  const pauses = { main: 0, agent: 0 };
  const root = { outerHTML: '' };
  let context;
  class AudioContext {
    constructor() {
      context = this;
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
    }
    createGain() {
      const node = {
        gain: {
          value: 0,
          cancelScheduledValues() {},
          setTargetAtTime(value) {
            this.value = value;
          },
        },
        connect(next) {
          return next;
        },
      };
      gains.push(node);
      return node;
    }
    createDynamicsCompressor() {
      return {
        threshold: {},
        ratio: {},
        attack: {},
        connect(next) {
          return next;
        },
      };
    }
    async decodeAudioData() {
      return {};
    }
    createBufferSource() {
      const source = {
        connect(next) {
          return next;
        },
        start() {
          this.started = true;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(source);
      return source;
    }
  }
  const document = {
    activeElement: { tagName: 'BODY' },
    addEventListener(name, fn) {
      listeners[name] = fn;
    },
    querySelector(selector) {
      return selector === '.remix-deck' ? root : null;
    },
    querySelectorAll(selector) {
      return selector === '[data-agent-output] audio'
        ? [
            {
              pause() {
                pauses.agent++;
              },
            },
          ]
        : [];
    },
  };
  const scope = {
    AudioContext,
    document,
    CoLocale: { text: (value) => value },
    icon: () => '',
    icons() {},
    toast() {},
    studioPlaying: false,
    audio: {
      volume: 1,
      pause() {
        pauses.main++;
      },
    },
    requestAnimationFrame(fn) {
      frames.push(fn);
    },
    addEventListener() {},
    fetch: async (url) => {
      fetched.push(url);
      if (url.endsWith('.json')) return { json: async () => ({ firstBeat: 0, notes: [] }) };
      if (deferred) await deferred;
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
    },
  };
  scope.window = scope;
  vm.runInNewContext(
    await readFile(new URL('../web/remix-deck.js', import.meta.url), 'utf8'),
    scope,
  );
  return {
    scope,
    document,
    listeners,
    frames,
    sources,
    gains,
    fetched,
    pauses,
    context: () => context,
  };
}

test('comparison key preserves form typing and starts seven tracks without Agent audio overlap', async () => {
  const h = await remix();
  h.document.activeElement.tagName = 'TEXTAREA';
  h.listeners.keydown({ key: '7' });
  assert.equal(h.fetched.length, 0);
  h.document.activeElement.tagName = 'BODY';
  h.listeners.keydown({ key: '7' });
  await settle();
  assert.equal(h.scope.CoRemix.playing, true);
  assert.equal(h.sources.length, 7);
  assert.equal(h.pauses.agent, 1);
  assert.equal(h.pauses.main, 1);
  assert.deepEqual(
    h.gains.slice(1).map((node) => node.gain.value),
    [0, 0, 0, 0, 0, 0, 1],
  );
  h.scope.CoRemix.stop();
  assert.ok(h.sources.every((source) => source.stopped));
});

test('Auto-DJ cycles the six aligned versions and excludes the early AI comparison', async () => {
  const h = await remix();
  await h.scope.CoRemix.mount();
  h.listeners.click({
    target: {
      closest: (selector) => (selector === '[data-remix]' ? { dataset: { remix: 'auto' } } : null),
    },
  });
  await settle();
  const selected = new Set();
  for (let index = 0; index < 15; index++) {
    h.context().currentTime = 1 + index * 2.5;
    h.frames.shift()();
    const active = h.gains.slice(1).findIndex((node) => node.gain.value === 1);
    assert.ok(active >= 0 && active < 6);
    selected.add(active);
  }
  assert.equal(selected.size, 6);
  h.scope.CoRemix.stop();
});

test('stopping the remix during loading prevents it restarting over Agent playback', async () => {
  let release;
  const h = await remix(
    new Promise((done) => {
      release = done;
    }),
  );
  h.listeners.keydown({ key: '7' });
  h.scope.CoRemix.stop();
  release();
  await settle();
  assert.equal(h.sources.length, 0);
  assert.equal(h.scope.CoRemix.playing, false);
});
