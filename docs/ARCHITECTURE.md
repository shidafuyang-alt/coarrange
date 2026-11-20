# Architecture

## Runtime

CoArrange is a static browser application. `web/index.html` loads classic scripts in an explicit order. Catalogs and helper modules are loaded before `app.js`; their functions access application state only after initialization. There is no bundler or backend.

`app.js` manages hash-based navigation and the shared HTML audio player. View functions render into `#main`, and delegated event listeners handle controls created during rendering. `i18n.js` preserves original UI copy while applying translations; uploaded filenames and user-authored text should remain untranslated.

## Music paths

There are two distinct playback paths:

1. **Prepared listening audio:** `app.js` plays bundled M4A files through an `Audio` element. These include procedural arrangements and genuine offline ACE-Step outputs.
2. **Editable score playback:** `studio-score.js` builds note/rhythm templates from the original theme. `studio.js` schedules these notes through `sampler.js`, using bundled samples and synthesized drums. The workbench exports notes, tempo, and General MIDI programs.

The supplied-song case has prepared audio only. Its score has not been transcribed into the workbench. Imported MIDI supplies a melody for template accompaniment, not a complete DAW project.

## Data and persistence

`music-catalog.js` defines styles and instruments. `web/assets/score.json` contains the original editable score. Instrument samples are fetched and decoded on demand, then cached in memory. Local storage holds interface preferences and favorites. User uploads use local file/blob APIs.

## Future model integration

Live generation should use a backend that owns provider credentials, validates requests, tracks jobs, and returns generated assets. Do not place secret API keys in frontend JavaScript or a standalone HTML file. Keep the prepared demo available while adding live generation as a separate, accurately labeled path.

## Packaging

`scripts/serve.mjs` serves `web/` with correct MIME types. `scripts/check.mjs` verifies script syntax, catalog consistency, and required assets. `scripts/build-standalone.py` packages the static application into a single file without changing the editable source.
