"""Melody-locked arrangements: every style renders the SAME transcribed vocal line.

Usage: arrange.py melody.json SAMPLE_DIR REPO_INSTRUMENTS_DIR OUT_DIR [style ...]
SAMPLE_DIR holds VSCO 2 CE strings/harp (CC0) and Salamander piano (CC BY).
"""
import glob
import json
import os
import re
import sys

import librosa
import numpy as np
import pyloudnorm
import soundfile as sf
from scipy.ndimage import gaussian_filter1d
from scipy.signal import butter, fftconvolve, sosfilt

SR, LEN = 44100, 20.0
BEAT, T0 = 0.625, 0.053  # 96 BPM, measured from the drum stem
N = int(SR * LEN)
rng = np.random.default_rng(11)
mel_path, SMP, INST, OUT = sys.argv[1:5]
M = json.load(open(mel_path))
NOTES = M["notes"]
NAME = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
# Harmony measured from the bass/other stems; four-beat chords begin on beat index 1.
DB, BBM, F7, GB = [49, 53, 56, 60], [46, 53, 56, 61], [41, 45, 51, 60], [42, 49, 53, 58]
BARS = [DB, BBM, F7, GB, DB, BBM, F7, GB]
ROOT = [37, 34, 29, 30, 37, 34, 29, 30]


def tb(b):
    return T0 + b * BEAT


def f2m(f):
    return 69 + 12 * np.log2(f / 440)


# ---------------------------------------------------------------- samples
cache = {}


def trim(y):
    e = np.abs(y).max(1) if y.ndim > 1 else np.abs(y)
    i = np.argmax(e > e.max() * 0.03)
    return y[max(0, i - 100):]


def load(path):
    y, sr = librosa.load(path, sr=SR, mono=False)
    y = np.atleast_2d(y)
    y = np.vstack([y, y]) if len(y) == 1 else y[:2]
    return trim(y.T[: SR * 9])


def pitch_of(y, guess):
    """Measured pitch near the labelled one, so octave labels cannot mislead us."""
    mono = y[int(0.15 * SR): int(1.3 * SR)].mean(1)
    f, v, p = librosa.pyin(mono, sr=SR, fmin=librosa.midi_to_hz(guess - 13), fmax=librosa.midi_to_hz(guess + 13), frame_length=4096 if guess > 40 else 8192)
    return float(np.nanmedian(f2m(f[v]))) if v.any() else float(guess)


def bank(name):
    if name in cache:
        return cache[name]
    out = []
    if name in ("violin", "violins", "cello", "harp", "piano", "pianof"):
        pre = {"violin": "SoloViolin", "violins": "ViolinSection", "cello": "CelloSection", "harp": "Harp", "piano": "Piano", "pianof": "Piano"}[name]
        for f in sorted(glob.glob(f"{SMP}/{pre}_*")):
            b = os.path.basename(f)
            if name == "violin" and not b.endswith("_f.wav"):
                continue
            if name in ("violins", "cello") and ("_v1" not in b or b.endswith("_2.wav")):
                continue
            if name == "piano" and "_v5" not in b or name == "pianof" and "_v9" not in b:
                continue
            k = re.search(r"_([A-G])(s|#)?(\d)_", b)
            p = NAME[k[1]] + (1 if k[2] else 0) + 12 * (int(k[3]) + 1)
            if name in ("violins", "cello"):
                p += 12  # these sets count C3 as middle C
            y = load(f)
            if name not in ("piano", "pianof", "harp"):
                p = pitch_of(y, p)
            out.append((p, y))
    elif name == "erhu":
        out = [(pitch_of(y, p), y) for p, y in ((69, load(f"{INST}/erhu-A4.wav")), (76, load(f"{INST}/erhu-E5.wav")))]
    else:
        out = [((o + 1) * 12, load(f"{INST}/{name}-C{o}.mp3")) for o in range(2, 7)]
    # Level-match samples on their body so the line does not jump between roots.
    lvl = [np.sqrt(np.mean(y[int(0.05 * SR): int(1.0 * SR)] ** 2)) + 1e-9 for _, y in out]
    out = [(p, y * 0.1 / l) for (p, y), l in zip(out, lvl)]
    cache[name] = out
    return out


def read(y, pos, loop):
    n = len(y)
    if loop and pos[-1] >= n - 2:  # ping-pong the steady middle
        a, b = 0.35 * n, 0.75 * n
        over = pos > b
        ph = np.mod(pos[over] - b, 2 * (b - a))
        pos = pos.copy()
        pos[over] = np.where(ph < b - a, b - ph, a + ph - (b - a))
    pos = np.clip(pos, 0, n - 2)
    i = pos.astype(int)
    f = (pos - i)[:, None]
    return y[i] * (1 - f) + y[i + 1] * f


# ---------------------------------------------------------------- tracks
class Mix:
    def __init__(self):
        self.dry = np.zeros((N + SR * 4, 2))
        self.wet = np.zeros((N + SR * 4, 2))

    def put(self, y, t, pan=0.0, send=0.25):
        a = int(round(t * SR))
        if a < 0:
            y, a = y[-a:], 0
        y = y[: max(0, len(self.dry) - a)]
        g = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * 1.414
        self.dry[a: a + len(y)] += y * g
        self.wet[a: a + len(y)] += y * g * send

    def note(self, inst, p, t, d, v=0.6, pan=0.0, send=0.25, attack=0.004, release=0.25, human=0.008):
        t += rng.normal(0, human) if human else 0
        v *= 1 + rng.normal(0, 0.05)
        root, y = min(bank(inst), key=lambda s: abs(s[0] - p))
        n = int((d + release) * SR)
        r = 2 ** ((p - root) / 12)
        sustained = inst in ("violin", "violins", "cello", "erhu", "strings", "sax", "flute")
        s = read(y, np.arange(n) * r, sustained)
        e = np.ones(n)
        a = max(1, int(attack * SR))
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
        k = int(release * SR)
        e[-k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
        self.put(s * e[:, None] * v, t, pan, send)

    def sing(self, inst, shift, gain, pan=0.0, send=0.3, expr=0.75, t0=0, t1=99, synth=None):
        """A continuous lead that follows the singer's own pitch curve and dynamics."""
        ns = [n for n in NOTES if t0 <= n["time"] < t1]
        # phrases = runs of notes less than 120 ms apart
        phrases, cur = [], []
        for n in ns:
            if cur and n["time"] - cur[-1]["time"] - cur[-1]["duration"] > 0.12:
                phrases.append(cur)
                cur = []
            cur.append(n)
        phrases.append(cur)
        contour = np.array([np.nan if c is None else c for c in M["contour"]])
        level = gaussian_filter1d(np.array(M["level"]), 3)
        top = np.percentile(level, 95)
        for ph in phrases:
            s0, s1 = ph[0]["time"], ph[-1]["time"] + ph[-1]["duration"] + 0.10
            fr = np.arange(int(s0 * 100), int(np.ceil(s1 * 100)) + 2)
            target = np.empty(len(fr))
            for i, k in enumerate(fr):
                n = [x for x in ph if x["time"] <= k / 100 + 1e-6] or [ph[0]]
                target[i] = n[-1]["pitch"]
            src = np.array([contour[k] if k < len(contour) else np.nan for k in fr])
            dev = np.where(np.isfinite(src) & (abs(src - target) < 1.6), src - target, 0)
            # notes stay in tune; scoops and slides keep the singer's phrasing
            curve = gaussian_filter1d(target, 1.6, mode="nearest") + expr * gaussian_filter1d(np.clip(dev, -0.45, 0.45), 2, mode="nearest") * 0.7 + shift
            amp = 10 ** (np.clip(np.array([level[min(k, len(level) - 1)] for k in fr]) - top, -16, 1.5) * 0.62 / 20)
            n = int((s1 - s0) * SR)
            x = np.arange(n) / SR * 100
            pc = np.interp(x, np.arange(len(fr)), curve)
            am = np.interp(x, np.arange(len(fr)), amp)
            fade = np.ones(n)
            a, r = int(0.035 * SR), int(0.12 * SR)
            fade[:a] = np.linspace(0, 1, a) ** 0.7
            fade[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
            if synth:
                y = synth(440 * 2 ** ((pc - 69) / 12))
                y = np.stack([y, y], 1)
            else:
                # crossfade between sample roots, choosing a root per note
                y = np.zeros((n, 2))
                X = int(0.045 * SR)
                for j, nt in enumerate(ph):
                    a0 = int((nt["time"] - s0) * SR) - (X // 2 if j else 0)
                    b0 = int((ph[j + 1]["time"] - s0) * SR) + X // 2 if j + 1 < len(ph) else n
                    a0, b0 = max(0, a0), min(n, b0)
                    root, smp = min(bank(inst), key=lambda s: abs(s[0] - nt["pitch"] - shift))
                    start = (0.04 if j == 0 else 0.16) * SR  # legato notes skip the bow attack
                    pos = start + np.cumsum(2 ** ((pc[a0:b0] - root) / 12))
                    seg = read(smp, pos, True)
                    w = np.ones(b0 - a0)
                    if j and len(w) > X:
                        w[:X] = np.sin(np.linspace(0, np.pi / 2, X))
                    if j + 1 < len(ph) and len(w) > X:
                        w[-X:] *= np.cos(np.linspace(0, np.pi / 2, X))
                    y[a0:b0] += seg * w[:, None]
            self.put(y * (am * fade)[:, None] * gain, s0, pan, send)

    def render(self, path, rt=2.0, damp=5200, lufs=-21, drive=1.0):
        n = int(SR * rt * 1.2)
        t = np.arange(n) / SR
        ir = rng.normal(size=(n, 2)) * np.exp(-6.9 * t / rt)[:, None]
        ir = sosfilt(butter(2, damp, fs=SR, output="sos"), ir, axis=0)
        ir = sosfilt(butter(1, 180, "high", fs=SR, output="sos"), ir, axis=0)
        ir[: int(0.018 * SR)] = 0
        for d, g in ((0.011, 0.5), (0.019, 0.4), (0.027, 0.32), (0.041, 0.25)):
            ir[int(d * SR), 0] += g * 6
            ir[int(d * 1.13 * SR), 1] += g * 6
        ir /= np.sqrt((ir**2).sum(0))
        wet = np.stack([fftconvolve(self.wet[:, c], ir[:, c])[: len(self.wet)] for c in (0, 1)], 1)
        y = (self.dry + wet)[:N]
        y = sosfilt(butter(2, 32, "high", fs=SR, output="sos"), y, axis=0)
        y[-int(0.5 * SR):] *= np.cos(np.linspace(0, np.pi / 2, int(0.5 * SR)))[:, None] ** 2
        y[: int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))[:, None]
        meter = pyloudnorm.Meter(SR)
        for _ in range(3):
            y *= 10 ** ((lufs - meter.integrated_loudness(y)) / 20)
            # soft knee above -3 dBFS, ceiling -1 dBFS
            a = np.abs(y)
            y = np.where(a > 0.7, np.sign(y) * (0.7 + 0.19 * np.tanh((a - 0.7) / 0.19)), y)
        sf.write(path, y, SR, subtype="PCM_16")
        print(os.path.basename(path), "LUFS %.1f peak %.2f" % (meter.integrated_loudness(y), np.abs(y).max()))


# ---------------------------------------------------------------- drums
def env(n, t):
    return np.exp(-np.arange(n) / SR / t)


def hp(y, f):
    return sosfilt(butter(2, f, "high", fs=SR, output="sos"), y)


def drum(kind):
    if kind == "kick":
        n = int(0.32 * SR)
        f = 46 + 110 * env(n, 0.028)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.11)
        y[:200] += hp(rng.normal(size=200), 2000) * 0.15 * np.linspace(1, 0, 200)
    elif kind == "clap":
        n = int(0.22 * SR)
        e = sum(np.roll(env(n, 0.009), int(d * SR)) * (np.arange(n) >= int(d * SR)) for d in (0, 0.011, 0.022)) + 0.6 * env(n, 0.06)
        y = sosfilt(butter(2, [900, 3800], "band", fs=SR, output="sos"), rng.normal(size=n)) * e * 0.6
    elif kind == "brush":
        n = int(0.28 * SR)
        y = sosfilt(butter(2, [1200, 7000], "band", fs=SR, output="sos"), rng.normal(size=n)) * np.minimum(1, np.arange(n) / (0.02 * SR)) * env(n, 0.07) * 0.4
    elif kind == "rim":
        n = int(0.06 * SR)
        y = (np.sin(2 * np.pi * 1700 * np.arange(n) / SR) + 0.5 * rng.normal(size=n)) * env(n, 0.009) * 0.5
    else:
        n = int((0.28 if kind == "open" else 0.06) * SR)
        y = hp(rng.normal(size=n), 7500) * env(n, 0.09 if kind == "open" else 0.016) * 0.5
    return np.stack([y, y], 1)


def chord_at(i):
    return BARS[i], ROOT[i], 1 + 4 * i


def vl(bar, lo=58, n=4):
    """Compact voicing whose lowest tone is near lo, keeping common tones between chords."""
    pcs = sorted({p % 12 for p in BARS[bar]})
    ps = sorted(p for k in pcs for p in range(k + 36, 100, 12) if p >= lo)
    return ps[:n]


# ---------------------------------------------------------------- styles
def chamber():
    m = Mix()
    m.sing("violin", 12, 2.3, pan=-0.08, send=0.34, expr=0.85)
    # second half: violin section doubles the tune an octave below
    m.sing("violins", 12, 0.75, pan=0.2, send=0.4, expr=0.4, t0=9.9)
    m.sing("cello", 0, 0.45, pan=0.25, send=0.35, expr=0.4, t0=11.5)
    m.note("piano", 49, tb(0), 1.4, 0.42, send=0.3)
    for i in range(8):
        c, r, b = chord_at(i)
        full = i >= 4
        dyn = [0.34, 0.5, 0.56, 0.62, 0.72, 0.78, 0.82, 0.8][i]
        up = vl(i, 53)
        dur = 4 * BEAT
        for k, p in enumerate(up):
            m.note("violins", p, tb(b), dur, 0.105 * dyn * (1.5 if full else 1.1), pan=[-0.5, -0.2, 0.3, 0.5][k], send=0.5, attack=0.22, release=0.45, human=0.02)
        bass = r + 12 if r < 36 else r
        m.note("cello", bass, tb(b), dur, 0.32 * dyn, pan=0.32, send=0.4, attack=0.10, release=0.4)
        if i >= 1:  # the song's eighth-note bass pulse, re-scored for piano left hand
            for e in range(8):
                m.note("piano", r if e % 2 == 0 else r + 12, tb(b + e / 2), 0.36, (0.36 if e % 4 == 0 else 0.25) * dyn, pan=-0.15, send=0.2)
        arp = [up[0] - 12, up[1] - 12, up[2] - 12, up[0], up[1], up[0], up[2] - 12, up[1] - 12]
        if i == 0:  # the track's stop-time bar: rolled chords only
            for k, p in enumerate([49, 56, 60, 65, 68]):
                m.note("harp", p, tb(b) + k * 0.06, 2.0, 0.34, pan=0.4, send=0.5, release=1.2)
                m.note("piano", p, tb(b + 2) + k * 0.02, 1.2, 0.22, send=0.3)
        else:
            for e in range(8):
                m.note("piano", arp[e], tb(b + e / 2), 0.9, 0.33 * dyn * (1.15 if e % 4 == 0 else 1), pan=-0.2, send=0.28, release=0.5)
        if full:
            for e in range(16):
                p = up[[0, 1, 2, 3, 2, 1, 2, 3][e % 8]] + (12 if e % 8 in (3, 7) else 0)
                m.note("harp", p, tb(b + e / 4), 0.5, 0.11 * dyn, pan=0.45, send=0.4, release=0.6)
            for e in (1, 3):  # backbeat accents where the snare was
                for p in up[:3]:
                    m.note("pianof", p, tb(b + e), 0.3, 0.2 * dyn, pan=-0.2, send=0.25)
    # cello answers the singer in the two vocal gaps
    for t, p, d in ((11.6, 57, .5), (12.1, 60, .5), (12.6, 63, .7)):
        m.note("cello", p, tb(t), d * BEAT, 0.5, pan=0.3, send=0.4, attack=0.05, release=0.2)
    m.render(f"{OUT}/song-chamber.wav", rt=2.1)


def nocturne():
    m = Mix()
    for n in NOTES:
        v = 0.45 + 0.5 * (n["velocity"] - 45) / 59
        if n["duration"] < 0.09:
            v *= 0.75
        m.note("pianof", n["pitch"] + 12, n["time"], n["duration"] + 0.25, v * 1.25, pan=0.12, send=0.34, release=0.45, human=0.003)
        if n["time"] > 9.9 and n["duration"] > 0.2:
            m.note("piano", n["pitch"] + 24, n["time"], n["duration"] + 0.2, v * 0.36, pan=0.2, send=0.4, release=0.5, human=0.003)
    for i in range(8):
        c, r, b = chord_at(i)
        dyn = 0.75 if i < 4 else 1
        wide = [r, r + 12 + (7 if i != 2 and i != 6 else 7), *[p for p in vl(i, 55, 3)]]
        pat = [0, 1, 2, 3, 4, 3, 2, 1] if i else [0, 1, 2, 3, 4, 4, 3, 2]
        for e in range(8):
            m.note("piano", wide[pat[e]], tb(b + e / 2), 2.2 - e * 0.2, (0.48 if e == 0 else 0.3) * dyn, pan=-0.15, send=0.34, release=0.6)
    m.note("piano", 42, tb(0), 0.6, 0.3)
    m.render(f"{OUT}/song-nocturne.wav", rt=1.7)


def erhu():
    m = Mix()
    m.sing("erhu", 12, 1.6, send=0.26, expr=1.0)
    k, cl, oh, ch = drum("kick"), drum("clap"), drum("open"), drum("hat")
    for b in range(32):
        if not 2 <= b <= 4:
            m.put(k * 0.42, tb(b), 0, 0)
            m.put(oh * 0.16, tb(b + 0.5), 0.2, 0.05)
            for q in (0.25, 0.75):
                m.put(ch * 0.10, tb(b + q), -0.25, 0.02)
        if b % 2 == 0 and b > 4:
            m.put(cl * 0.34, tb(b), 0.05, 0.12)
    for q in range(4):  # fill back into the drop
        m.put(cl * (0.14 + 0.06 * q), tb(4 + q / 4), 0.05, 0.1)
    for i in range(8):
        c, r, b = chord_at(i)
        for e in range(8):
            if i or e < 1:
                m.note("bass", r + (12 if e % 2 else 0) + (0 if r > 33 else 12), tb(b + e / 2), 0.24, 0.62, send=0.02, release=0.06, human=0)
        up = vl(i)
        for p in up:
            m.note("violins", p, tb(b), 4 * BEAT, 0.07, pan=0.3, send=0.35, attack=0.1, release=0.3)
        for e in (0.5, 1.5, 2.25, 3.5):
            if i:
                for p in up[:3]:
                    m.note("clean", p, tb(b + e), 0.10, 0.2, pan=-0.45, send=0.08, release=0.05, human=0.003)
        if i in (3, 7, 5):  # disco-string octave run
            for q, p in enumerate([up[0], up[1], up[2], up[3], up[0] + 12, up[3], up[2], up[1]]):
                m.note("violins", p + 12, tb(b + 2 + q / 4), 0.16, 0.16, pan=0.4, send=0.3, attack=0.02, release=0.08)
    m.render(f"{OUT}/song-erhu.wav", rt=1.1, lufs=-21)


def pulse(duty):
    def f(hz):
        ph = np.cumsum(hz) / SR
        y = sum((2 / (h * np.pi)) * np.sin(np.pi * h * duty) * np.cos(2 * np.pi * h * ph) * (hz * h < 15000) for h in range(1, 28))
        return y * 0.2
    return f


def tri(p, d):
    n = int(d * SR)
    ph = np.arange(n) / SR * 440 * 2 ** ((p - 69) / 12)
    y = 2 * np.abs(2 * (ph % 1) - 1) - 1
    y = np.round(y * 8) / 8
    e = np.minimum(1, np.minimum(np.arange(n), np.arange(n)[::-1]) / 120)
    return np.stack([y * e, y * e], 1)


def chip():
    m = Mix()
    m.sing(None, 12, 0.85, send=0.06, expr=0.25, synth=pulse(0.25))
    m.sing(None, 24, 0.16, pan=0.4, send=0.1, expr=0.1, synth=pulse(0.5), t0=9.9)
    k, h, c_ = drum("kick"), drum("hat"), drum("clap")
    for i in range(8):
        c, r, b = chord_at(i)
        up = vl(i)
        for e in range(16):
            y = pulse(0.125)(np.full(int(0.13 * SR), 440 * 2 ** ((up[[0, 1, 2, 3][e % 4]] + 12 - 69) / 12)))
            y *= env(len(y), 0.06)
            m.put(np.stack([y, y], 1) * 0.28, tb(b + e / 4), -0.4 if e % 2 else 0.4, 0.05)
        for e in range(8):
            if i or e == 0:
                m.put(tri(r + (12 if e % 4 == 3 else 0) + 12, 0.25) * 0.13, tb(b + e / 2), 0, 0)
        for e in range(4):
            if i:
                m.put((c_ if e % 2 else k) * 0.3, tb(b + e), 0, 0)
            for q in (0, 0.5):
                m.put(h * 0.12, tb(b + e + q), 0.2, 0)
    m.render(f"{OUT}/song-chip.wav", rt=0.5, lufs=-21)


def lofi():
    m = Mix()
    m.sing("sax", 0, 1.1, pan=0.1, send=0.3, expr=0.9)
    br, rim, k, h = drum("brush"), drum("rim"), drum("kick"), drum("hat")
    sw = 0.62
    for i in range(8):
        c, r, b = chord_at(i)
        up = vl(i, 56)
        ninth = (r % 12 + 2) % 12
        col = up[:3] + [next(p for p in range(66, 90) if p % 12 == (ninth if i % 4 in (0, 3) else up[3] % 12))]
        for e, d in ((0, 1.6), (1 + sw, 0.5), (2 + sw, 1.2)):
            for q, p in enumerate(col):
                m.note("rhodes", p, tb(b + e) + q * 0.008, d * BEAT, 0.28, pan=-0.2, send=0.2, release=0.2)
        walk = [r, r + 7, r + 12, (ROOT[(i + 1) % 8]) + 1]
        for e, p in enumerate(walk):
            m.note("bass", p if p > 31 else p + 12, tb(b + e), 0.5, 0.6, send=0.04, release=0.1)
        if i:
            for e in range(4):
                m.put(br * (0.22 if e % 2 else 0.1), tb(b + e), -0.1, 0.1)
                m.put(h * 0.1, tb(b + e), 0.25, 0.04)
                m.put(h * 0.06, tb(b + e + sw), 0.25, 0.04)
                if e in (0, 2):
                    m.put(k * 0.2, tb(b + e + (0 if e == 0 else 0.0)), 0, 0)
            m.put(rim * 0.14, tb(b + 3 + sw), 0.3, 0.15)
    m.render(f"{OUT}/song-lofi.wav", rt=1.2, damp=3800, lufs=-21)


if __name__ == "__main__":
    for s in sys.argv[5:] or ["chamber", "nocturne", "erhu", "chip", "lofi"]:
        globals()[s]()
