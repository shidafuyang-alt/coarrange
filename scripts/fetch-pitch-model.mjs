import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = '1.0.1';
const sources = [
  `https://unpkg.com/@spotify/basic-pitch@${version}/model/`,
  `https://cdn.jsdelivr.net/npm/@spotify/basic-pitch@${version}/model/`,
];
const destination = join(dirname(fileURLToPath(import.meta.url)), '../web/vendor/model');
const files = ['model.json', 'group1-shard1of1.bin'];

async function download(name) {
  let lastError;
  for (const base of sources) {
    try {
      const response = await fetch(base + name);
      if (!response.ok) throw new Error(`${response.status} from ${base}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Could not download ${name}: ${lastError.message}`);
}

await mkdir(destination, { recursive: true });
for (const name of files) {
  await writeFile(join(destination, name), await download(name));
  console.log(`Saved web/vendor/model/${name}`);
}
console.log('Basic Pitch weights are local and ignored by git.');
