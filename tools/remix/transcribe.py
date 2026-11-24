"""Vocal stem -> note list + pitch contour (JSON). Usage: transcribe.py vocals.wav melody.json"""
import json
import sys

import librosa
import numpy as np
import torch
import torchcrepe
from scipy.ndimage import gaussian_filter1d, median_filter

HOP = 160  # 10 ms at 16 kHz


def transcribe(path):
    y, _ = librosa.load(path, sr=16000)
    f0, pd = torchcrepe.predict(
        torch.tensor(y)[None], 16000, HOP, 60, 1000, "full", batch_size=512,
        return_periodicity=True, decoder=torchcrepe.decode.viterbi,
    )
    m = 69 + 12 * np.log2(f0[0].numpy() / 440)
    pd = torchcrepe.filter.median(pd, 5)[0].numpy()
    db = 20 * np.log10(librosa.feature.rms(y=y, frame_length=640, hop_length=HOP)[0][: len(m)] + 1e-6)
    voiced = (pd > 0.45) & (db > db.max() - 24)
    # Drop fragments shorter than 60 ms (breaths, reverb tails).
    edges = np.flatnonzero(np.diff(np.r_[0, voiced.astype(int), 0]))
    for a, b in zip(edges[::2], edges[1::2]):
        if b - a < 6:
            voiced[a:b] = False
    q = np.round(median_filter(m, 9)).astype(int)
    smooth = gaussian_filter1d(db, 1.5)
    notes, i = [], 0
    while i < len(q):
        if not voiced[i]:
            i += 1
            continue
        j = i
        while j < len(q) and voiced[j] and q[j] == q[i]:
            j += 1
        # A level dip inside a held pitch is a new syllable.
        cuts = [i]
        for k in range(i + 12, j - 10):
            w = smooth[k - 8 : k + 9]
            if smooth[k] == w.min() and min(smooth[max(i, k - 8)], smooth[min(j - 1, k + 8)]) - smooth[k] > 3.5 and k - cuts[-1] > 12:
                cuts.append(k)
        for a, b in zip(cuts, cuts[1:] + [j]):
            if b - a >= 6:
                notes.append([a / 100, (b - a) / 100, int(q[i]), float(db[a:b].mean())])
        i = j
    # A slide can momentarily pass through a pitch; extend neighbours across gaps up to 60 ms.
    for a, b in zip(notes, notes[1:]):
        if 0 < b[0] - (a[0] + a[1]) <= 0.06:
            a[1] = round(b[0] - a[0], 3)
    loud = max(n[3] for n in notes)
    return {
        "notes": [{"time": n[0], "duration": n[1], "pitch": n[2], "velocity": int(np.clip(104 + 2.2 * (n[3] - loud), 45, 104))} for n in notes],
        "contour": [round(float(a), 2) if v else None for a, v in zip(m, voiced)],
        "level": [round(float(a), 1) for a in db],
    }


if __name__ == "__main__":
    out = transcribe(sys.argv[1])
    json.dump(out, open(sys.argv[2], "w"))
    print(len(out["notes"]), "notes")
