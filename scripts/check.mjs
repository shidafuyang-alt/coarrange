import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'web');
const files = (await readdir(web)).filter((name) => name.endsWith('.js'));
for (const name of files) {
  const result = spawnSync(process.execPath, ['--check', join(web, name)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

const sandbox = { window: {} };
vm.runInNewContext(await readFile(join(web, 'music-catalog.js'), 'utf8'), sandbox);
const { styles, instruments } = sandbox.window.MusicCatalog;
assert.equal(new Set(styles.map((style) => style.id)).size, styles.length);
assert.equal(new Set(instruments.map((instrument) => instrument.id)).size, instruments.length);
assert.equal(styles.length, 13);
assert.equal(instruments.length, 31);

async function asset(path) {
  assert.ok((await stat(join(web, 'assets', path))).size > 0, `Empty asset: ${path}`);
}

for (const style of styles) {
  assert.ok(style.parts.length <= 8);
  for (const part of style.parts)
    assert.ok(instruments.some((instrument) => instrument.id === part));
  const prepared = { pop: 'pop.m4a', classical: 'classical.m4a', soft: 'classical-soft.m4a' };
  await asset(prepared[style.id] || `theme-${style.id}.m4a`);
}
for (const instrument of instruments) {
  if (instrument.id === 'drums') continue;
  const notes =
    instrument.id === 'erhu' ? ['A4.wav', 'E5.wav'] : [2, 3, 4, 5, 6].map((n) => `C${n}.mp3`);
  for (const note of notes) await asset(`instruments/${instrument.id}-${note}`);
}
for (const name of [
  'song-original.m4a',
  'song-classical.m4a',
  'song-alternative.m4a',
  'score.json',
]) {
  await asset(name);
}
const score = JSON.parse(await readFile(join(web, 'assets/score.json'), 'utf8'));
assert.ok(score.notes.length > 0 && score.tracks.length > 0);
assert.ok(score.notes.every((note) => Number.isFinite(note.time) && note.duration > 0));
console.log(
  `Passed: ${files.length} scripts, ${styles.length} styles, ${instruments.length} sounds, and required audio/score assets.`,
);
