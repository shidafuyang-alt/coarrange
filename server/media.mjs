import { spawn } from 'node:child_process';
import { ApiError } from './http.mjs';

export async function mediaReady(config) {
  return new Promise((resolve) => {
    const child = spawn(config.ffmpeg || 'ffmpeg', ['-version'], {
      stdio: 'ignore',
      timeout: 3000,
    });
    child.once('error', () => resolve(false));
    child.once('close', (code) => resolve(code === 0));
  });
}
export async function clipAudio(config, source, duration, signal, format = 'wav') {
  // Crop before uploading to the paid remix endpoint; it uses the source clip's length.
  return new Promise((resolve, reject) => {
    const child = spawn(
      config.ffmpeg || 'ffmpeg',
      [
        '-nostdin',
        '-v',
        'error',
        '-i',
        source.path || 'pipe:0',
        '-t',
        String(duration),
        '-vn',
        '-ac',
        '2',
        '-ar',
        '44100',
        ...(format === 'mp3' ? ['-codec:a', 'libmp3lame', '-b:a', '192k'] : []),
        '-f',
        format,
        'pipe:1',
      ],
      { stdio: [source.data ? 'pipe' : 'ignore', 'pipe', 'ignore'], signal, timeout: 60000 },
    );
    if (source.data) {
      child.stdin.on('error', () => {});
      child.stdin.end(source.data);
    }
    const chunks = [];
    let size = 0,
      overflow = false;
    child.stdout.on('data', (chunk) => {
      size += chunk.length;
      if (size > 20 * 1024 * 1024) {
        overflow = true;
        child.kill();
      } else chunks.push(chunk);
    });
    child.once('error', () => reject(new ApiError(503, '音频处理服务未就绪，请联系项目管理员。')));
    child.once('close', (code) => {
      if (signal.aborted) reject(signal.reason);
      else if (code !== 0 || overflow || size < 44)
        reject(new ApiError(422, '无法读取源音频，请换用有效的音乐片段。'));
      else resolve(Buffer.concat(chunks));
    });
  });
}
