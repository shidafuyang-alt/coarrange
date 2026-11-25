import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audioFirstReady, generateMusic } from '../tools/ace-step/generate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../web');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 8788);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Provide a valid port between 1 and 65535.');
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mid': 'audio/midi',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname === '/api/audio-first' && request.method === 'GET') {
    const ready = await audioFirstReady();
    response
      .writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      .end(JSON.stringify(ready));
    return;
  }
  if (pathname === '/api/audio-first' && request.method === 'POST') {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        response.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    let body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
      response
        .writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify({ ok: false, error: '请求格式不正确。' }));
      return;
    }
    const result = await generateMusic(body);
    response.writeHead(result.ok ? 200 : 502, {
      'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify(result));
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const path = resolve(root, `.${pathname.endsWith('/') ? pathname + 'index.html' : pathname}`);
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const info = await stat(path);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': mime[extname(path)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else
      createReadStream(path)
        .on('error', () => response.destroy())
        .pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.requestTimeout = 0;
server.headersTimeout = 0;
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`CoArrange: http://localhost:${port}`));
