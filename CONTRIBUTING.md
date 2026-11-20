# Contributing

## Before starting

1. Pull the latest `main`.
2. Create a branch such as `feat/instrument-search` or `fix/player-layout`.
3. Agree on ownership before editing a file another teammate is changing.

## Making changes

- Edit frontend source in `web/`; do not edit generated standalone HTML.
- Keep modules focused and use descriptive names.
- Add translations for user-facing copy in `web/i18n.js`.
- Reuse the existing CSS theme variables and Lucide icon system.
- Preserve honest labels for prepared audio and unfinished generation features.
- Credit any new audio, sample, image, or library. Do not commit API keys, model weights, environments, or caches.

## Before opening a pull request

```bash
npm ci
npm run format
npm run check
```

Check the changed flow in a browser. For playback or workbench changes, verify the actual relevant control rather than only its appearance. Check both interface languages when changing UI copy.

Use a concise commit message, such as `feat: add instrument search` or `fix: preserve comparison playhead`. In the pull request, explain what changed, why, and how it was checked. Include a screenshot for visible changes.

Ask one teammate to review, resolve feedback, and merge into `main`. Avoid force-pushing shared branches. Use small pull requests to reduce conflicts; do not refactor unrelated files during feature work.
