import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { cachedMelody, filterWithDeepSeek, pieceCaption } from './prompt.mjs';

export const PIECE_SECONDS = 60;
export const PIECE_SEED = 20261125;

let busy = false;

function aceRoot() {
  return process.env.ACESTEP_ROOT || '';
}

export async function audioFirstReady() {
  const root = aceRoot();
  let ace = false;
  if (root) {
    try {
      await access(join(root, 'checkpoints/acestep-v15-turbo/model.safetensors'));
      ace = true;
    } catch {
      ace = false;
    }
  }
  return { ok: ace, ace, deepseek: Boolean(process.env.DEEPSEEK_API_KEY) };
}

export function buildPieceJob({ caption, seed }) {
  const root = aceRoot();
  const device = process.env.ACESTEP_DEVICE || 'mps';
  const backend = process.env.ACESTEP_BACKEND || 'mlx';
  return `project_root = ${JSON.stringify(join(root, 'code'))}
checkpoint_dir = ${JSON.stringify(join(root, 'checkpoints'))}
config_path = "acestep-v15-turbo"
device = ${JSON.stringify(device)}
backend = ${JSON.stringify(backend)}
offload_to_cpu = false
offload_dit_to_cpu = false
save_dir = ${JSON.stringify(join(root, 'web-out'))}
audio_format = "wav"
task_type = "text2music"
caption = """
${String(caption).replaceAll('"""', "'''")}
"""
lyrics = "[Instrumental]"
instrumental = true
vocal_language = "unknown"
bpm = 96
keyscale = ""
timesignature = "4"
duration = ${PIECE_SECONDS}.0
inference_steps = 8
seed = ${seed}
use_random_seed = false
guidance_scale = 7.0
shift = 1.0
infer_method = "ode"
thinking = false
use_cot_metas = false
use_cot_caption = false
use_cot_lyrics = false
use_cot_language = false
batch_size = 1
sample_mode = false
sample_query = ""
`;
}

export async function generateMusic(body) {
  if (busy) return { ok: false, error: '正在生成另一首，请等它完成。' };
  const ready = await audioFirstReady();
  if (!ready.ace) return { ok: false, error: '音乐引擎还没准备好。' };
  const notes = Array.isArray(body?.notes) ? body.notes.filter(validNote).slice(0, 256) : [];
  const wish = String(body?.wish || '');
  if (notes.length < 2) return { ok: false, error: '请先哼一段或上传一段旋律。' };
  const cached = cachedMelody(body?.cachedFeatures);
  if (!cached && !process.env.DEEPSEEK_API_KEY) {
    return {
      ok: false,
      error: '创作服务还没有密钥。请在启动页面的终端设置 DEEPSEEK_API_KEY 后重新打开。',
    };
  }

  busy = true;
  const started = Date.now();
  const job = await mkdtemp(join(tmpdir(), 'coarrange-ace-'));
  try {
    let analysis = '';
    let features = null;
    if (cached) {
      features = cached;
      analysis = String(body.cachedAnalysis || '');
    } else {
      const filtered = await filterWithDeepSeek(notes, process.env.DEEPSEEK_API_KEY);
      if (!filtered.ok) return { ...filtered, seconds: elapsed(started) };
      features = { melody: filtered.melody };
      analysis = filtered.summary;
    }
    const caption = pieceCaption(features.melody, wish);
    const seed = PIECE_SEED;
    const toml = join(job, 'job.toml');
    const request = buildPieceJob({ caption, seed });
    await writeFile(toml, request);
    await mkdir(join(aceRoot(), 'web-out'), { recursive: true });
    const run = await runAce(toml);
    const recordPath = await writeRunRecord({
      caption,
      seed,
      features,
      analysis,
      wish,
      request,
      output: run.ok ? run.path : '',
      error: run.ok ? '' : run.error,
    });
    if (!run.ok) return { ok: false, error: run.error, seconds: elapsed(started), recordPath };
    const audio = await readFile(run.path);
    return {
      ok: true,
      mode: 'piece',
      seconds: elapsed(started),
      ditSeconds: run.ditSeconds,
      seed,
      caption,
      analysis,
      features,
      keepsMelodyExactly: false,
      audioBase64: audio.toString('base64'),
      durationHint: PIECE_SECONDS,
      recordPath,
      output: run.path,
    };
  } catch (error) {
    return { ok: false, error: error.message || '生成失败', seconds: elapsed(started) };
  } finally {
    busy = false;
    await rm(job, { recursive: true, force: true });
  }
}

async function writeRunRecord(record) {
  const dir = join(aceRoot(), 'web-runs');
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${Date.now()}-seed-${record.seed}.json`);
  await writeFile(
    file,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        caption: record.caption,
        seed: record.seed,
        useRandomSeed: false,
        features: record.features,
        analysis: record.analysis,
        wish: record.wish,
        request: record.request,
        output: record.output,
        error: record.error,
      },
      null,
      2,
    ),
  );
  return file;
}
function validNote(note) {
  return Number.isFinite(note?.pitch) && Number.isFinite(note?.duration) && note.duration > 0;
}
function elapsed(started) {
  return Math.round((Date.now() - started) / 100) / 10;
}
function runAce(toml) {
  return new Promise((resolve) => {
    const root = aceRoot();
    const codeDir = join(root, 'code');
    const python = process.env.ACESTEP_PYTHON || join(codeDir, '.venv/bin/python');
    const child = spawn(python, ['cli.py', '-c', toml], {
      cwd: codeDir,
      env: {
        ...process.env,
        VIRTUAL_ENV: join(codeDir, '.venv'),
        PATH: `${join(codeDir, '.venv/bin')}:${process.env.PATH}`,
        HF_HUB_DISABLE_XET: '1',
        ACESTEP_CHECKPOINTS_DIR: join(root, 'checkpoints'),
      },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      err += chunk;
    });
    child.on('close', (code) => {
      const saved = out.match(/Path:\s+(.+?\.wav)/);
      const dit = out.match(/Total time: ([0-9.]+)s/);
      if (code !== 0 || !saved) {
        resolve({ ok: false, error: '这次没有生成出音乐，请再试一次。' });
        return;
      }
      resolve({
        ok: true,
        path: saved[1],
        ditSeconds: dit ? Number(dit[1]) : null,
        log: err.slice(-400),
      });
    });
  });
}
