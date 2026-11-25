# Architecture

## Runtime

The original CoArrange demo remains a static browser application. `web/index.html` loads classic scripts in an explicit order. Catalogs and helper modules are loaded before `app.js`; their functions access application state only after initialization. There is no bundler. The Node server now additionally hosts `/api/` for the MusicCraft Agent and real music model path.

`app.js` manages hash-based navigation and the shared HTML audio player. View functions render into `#main`, and delegated event listeners handle controls created during rendering. `i18n.js` preserves original UI copy while applying translations; uploaded filenames and user-authored text should remain untranslated.

## Music paths

There are two distinct playback paths:

1. **Prepared listening audio:** `app.js` plays bundled M4A files through an `Audio` element. These include procedural arrangements and genuine offline ACE-Step outputs.
2. **Editable score playback:** `studio-score.js` builds note/rhythm templates from the original theme. `studio.js` schedules these notes through `sampler.js`, using bundled samples and synthesized drums. The workbench exports notes, tempo, and General MIDI programs.

The supplied-song case has prepared audio only. Its score has not been transcribed into the workbench. Imported MIDI supplies a melody for template accompaniment, not a complete DAW project.

## Data and persistence

`music-catalog.js` defines styles and instruments. `web/assets/score.json` contains the original editable score. Instrument samples are fetched and decoded on demand, then cached in memory. Local storage holds interface preferences and favorites. User uploads use local file/blob APIs.

## Live model integration

`web/agent-ui.js` provides uploads, model selection and job playback. One Generate action privately plans and submits the task; clarification pauses execution when required. `server/agent.mjs` loads versioned Planner/Critic prompts, while `server/planners.mjs` adapts DeepSeek and OpenAI APIs. `server/api.mjs` binds server-owned assets to validated plans, persists records, queues execution and serves audio. Public plans omit internal model prompts and lyrics.

`server/engines.mjs` dispatches to fal, Mureka, self-hosted ACE-Step or the private singing Worker. `server/voice.mjs` submits multipart audio, polls job status and downloads validated same-service stem URLs. The GPU Worker runs Demucs separation, F0-conditioned Seed-VC conversion and stereo FFmpeg mixing. Independent Python environments and pinned model caches are prepared by `deploy/`.

Credentials are read from server-side `.env` by `server/config.mjs`. In managed mode, visitors cannot change shared connections or access keys. The private Worker uses a separate scoped token and can be reached through SSH forwarding. Static-only deployments retain prepared examples but cannot execute `/api/` tasks. See [managed setup](MANAGED_MODELS.md) and [verified voice deployment](VOICE_AND_MODELS.md).

## Packaging

`scripts/serve.mjs` serves `web/` with correct MIME types. `scripts/check.mjs` verifies script syntax, catalog consistency, and required assets. `scripts/build-standalone.py` packages the static application into a single file without changing the editable source.
