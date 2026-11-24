# Melody-locked remixes

Builds the five `song-*.m4a` remixes from the bundled 20-second excerpt.

1. `python -m demucs -n htdemucs -d cpu src.wav` separates vocals, drums, bass and other.
2. `transcribe.py vocals.wav melody.json` tracks pitch with CREPE and segments notes.
3. `arrange.py melody.json SAMPLE_DIR web/assets/instruments OUT` renders every style on the source timeline (96 BPM, first beat 0.053 s). Chords were read by hand from the separated bass and backing.
4. `evaluate.py melody.json file.wav ...` reports melody salience. Encode with `afconvert -f m4af -d aac -b 192000`.

Dependencies: demucs, torchcrepe, librosa, pyloudnorm, soundfile. Samples are not committed: VSCO 2 Community Edition (CC0) strings and harp; Salamander Grand Piano by Alexander Holm (CC BY). Rename each file to `<Folder>_<original name>`, for example `SoloViolin_LLVln_ArcoVib_A4_f.wav`, `Piano_C4_v5.flac`.

Arrangement rules are hand-written code, not live LLM output.
