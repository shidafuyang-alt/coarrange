import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertVoice } from '../server/voice.mjs';

for (const stage of ['submission', 'poll', 'download']) {
  test(`voice ${stage} connection loss gives actionable feedback`, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'musiccraft-voice-network-'));
    const path = join(directory, 'input.wav');
    await writeFile(path, Buffer.from('fixture'));
    const id = 'a'.repeat(32);
    const server = createServer(async (req, res) => {
      for await (const chunk of req) {
        /* Drain the uploaded fixture. */
      }
      const isSubmission = req.method === 'POST';
      const isDownload = req.url.endsWith('/audio/result');
      if (
        (stage === 'submission' && isSubmission) ||
        (stage === 'poll' && !isSubmission) ||
        (stage === 'download' && isDownload)
      ) {
        req.socket.destroy();
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify(
          isSubmission
            ? { id }
            : {
                status: 'succeeded',
                artifacts: { result: `/v1/jobs/${id}/audio/result` },
              },
        ),
      );
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    t.after(async () => {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
      await rm(directory, { recursive: true, force: true });
    });
    const config = {
      voice: { base: `http://127.0.0.1:${server.address().port}`, key: '' },
      timeoutMs: 5000,
      pollMs: 1,
    };
    await assert.rejects(
      convertVoice(
        config,
        { duration: 10 },
        { path, extension: 'wav' },
        { path, extension: 'wav' },
        new AbortController().signal,
        () => {},
      ),
      (error) => {
        assert.equal(error.status, 503);
        assert.match(error.message, /AutoDL.*SSH/);
        assert.doesNotMatch(error.message, /fetch failed|127\.0\.0\.1/);
        return true;
      },
    );
  });
}
