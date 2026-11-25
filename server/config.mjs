import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
let bundledFFmpeg = '';
try {
  bundledFFmpeg = createRequire(import.meta.url)('ffmpeg-static') || '';
} catch {}

export async function configuration(root, overrides = {}) {
  const file = {};
  try {
    for (const line of (await readFile(resolve(root, '.env'), 'utf8')).split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match) file[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const env = { ...file, ...process.env, ...overrides };
  const url = (name) => {
    if (!env[name]) return '';
    const value = new URL(env[name]);
    if (
      !['http:', 'https:'].includes(value.protocol) ||
      value.username ||
      value.password ||
      value.search ||
      value.hash
    )
      throw Error(`${name} must be an HTTP(S) base URL without credentials or query.`);
    return value.href.replace(/\/$/, '');
  };
  const number = (name, fallback, min, max) => {
    const value = Number(env[name] || fallback);
    if (!Number.isInteger(value) || value < min || value > max) throw Error(`Invalid ${name}`);
    return value;
  };
  return {
    root,
    domesticOnly: env.MUSICCRAFT_DOMESTIC_ONLY === 'true',
    defaultPlanner: env.PROMPT_PROVIDER || 'deepseek',
    planners: {
      deepseek: {
        base: 'https://api.deepseek.com',
        key: env.DEEPSEEK_API_KEY || '',
        model: env.DEEPSEEK_MODEL || 'deepseek-flash',
        provider: 'deepseek',
        json: true,
      },
      openai: {
        base: 'https://api.openai.com/v1',
        key: env.OPENAI_API_KEY || '',
        model: env.OPENAI_MODEL || 'gpt-5.4-mini',
        provider: 'openai',
        json: true,
      },
    },
    managed: env.MUSICCRAFT_MANAGED !== 'false',
    ffmpeg: env.MUSICCRAFT_FFMPEG || bundledFFmpeg || 'ffmpeg',
    fal: { key: env.FAL_KEY || '', base: 'https://queue.fal.run' },
    mureka: {
      key: env.MUREKA_API_KEY || '',
      base: 'https://api.mureka.ai',
      model: 'mureka-9.5',
    },
    data: resolve(root, env.MUSICCRAFT_DATA_DIR || '.musiccraft-data'),
    llm: {
      base:
        url('LLM_BASE_URL') ||
        (env.PROMPT_FAL_FALLBACK === 'true' && env.FAL_KEY ? 'https://queue.fal.run' : ''),
      key: env.LLM_API_KEY || '',
      model:
        env.LLM_MODEL ||
        (env.PROMPT_FAL_FALLBACK === 'true' && env.FAL_KEY
          ? env.FAL_LLM_MODEL || 'google/gemini-2.5-flash'
          : ''),
      provider:
        !env.LLM_BASE_URL && env.PROMPT_FAL_FALLBACK === 'true' && env.FAL_KEY
          ? 'fal'
          : 'chat-completions',
      json: env.LLM_JSON_MODE !== 'false',
    },
    music: {
      base: url('ACESTEP_BASE_URL'),
      key: env.ACESTEP_API_KEY || '',
      model: env.ACESTEP_MODEL || '',
    },
    voice: {
      base: url('VOICE_WORKER_BASE_URL'),
      key: env.VOICE_WORKER_API_KEY || '',
      model: 'seed-vc',
    },
    pollMs: number('MUSIC_POLL_MS', 2000, 10, 30000),
    timeoutMs: number('MUSIC_TIMEOUT_MS', 900000, 1000, 3600000),
    port: number('PORT', 8788, 1, 65535),
  };
}
