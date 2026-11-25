#!/usr/bin/env bash
# Run ON a rented Ubuntu GPU machine. This script is not run by the local studio.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${MUSICCRAFT_GPU_PYTHON:-python3.10}"
command -v "$PYTHON_BIN" >/dev/null || { echo "Install Python 3.10 and python3.10-venv first."; exit 1; }
command -v ffmpeg >/dev/null || { echo "Install ffmpeg first: sudo apt-get install ffmpeg"; exit 1; }
command -v nvidia-smi >/dev/null || { echo "An NVIDIA GPU and driver are required."; exit 1; }
cd "$PROJECT_ROOT"
mkdir -p modelsrc .venvs .cache/pip .cache/tmp
export TMPDIR="$PROJECT_ROOT/.cache/tmp"
export PIP_CACHE_DIR="$PROJECT_ROOT/.cache/pip"
PIP_SOURCE="${MUSICCRAFT_PIP_INDEX_URL:-https://pypi.tuna.tsinghua.edu.cn/simple}"
SEED_REVISION=51383efd921027683c89e5348211d93ff12ac2a8
if [ ! -f modelsrc/seed-vc/inference.py ]; then
  command -v curl >/dev/null || { echo "Install curl first."; exit 1; }
  curl --fail --location --connect-timeout 15 --max-time 180 --retry 2 \
    --output .cache/seed-vc-source.tar.gz \
    "https://codeload.github.com/Plachtaa/seed-vc/tar.gz/$SEED_REVISION"
  mkdir -p modelsrc/seed-vc
  tar -xzf .cache/seed-vc-source.tar.gz --strip-components=1 -C modelsrc/seed-vc
fi
"$PYTHON_BIN" -m venv .venvs/seed
"$PYTHON_BIN" -m venv .venvs/demucs
for venv in seed demucs; do
  if [ -f .cache/wheels/torch-2.4.0-cp310-cp310-manylinux1_x86_64.whl ]; then
    ".venvs/$venv/bin/python" -m pip install --index-url "$PIP_SOURCE" \
      -c deploy/voice-constraints.txt .cache/wheels/*.whl
  else
    ".venvs/$venv/bin/python" -m pip install --index-url "$PIP_SOURCE" \
      -c deploy/voice-constraints.txt torch==2.4.0 torchvision==0.19.0 torchaudio==2.4.0 numpy==1.26.4
  fi
done
# Do not install upstream's conflicting nightly Torch or desktop GUI packages.
.venvs/seed/bin/python -m pip install --index-url "$PIP_SOURCE" \
  -c deploy/voice-constraints.txt -r deploy/requirements-seed-headless.txt
.venvs/demucs/bin/python -m pip install --index-url "$PIP_SOURCE" \
  -c deploy/voice-constraints.txt demucs==4.0.1 soundfile==0.12.1
printf '%s\n' "$SEED_REVISION" > .venvs/seed-vc-revision.txt
.venvs/seed/bin/python -c 'import torch; assert torch.cuda.is_available(), "CUDA unavailable"; print(torch.cuda.get_device_name())'
.venvs/seed/bin/python -m pip check
.venvs/demucs/bin/python -m pip check
if [ -f /etc/network_turbo ]; then
  (
    source /etc/network_turbo >/dev/null 2>&1
    "$PYTHON_BIN" deploy/download_voice_models.py --endpoint "${MUSICCRAFT_HF_ENDPOINT:-https://huggingface.co}"
  )
else
  "$PYTHON_BIN" deploy/download_voice_models.py --endpoint "${MUSICCRAFT_HF_ENDPOINT:-https://huggingface.co}"
fi
printf '\n%s\n' 'Dependencies and pinned pretrained model files are prepared. Verify real inference before the demo.'
printf '%s\n' 'Next: bash deploy/start_voice.sh'
