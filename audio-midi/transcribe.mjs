/*
 * Hum transcription for CoArrange.
 * Pitch detection is Spotify Basic Pitch (@spotify/basic-pitch 1.0.1),
 * Copyright 2022 Spotify AB, Apache-2.0.
 * This file only calls that library and applies a small monophonic cleanup.
 */
import { BasicPitch, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';

const MIN_DURATION = 0.08;
const MIN_AMPLITUDE = 0.35;
const MERGE_GAP = 0.07;

const models = new Map();

function modelFor(modelUrl) {
  if (!models.has(modelUrl)) models.set(modelUrl, new BasicPitch(modelUrl));
  return models.get(modelUrl);
}

export function cleanupNotes(events) {
  const notes = events
    .filter(
      (note) =>
        note.durationSeconds >= MIN_DURATION &&
        note.amplitude >= MIN_AMPLITUDE &&
        note.pitchMidi >= 43 &&
        note.pitchMidi <= 88,
    )
    .map((note) => ({
      pitch: note.pitchMidi,
      start: note.startTimeSeconds,
      end: note.startTimeSeconds + note.durationSeconds,
      amplitude: note.amplitude,
    }))
    .sort((a, b) => a.start - b.start || b.amplitude - a.amplitude);

  const mono = [];
  for (const note of notes) {
    const previous = mono.at(-1);
    if (!previous || note.start >= previous.end - 0.02) {
      mono.push({ ...note });
      continue;
    }
    if (note.amplitude > previous.amplitude) {
      if (note.start - previous.start >= MIN_DURATION) {
        previous.end = note.start;
        mono.push({ ...note });
      } else {
        mono[mono.length - 1] = { ...note };
      }
    }
  }

  const merged = [];
  for (const note of mono) {
    const previous = merged.at(-1);
    if (previous && previous.pitch === note.pitch && note.start - previous.end <= MERGE_GAP) {
      previous.end = Math.max(previous.end, note.end);
      previous.amplitude = Math.max(previous.amplitude, note.amplitude);
    } else {
      merged.push({ ...note });
    }
  }
  return merged
    .filter((note) => note.end - note.start >= MIN_DURATION)
    .map((note) => ({
      pitch: note.pitch,
      start: round(note.start),
      duration: round(note.end - note.start),
      velocity: Math.max(48, Math.min(112, Math.round(note.amplitude * 127))),
      confidence: round(note.amplitude),
    }));
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function vlq(value) {
  let n = value;
  const bytes = [n & 127];
  while ((n >>= 7)) bytes.unshift((n & 127) | 128);
  return bytes;
}

function int32(value) {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

export function notesToMidi(notes) {
  const ticksPerSecond = 480 * 2;
  const tempo = 500000;
  const events = [
    {
      t: 0,
      m: [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255],
    },
    { t: 0, m: [0xc0, 0] },
  ];
  for (const note of notes) {
    const on = Math.max(0, Math.round(note.start * ticksPerSecond));
    const off = Math.max(
      on + 1,
      Math.round((note.start + Math.max(0.05, note.duration)) * ticksPerSecond),
    );
    events.push(
      { t: on, m: [0x90, note.pitch, note.velocity] },
      { t: off, m: [0x80, note.pitch, 0] },
    );
  }
  events.sort((a, b) => a.t - b.t || a.m[0] - b.m[0]);
  const data = [];
  let last = 0;
  for (const event of events) {
    data.push(...vlq(event.t - last), ...event.m);
    last = event.t;
  }
  data.push(0, 0xff, 0x2f, 0);
  return Uint8Array.from([
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    1,
    224,
    0x4d,
    0x54,
    0x72,
    0x6b,
    ...int32(data.length),
    ...data,
  ]);
}

export async function transcribeSamples(samples, modelUrl) {
  if (!(samples instanceof Float32Array) || !samples.length) {
    return {
      ok: false,
      notes: [],
      midi: new Uint8Array(),
      message: '录音是空的',
    };
  }
  let energy = 0;
  for (let i = 0; i < samples.length; i += 16) energy += samples[i] * samples[i];
  const rms = Math.sqrt(energy / Math.ceil(samples.length / 16));
  if (rms < 0.004) {
    return {
      ok: false,
      notes: [],
      midi: new Uint8Array(),
      message: '没有检测到足够的声音。请靠近麦克风，哼一段清晰的旋律后再试。',
    };
  }
  const frames = [];
  const onsets = [];
  const contours = [];
  await modelFor(modelUrl).evaluateModel(
    samples,
    (frame, onset, contour) => {
      frames.push(...frame);
      onsets.push(...onset);
      contours.push(...contour);
    },
    () => {},
  );
  const detected = frames.length
    ? noteFramesToTime(outputToNotesPoly(frames, onsets, 0.5, 0.3, 5, true, 1200, 70, true))
    : [];
  const notes = cleanupNotes(detected);
  if (!notes.length) {
    return {
      ok: false,
      notes: [],
      midi: new Uint8Array(),
      message: '没有识别出稳定的音高。请哼得稍慢一些，并尽量减少背景噪声。',
    };
  }
  return {
    ok: true,
    notes,
    midi: notesToMidi(notes),
    message: '已从这段录音中识别出旋律。请先试听，再生成伴奏。',
  };
}
