#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
if [ -f "$PROJECT_ROOT/.env.voice-worker" ]; then
  while IFS= read -r entry || [ -n "$entry" ]; do
    case "$entry" in VOICE_WORKER_API_KEY=*) export "$entry" ;; esac
  done < "$PROJECT_ROOT/.env.voice-worker"
fi
export SEED_VC_DIR="$PROJECT_ROOT/modelsrc/seed-vc"
export SEED_VC_PYTHON="$PROJECT_ROOT/.venvs/seed/bin/python"
export DEMUCS_PYTHON="$PROJECT_ROOT/.venvs/demucs/bin/python"
export HF_HOME="${HF_HOME:-$PROJECT_ROOT/.cache/huggingface}"
export TORCH_HOME="${TORCH_HOME:-$PROJECT_ROOT/.cache/torch}"
export HF_HUB_DISABLE_XET=1
export HF_HUB_OFFLINE="${HF_HUB_OFFLINE:-1}"
export TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-1}"
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-4}"
export PYTHONUNBUFFERED=1
export VOICE_HOST="${VOICE_HOST:-127.0.0.1}"
export VOICE_PORT="${VOICE_PORT:-8010}"
exec "$SEED_VC_PYTHON" -B -m workers.voice_server
