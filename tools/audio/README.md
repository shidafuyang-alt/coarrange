# Original theme sources

These scripts document the procedural original composition, independent of the later ACE-Step arrangements.

Run `python3 tools/audio/compose.py` from the repository root to create the original score JSON and MIDI files in `artifacts/audio/`. No Python dependencies are required.

`render.swift` renders one score using built-in macOS instruments. It requires macOS and Apple command-line developer tools. Compile it with `swiftc tools/audio/render.swift -o artifacts/audio/render-audio`, then run `artifacts/audio/render-audio artifacts/audio/pop.json artifacts/audio/pop.wav`. The finished frontend works on other operating systems and does not require Swift.

Prepared AI arrangements are bundled for playback; their generation records are in `docs/audio/`. Model checkpoints and isolated machine-learning environments are intentionally excluded.
