# CoArrange

A bilingual music arrangement prototype for people who have ideas, but no music theory background. Explore an original melody in 13 styles, compare prepared AI arrangements, and build a playful arrangement with 31 instrument sounds.

This is a course-project demo. Listening, arrangement, and Hum-to-MIDI run in the browser and need no API key. Generating a new full piece from a hum is optional: it uses the local Node server, a DeepSeek key, and a local ACE-Step 1.5 Turbo checkout.

## Quick start

Install **Node.js 20 or newer**, then run:

```bash
git clone https://github.com/shidafuyang-alt/coarrange.git
cd coarrange
npm start
```

Open **http://localhost:8788**. No package installation is required to run the app. To use another port, run `npm start -- --port 8080`.

Hum to Music recognizes a short recording in the browser with Spotify Basic Pitch 1.0.1 (Apache-2.0, Copyright 2022 Spotify AB). The model weights are not stored in git. Download them once, then start the app:

```bash
npm run pitch-model
npm start
```

Open **http://localhost:8788/#hum**. Licenses are in [web/third-party/NOTICES.txt](web/third-party/NOTICES.txt).

Recording, melody preview, MIDI export, and **Open the arrangement desk** work with this server alone. **Generate my music** also needs the optional generation setup below. The Python static server cannot run that generation route.

Alternatively, with Python 3 installed:

```bash
python3 -m http.server 8788 --directory web
```

Serve the `web/` directory rather than opening `web/index.html` directly: instrument samples and the score are loaded through `fetch`.

## Optional full-piece generation

The Hum page can send the recognized melody to DeepSeek for a short English description, then to a local ACE-Step 1.5 Turbo text-to-music run of about 60 seconds. The instrument text, song form, seed, and inference settings stay in `tools/ace-step/`. Model weights, the Python environment, and generated audio stay outside this repository.

Create a private env file from the example, then start the server in that same terminal:

```bash
cp .env.example .env.local
# Edit .env.local, then load it without printing the key:
set -a
source .env.local
set +a
npm start
```

`.env.local` is ignored by git. `DEEPSEEK_API_KEY` is read only from the server process. Leave it empty in `.env.example`.

`ACESTEP_ROOT` is the ACE-Step checkout root, the directory that contains both `code/` and `checkpoints/`. Do not point it at `code/` or `checkpoints/` alone. The server looks for these paths inside it:

```text
$ACESTEP_ROOT/code/cli.py
$ACESTEP_ROOT/code/.venv/bin/python
$ACESTEP_ROOT/checkpoints/acestep-v15-turbo/model.safetensors
```

If the Python executable lives somewhere else, set `ACESTEP_PYTHON` to that executable. Weights, the virtual environment, generated wav files, and run logs stay outside this repository.

Apple Silicon is the only combination tested here. Leave `ACESTEP_DEVICE` and `ACESTEP_BACKEND` unset. The server then uses `mps` and `mlx`, and the checkout's virtual environment must provide MLX.

On Linux, Windows, or any machine without MPS, those defaults will not run. Set `ACESTEP_DEVICE` to `cuda`, `cpu`, or `auto`, and `ACESTEP_BACKEND` to `pt` or `vllm`. `mps` and `mlx` are Apple-only. Other device and backend pairs were not tested in this project.

Generation runs one piece at a time and can take several minutes. Do not commit weights, virtual environments, wav outputs, or run logs.

## Demo features

- **13 listening styles:** pop, chamber classical, gentle chamber, rock, folk, jazz swing, bossa nova, funk, reggae, lo-fi hip-hop, erhu disco, circus swing, and chiptune.
- **31 instrument sounds:** keyboards, guitars, basses, strings, winds, brass, plucked instruments, sampled erhu, and synthesized drums.
- **Arrangement workbench:** style presets, up to eight parts, instrument audition and replacement, add/remove parts, mute, solo, volume, tempo, and transposition.
- **MIDI tools:** import a simple melody and export the current arrangement with note events, tempo, and General MIDI program mappings.
- **Playback:** prepared audio, seeking, looping, version comparison, favorites, library search, and downloads.
- **Personalization:** Chinese/English switching, four appearance themes, and a collapsible desktop sidebar.

Theme, language, sidebar preferences, and favorites are stored in the current browser. Uploaded audio and MIDI are read locally; the application does not upload them to a server.

## Suggested presentation

1. Open **For you** and play **Erhu disco**, then try **Circus swing** or **Rock**.
2. Open **Arrangement**, choose a style, and press **Play arrangement**.
3. Click an instrument name to replace it, or use **Add instrument** to introduce another part.
4. Use **S** to hear a part alone, then export the arrangement as MIDI.
5. In the supplied-song case, switch **A / B** to compare the source excerpt with a prepared classical arrangement at the same playhead position. Press **1–6** to switch between six synchronized versions, **0** for Auto-DJ, and **P** to play or stop.

## Project structure

```text
web/                         Frontend source and deployable static site
  index.html                 Application shell
  app.js                     Navigation, playback, library, and MIDI parsing
  music-catalog.js           Style and instrument definitions
  sampler.js                 Sample playback and synthesized drums
  studio-score.js            Editable arrangement templates
  studio.js                  Workbench controls and MIDI export
  styles-ui.js               Style selection, gallery, and result panels
  preferences.js             Appearance, language, and sidebar controls
  i18n.js                    UI translation dictionary
  song-case.js               Prepared source/arrangement comparison
  assets/                    Bundled audio, samples, artwork, score, and credits
scripts/                     Local server, checks, and standalone HTML packaging
docs/                        Architecture and audio provenance
tools/audio/                 Historical original-theme composition/rendering sources
.github/                     CI checks and pull request template
```

The application uses plain HTML, CSS, and JavaScript. There is no frontend compilation step: deploy `web/` as a static directory.

## Development

Install the pinned formatting dependency once:

```bash
npm ci
npm run check
npm run format:check
```

Useful commands:

| Command                               | Purpose                                          |
| ------------------------------------- | ------------------------------------------------ |
| `npm start`                           | Start the dependency-free local server           |
| `npm run check`                       | Check JavaScript syntax and required demo assets |
| `npm run format`                      | Apply the shared Prettier configuration          |
| `npm run format:check`                | Verify formatting without changing files         |
| `python3 scripts/build-standalone.py` | Create a single offline HTML in `artifacts/`     |

The standalone HTML embeds the app, music, images, and instrument samples. It is a generated presentation artifact; edit the files under `web/` and rebuild it when needed.

## Team workflow

Use GitHub Desktop or the Git CLI. Pull the latest `main` before starting, create a short feature branch, and open a pull request when the change is ready. Ask one teammate to review before merging. Keep each pull request focused on one task.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the working agreement and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the application flow.

## What is implemented, and what is planned

**Implemented:** real prepared audio, actual local sample playback, editable arrangement templates, MIDI import/export, and the interface features listed above. Ten additional versions of the original theme and the supplied-song arrangements were genuinely generated offline using ACE-Step 1.5 Turbo. Their prompts, seeds, and checks are recorded in [docs/audio/](docs/audio/).

**Optional, on this branch:** a hummed or uploaded melody can be transcribed in the browser, exported as MIDI, opened in the arrangement workbench, or sent through DeepSeek and local ACE-Step Turbo to generate one instrumental piece. The prepared listening audio is unchanged.

**Not connected yet:** generation from arbitrary text alone, multi-agent LLM critique, and in-app source separation. The five melody-locked remixes were produced offline with separation, transcription, and hand-written arrangement rules; see [tools/remix/](tools/remix/README.md). A written wish is appended to the generation caption; it does not change the prepared listening audio. The workbench provides a separate editable interpretation and does not reproduce every detail of an AI-rendered version.

MIDI import targets simple melodic Type 0/1 PPQ files. General MIDI does not define an erhu program, so the erhu part uses a fiddle mapping on export; its recorded erhu sound is available inside this application. Generative covers can change melodic details. Automated audio metrics are supporting checks, not a claim of human listening approval.

## Audio and asset credits

- **Letters in the Sun:** an original procedural theme, with original rendered arrangements and additional offline AI interpretations.
- **Supplied-song case:** a user-provided 20-second excerpt, approximately 0:47–1:07, and prepared AI arrangements. The full original MP3 is not included. Artist attribution comes from the supplied filename; this material is not relicensed as original project music.
- **Erhu:** Berklee Intersectional Soundbox Archive (BISA); performer Yu Chun Chan, recording engineer Josefina Ugarte, and editor Asher Deverna. The source collection states CC BY. Samples were trimmed, converted to mono, and normalized.
- **General instrument samples:** FluidR3 by Frank Wen, pre-rendered by Benjamin Gleitzman / MIDI.js Soundfonts. The collection specifies CC BY 3.0 for these samples.
- **Artwork:** AI-generated cover images.
- **Icons:** Lucide, under the bundled ISC license.

Full instrument source and license links are in [web/assets/instrument-credits.html](web/assets/instrument-credits.html). The Lucide license is in [web/assets/LUCIDE-LICENSE.txt](web/assets/LUCIDE-LICENSE.txt). Third-party assets retain their respective terms. No blanket open-source license has been assigned to the project code yet.
