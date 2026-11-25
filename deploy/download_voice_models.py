"""Download pinned public model files and verify publisher checksums.

Uses only the standard library. Run from the project root after preparing Seed-VC.
The manifest uses official Hugging Face metadata and the official Demucs checkpoint.
"""
import argparse
import concurrent.futures
import hashlib
import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path


def checksum(path, item):
    lfs = item.get('lfs', {}).get('sha256')
    digest = hashlib.sha256() if lfs else hashlib.sha1()
    if not lfs:
        digest.update(('blob ' + str(item['size']) + '\0').encode())
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest() == (lfs or item['blobId'])


def download(root, manifest, endpoint, workers=8):
    staging = root / '.cache' / 'voice-downloads'
    jobs, files = [], []
    chunk_size = 16 * 1024 * 1024
    for repo in manifest:
        cache = root / 'modelsrc/seed-vc/checkpoints'
        if repo['repo'] in ['openai/whisper-small', 'nvidia/bigvgan_v2_44khz_128band_512x']:
            cache /= 'hf_cache'
        repository = cache / ('models--' + repo['repo'].replace('/', '--'))
        for item in repo['files']:
            part_size = repo.get('chunk_bytes', chunk_size)
            destination = (
                root / '.cache/torch/hub/checkpoints' / item['rfilename']
                if repo.get('storage') == 'torch'
                else repository / 'snapshots' / repo['revision'] / item['rfilename']
            )
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.is_file() and destination.stat().st_size == item['size'] and checksum(destination, item):
                print('Cached:', repo['repo'], item['rfilename'], flush=True)
                continue
            key = item.get('lfs', {}).get('sha256') or item['blobId']
            parts = staging / key
            parts.mkdir(parents=True, exist_ok=True)
            base = repo['base_url'] if repo.get('storage') == 'torch' else endpoint.rstrip('/') + '/' + repo['repo'] + '/resolve/' + repo['revision']
            url = base.rstrip('/') + '/' + urllib.parse.quote(item['rfilename'])
            spec = (repo, item, destination, parts, part_size)
            files.append(spec)
            for start in range(0, item['size'], part_size):
                end = min(start + part_size, item['size']) - 1
                part = parts / (str(start) + '-' + str(end))
                if not part.is_file() or part.stat().st_size != end - start + 1:
                    jobs.append((url, start, end, part))

    def fetch(job):
        url, start, end, part = job
        length = end - start + 1
        for attempt in range(4):
            try:
                request = urllib.request.Request(url, headers={'Range': f'bytes={start}-{end}', 'Accept-Encoding': 'identity'})
                with urllib.request.urlopen(request, timeout=90) as response:
                    if response.status == 206:
                        if not response.headers.get('Content-Range', '').startswith(f'bytes {start}-{end}/'):
                            raise RuntimeError('Unexpected byte range: ' + response.headers.get('Content-Range', 'missing'))
                    elif not (response.status == 200 and start == 0):
                        raise RuntimeError('Model server did not honor the byte range')
                    data = response.read(length + 1)
                if len(data) != length:
                    raise RuntimeError('Incomplete model chunk: ' + str(len(data)) + '/' + str(length))
                temporary = part.with_suffix('.download')
                temporary.write_bytes(data)
                temporary.replace(part)
                return length
            except Exception as error:
                detail = str(error) if isinstance(error, RuntimeError) else getattr(error, 'code', '')
                print('Download retry:', part.name, attempt + 1, type(error).__name__, detail, flush=True)
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)

    # Interleave repositories instead of sending every connection to one large object.
    jobs.sort(key=lambda job: (job[1], job[0]))
    done = 0
    last = 0
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=workers)
    futures = [executor.submit(fetch, job) for job in jobs]
    try:
        for future in concurrent.futures.as_completed(futures):
            done += future.result()
            if done - last >= 128 * 1024 * 1024:
                print('Downloaded model chunks:', round(done / 1024 ** 2), 'MiB', flush=True)
                last = done
    except Exception:
        for future in futures:
            future.cancel()
        executor.shutdown(wait=False, cancel_futures=True)
        raise
    else:
        executor.shutdown(wait=True)
    for repo, item, destination, parts, part_size in files:
        temporary = destination.with_suffix(destination.suffix + '.download')
        with temporary.open('wb') as output:
            for start in range(0, item['size'], part_size):
                end = min(start + part_size, item['size']) - 1
                with (parts / (str(start) + '-' + str(end))).open('rb') as source:
                    shutil.copyfileobj(source, output)
        if temporary.stat().st_size != item['size'] or not checksum(temporary, item):
            temporary.unlink(missing_ok=True)
            shutil.rmtree(parts)
            raise RuntimeError('Official checksum mismatch: ' + item['rfilename'])
        temporary.replace(destination)
        shutil.rmtree(parts)
        print('Verified:', repo['repo'], item['rfilename'], flush=True)
    for repo in manifest:
        if repo.get('storage') == 'torch':
            continue
        cache = root / 'modelsrc/seed-vc/checkpoints'
        if repo['repo'] in ['openai/whisper-small', 'nvidia/bigvgan_v2_44khz_128band_512x']:
            cache /= 'hf_cache'
        refs = cache / ('models--' + repo['repo'].replace('/', '--')) / 'refs'
        refs.mkdir(parents=True, exist_ok=True)
        # HF cache refs are the raw commit ID, without a trailing newline.
        (refs / 'main').write_text(repo['revision'])
    print('Pinned voice model files are verified and cached.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--manifest', type=Path, default=Path('deploy/voice-models.json'))
    parser.add_argument('--endpoint', default='https://huggingface.co')
    parser.add_argument('--workers', type=int, default=8)
    args = parser.parse_args()
    download(args.root.resolve(), json.loads(args.manifest.read_text()), args.endpoint, args.workers)
