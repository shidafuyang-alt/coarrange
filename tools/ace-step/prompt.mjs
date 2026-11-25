const BEFORE_FEATURES =
  'Lyrical instrumental for solo piano and one violin, with a quiet cello holding the harmony. One clear singing melody leads throughout';
const AFTER_FEATURES =
  'Begin with a brief, purposeful instrumental introduction. Present a clear and memorable recurring melodic theme, then develop it through motivic development and melodic variation. Let the harmony progress naturally and the emotion grow gradually. Bring the main theme back in a recognizable return, then resolve it with a satisfying musical ending and a natural outro. Keep the accompaniment restrained so it supports the melody instead of competing with it. Intimate acoustic room. No singing, no drums, no percussion, no electronics, no extra instruments.';
const MOTIFS = {
  '1,-1,1': 'a little up-and-down turn',
  '-1,1,-1': 'a little down-and-up turn',
  '1,1,-1': 'two upward steps that turn back',
  '-1,-1,1': 'two downward steps that turn back',
  '1,-1,-1': 'an upward step followed by a fall',
  '-1,1,1': 'a downward step followed by a rise',
  '1,1,1': 'a short climb',
  '-1,-1,-1': 'a short descent',
};

export function melodyBrief(notes) {
  const ordered = [...notes].sort((a, b) => (a.start ?? a.time ?? 0) - (b.start ?? b.time ?? 0));
  const pitches = ordered.map((note) => note.pitch);
  const starts = ordered.map((note) => note.start ?? note.time ?? 0);
  const durations = ordered.map((note) => note.duration);
  const moves = pitches.slice(1).map((pitch, index) => pitch - pitches[index]);
  const begin = starts[0] || 0;
  const finish = starts.at(-1) + durations.at(-1);
  const spanTime = Math.max(0.001, finish - begin);
  const opening = arc(pitches, starts, begin, begin + spanTime / 3);
  const middle = arc(pitches, starts, begin + spanTime / 3, begin + (2 * spanTime) / 3);
  const ending = arc(pitches, starts, begin + (2 * spanTime) / 3, finish + 0.001);
  const leaps = moves.filter((move) => Math.abs(move) >= 5).length;
  const steps = moves.filter((move) => Math.abs(move) > 0 && Math.abs(move) <= 2).length;
  let motion = 'by a mix of steps and small leaps';
  if (!moves.length) motion = 'almost in place';
  else if (leaps >= 3 && leaps * 2 >= steps) motion = 'with several clear leaps';
  else if (steps >= moves.length * 0.6) motion = 'mostly by step';
  const motif = motifSentence(moves);
  const shortShare = durations.filter((duration) => duration < 0.3).length / durations.length;
  const held = durations.filter((duration) => duration >= 0.7).length;
  let rhythm = 'The rhythm alternates quicker notes with notes that sit a little longer.';
  if (shortShare >= 0.65) rhythm = 'The rhythm is light and mostly quick.';
  else if (held >= 2) rhythm = 'The rhythm leaves room for a few longer notes.';
  let breaths = 0;
  for (let index = 1; index < ordered.length; index++) {
    const gap = starts[index] - (starts[index - 1] + durations[index - 1]);
    if (gap > 0.45) breaths += 1;
  }
  let phrase = 'Several pauses give it more than one phrase.';
  if (breaths === 0) phrase = 'It is delivered as one continuous phrase.';
  else if (breaths === 1) phrase = 'One clear pause divides it into two phrases.';
  let length = 'The hummed line is extended and keeps spinning onward.';
  if (spanTime < 12) length = 'The hummed line is brief.';
  else if (spanTime < 22) length = 'The hummed line has room to finish a thought.';
  const registerSpan = Math.max(...pitches) - Math.min(...pitches);
  let register = 'It travels across a wide register.';
  if (registerSpan <= 5) register = 'It stays in a very narrow register.';
  else if (registerSpan <= 9) register = 'It stays in a narrow register.';
  else if (registerSpan <= 14) register = 'It opens into a moderate register.';
  const first = `${length} The opening ${opening}, the middle ${middle}, and the close ${ending}. It moves ${motion}.`;
  const second = `${motif} ${rhythm} ${phrase} ${register}`;
  return { first, second, text: `${first} ${second}` };
}

export function pieceCaption(melody, wish) {
  const line = acceptMelody(melody);
  const bridge = line ? ` ${line}` : '';
  const request = cleanWish(wish);
  const extra = request ? ` Listener request: ${request}.` : '';
  return `${BEFORE_FEATURES}.${bridge} ${AFTER_FEATURES}${extra}`;
}

export function cachedMelody(value) {
  const melody = acceptMelody(value?.melody);
  return melody ? { melody } : null;
}

export async function filterWithDeepSeek(notes, key) {
  const brief = melodyBrief(notes);
  const fallback = brief.text;
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-flash',
      temperature: 0.2,
      max_tokens: 400,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You rewrite a hummed-melody brief into one or two English sentences. Keep what makes this specific line different: its length, opening-middle-close shape, stepwise or leaping motion, returning cell, rhythm, pauses, and register. Do not flatten it into a generic lyrical melody. Do not mention instruments, harmony, introduction, theme, return, outro, key, tempo, note counts, pitch names, octaves, or lists of intervals. Do not use digits. Output one JSON object.',
        },
        {
          role: 'user',
          content: `Brief: ${brief.text}
Output {"melody":"one or two English sentences","summary":"一句中文，不要数字"}.`,
        },
      ],
    }),
  });
  const text = await response.text();
  if (!response.ok) return { ok: false, error: `创作分析没有完成（HTTP ${response.status}）。` };
  let parsed;
  try {
    parsed = JSON.parse(JSON.parse(text).choices?.[0]?.message?.content || '');
  } catch {
    return { ok: false, error: '这次没能整理旋律特点，请再试一次。' };
  }
  return {
    ok: true,
    melody: acceptMelody(parsed.melody) || fallback,
    summary: String(parsed.summary || '')
      .replace(/\d/g, '')
      .slice(0, 240),
    raw: String(parsed.melody || ''),
    brief,
  };
}

function arc(pitches, starts, from, to) {
  const slice = pitches.filter((_, index) => starts[index] >= from && starts[index] < to);
  if (slice.length < 2) return 'holds';
  const net = slice.at(-1) - slice[0];
  const wiggle = slice
    .slice(1)
    .reduce((sum, pitch, index) => sum + Math.abs(pitch - slice[index]), 0);
  if (wiggle >= 8 && Math.abs(net) <= 2) return 'circles nearby notes';
  if (net >= 5) return 'climbs';
  if (net <= -5) return 'descends';
  if (net >= 2) return 'edges higher';
  if (net <= -2) return 'edges lower';
  return 'stays close';
}

function motifSentence(moves) {
  const counts = new Map();
  for (let index = 0; index <= moves.length - 3; index++) {
    const signs = moves.slice(index, index + 3).map((move) => Math.sign(move));
    if (signs.includes(0)) continue;
    const key = signs.join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let bestKey = '';
  let best = 0;
  for (const [key, count] of counts) {
    if (count > best) {
      best = count;
      bestKey = key;
    }
  }
  if (best < 2) return 'No small cell clearly returns.';
  const cell = MOTIFS[bestKey] || 'a small melodic cell';
  return `${cell.charAt(0).toUpperCase()}${cell.slice(1)} comes back.`;
}

function acceptMelody(value) {
  let text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (/\d/.test(text)) return '';
  if (/semitone|interval|octave|pitch range|note count|\[/i.test(text)) return '';
  if (/piano|violin|cello|drum|percussion|electronic|introduction|outro/i.test(text)) return '';
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 2);
  text = sentences.join(' ');
  if (!/[.!?]$/.test(text)) text += '.';
  if (text.length < 40 || text.length > 520) return '';
  return text;
}

function cleanWish(wish) {
  return String(wish || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}
