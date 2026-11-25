# MusicCraft

A bilingual music arrangement prototype for people who have ideas, but no music theory background. Explore an original melody in 13 styles, compare prepared AI arrangements, and build a playful arrangement with 31 instrument sounds.

The prepared demo and MIDI workbench run in the browser without a GPU or API key. MusicCraft Agent uses a Node backend with centrally managed engines. A single Generate action runs DeepSeek/OpenAI planning in the background, then ACE-Step/Stable Audio for music or Seed-VC for singing conversion. Internal prompts are not displayed or returned by the plan endpoint. Users select models without entering URLs or keys. The project operator provides accounts and credits once; singing conversion uses the dedicated Seed-VC worker. See [managed model setup](docs/MANAGED_MODELS.md).

## Quick start

Install **Node.js 20.11 or newer** (22 LTS recommended), then run:

```bash
git clone https://github.com/shidafuyang-alt/coarrange.git
cd coarrange
npm ci
npm start
```

Open **http://localhost:8788**. Run `npm ci` once to install the bundled audio processor and dependencies. To use another port, run `npm start -- --port 8080`.

Alternatively, with Python 3 installed:

```bash
python3 -m http.server 8788 --directory web
```

The Python/static option supports the prepared demo only. The project operator configures `DEEPSEEK_API_KEY` for planning and `FAL_KEY` for ACE-Step/Stable Audio in `.env`; Mureka is an optional alternative. Listeners never supply credentials. Set `MUSICCRAFT_DOMESTIC_ONLY=true` to hide and disable overseas model providers. Personal singing conversion still needs the team GPU worker. See [managed model setup](docs/MANAGED_MODELS.md) for API limits and activation steps. Use `npm start` and configure `.env` for live model tasks. Node.js 22 LTS is recommended. Serve the `web/` directory rather than opening `web/index.html` directly: instrument samples and the score are loaded through `fetch`.

## Demo features

- **Saved music library:** completed covers, remixes and creations appear automatically, including existing successful jobs. Filter, play, download or favorite tracks; move unwanted results to recoverable Trash. See [library persistence and deletion](docs/LIBRARY.md).

- **13 listening styles:** pop, chamber classical, gentle chamber, rock, folk, jazz swing, bossa nova, funk, reggae, lo-fi hip-hop, erhu disco, circus swing, and chiptune.
- **31 instrument sounds:** keyboards, guitars, basses, strings, winds, brass, plucked instruments, sampled erhu, and synthesized drums.
- **Arrangement workbench:** style presets, up to eight parts, instrument audition and replacement, add/remove parts, mute, solo, volume, tempo, and transposition.
- **MIDI tools:** import a simple melody and export the current arrangement with note events, tempo, and General MIDI program mappings.
- **Playback:** prepared audio, seeking, looping, version comparison, favorites, library search, and downloads.
- **Personalization:** Chinese/English switching, four appearance themes, and a collapsible desktop sidebar.

Theme, language, sidebar preferences, and favorites are stored in the current browser. Original demo uploads and MIDI remain local. Audio selected in the new Agent panel is uploaded to the application backend when planning and sent to the configured music service when the user starts a live task. Agent briefs and results are stored in the ignored `.musiccraft-data/` directory; keys stay in server-side `.env`.

## Suggested presentation

1. Open the unified music workspace. The shared Agent area supports both creation and restyling; all other sections remain on the same page.
2. Scroll to **Listen and compare** and play **Erhu disco**, then try **Circus swing** or **Rock**. In **Arrangement**, choose a style and press **Play arrangement**.
3. Click an instrument name to replace it, or use **Add instrument** to introduce another part.
4. Use **S** to hear a part alone, then export the arrangement as MIDI.
5. In the supplied-song case, switch **A / B** to compare the source excerpt with a prepared classical arrangement at the same playhead position. Press **1–6** to switch between six synchronized versions, **7** to compare the early AI cover, **0** for Auto-DJ, and **P** to play or stop.

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
server/                      Agent API, planners, model adapters, uploads and jobs
prompts/                     Versioned internal planning and feedback instructions
workers/                     Private Demucs → Seed-VC → FFmpeg voice service
deploy/                      Pinned GPU dependencies, model manifest and scripts
tests/                       Node HTTP/Agent contracts and Python voice tests
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

**Live Agent integration:** centrally managed DeepSeek/OpenAI planning, versioned internal prompts, validated plans, uploads, asynchronous jobs, polling, cancellation, downloads and feedback-based revision. The single Generate action plans and executes without displaying the internal prompt. Music adapters include fal ACE-Step/Stable Audio, optional Mureka and a self-hosted ACE-Step adapter. DeepSeek has passed a real request; fal authentication has been checked, but full fal music generation has not yet been validated. No provider credentials are included in this repository. See [managed setup](docs/MANAGED_MODELS.md), [protocol setup](docs/MODEL_AGENT_SETUP.md) and [training suggestions](docs/TRAINING_PLAN.md).

**Verified singing-conversion pipeline:** a private Demucs → Seed-VC → FFmpeg worker has completed real GPU inference on an RTX 3090, including a MusicCraft backend request planned by DeepSeek. A 10-second sample completed in about 24 seconds after submission in one test. It supports source/reference uploads, clip controls, progress, cancellation, stereo mixing and five-track playback/download. The reference was an official sample; personal voice similarity and listening quality still require evaluation with the user’s recordings. This uses pretrained zero-shot conversion, with no per-user training. See [voice deployment and use](docs/VOICE_AND_MODELS.md).

**Not implemented:** general-purpose transcription in the editable MIDI workbench and natural-language MIDI editing. The five bundled melody-locked remixes were produced offline with separation, transcription, and hand-written arrangement rules; see [tools/remix/](tools/remix/README.md). Prepared examples remain separate from live task results. The editable workbench does not reproduce every detail of an AI-rendered version.

MIDI import targets simple melodic Type 0/1 PPQ files. General MIDI does not define an erhu program, so the erhu part uses a fiddle mapping on export; its recorded erhu sound is available inside this application. Generative covers can change melodic details. Automated audio metrics are supporting checks, not a claim of human listening approval.

## Audio and asset credits

- **Letters in the Sun:** an original procedural theme, with original rendered arrangements and additional offline AI interpretations.
- **Supplied-song case:** a user-provided 20-second excerpt, approximately 0:47–1:07, and prepared AI arrangements. The full original MP3 is not included. Artist attribution comes from the supplied filename; this material is not relicensed as original project music.
- **Erhu:** Berklee Intersectional Soundbox Archive (BISA); performer Yu Chun Chan, recording engineer Josefina Ugarte, and editor Asher Deverna. The source collection states CC BY. Samples were trimmed, converted to mono, and normalized.
- **General instrument samples:** FluidR3 by Frank Wen, pre-rendered by Benjamin Gleitzman / MIDI.js Soundfonts. The collection specifies CC BY 3.0 for these samples.
- **Artwork:** AI-generated cover images.
- **Icons:** Lucide, under the bundled ISC license.

Full instrument source and license links are in [web/assets/instrument-credits.html](web/assets/instrument-credits.html). The Lucide license is in [web/assets/LUCIDE-LICENSE.txt](web/assets/LUCIDE-LICENSE.txt). Third-party assets retain their respective terms. No blanket open-source license has been assigned to the project code yet.
