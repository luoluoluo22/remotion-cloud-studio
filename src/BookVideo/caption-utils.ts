export type CaptionCharacterTiming = {
  character: string;
  start: number;
  end: number;
};

export type CaptionSegment = {
  text: string;
  start: number;
  end: number;
  characters: CaptionCharacterTiming[];
};

type CaptionSentenceLike = {
  text?: string;
  start: number;
  end: number;
  characters?: CaptionCharacterTiming[];
};

type CaptionDataLike = {
  duration?: number;
  characterTimings?: CaptionCharacterTiming[];
  sentences?: CaptionSentenceLike[];
};

const BREAK_PUNCTUATION = /^[，,。．.!！?？；;：:、…⋯—–]+$/u;
const PUNCTUATION = /\p{P}/gu;

/** Remove punctuation from the visible caption only; narration and source text remain untouched. */
export const cleanCaptionText = (value: unknown): string =>
  String(value ?? "").replace(PUNCTUATION, "").replace(/\s+/gu, " ").trim();

const toTime = (value: unknown, fallback: number): number => {
  const time = Number(value);
  return Number.isFinite(time) ? time : fallback;
};

const makeSegment = (
  source: CaptionCharacterTiming[],
  start: number,
  end: number,
): CaptionSegment | null => {
  const text = cleanCaptionText(source.map((item) => item.character).join(""));
  if (!text) return null;
  const characters = Array.from(text).map((character) => ({ character, start, end }));
  return { text, start, end, characters };
};

/**
 * Build punctuation-delimited caption chunks from the original character timestamps.
 * Every visible character in a chunk shares the same interval, so existing template
 * renderers reveal the whole Chinese phrase together instead of karaoke-style glyphs.
 */
export const getActiveCaption = (
  data: CaptionDataLike,
  time: number,
): CaptionSegment | null => {
  const sentenceCharacters = (data.sentences ?? []).flatMap((sentence) =>
    Array.isArray(sentence.characters) ? sentence.characters : [],
  );
  const sourceCharacters =
    Array.isArray(data.characterTimings) && data.characterTimings.length
      ? data.characterTimings
      : sentenceCharacters;

  if (!sourceCharacters.length) {
    const sentences = data.sentences ?? [];
    for (let index = 0; index < sentences.length; index++) {
      const sentence = sentences[index];
      const start = toTime(sentence.start, 0);
      const nextStart = sentences[index + 1]
        ? toTime(sentences[index + 1].start, Number.POSITIVE_INFINITY)
        : toTime(data.duration, toTime(sentence.end, start));
      const end = Math.max(start + 0.01, Math.min(toTime(sentence.end, nextStart), nextStart));
      if (time < start || time >= end) continue;
      const text = cleanCaptionText(
        sentence.text ?? (sentence.characters ?? []).map((item) => item.character).join(""),
      );
      if (!text) return null;
      return {
        text,
        start,
        end,
        characters: Array.from(text).map((character) => ({ character, start, end })),
      };
    }
    return null;
  }

  const ordered = sourceCharacters
    .filter((item) => item && typeof item.character === "string")
    .slice()
    .sort((a, b) => Number(a.start) - Number(b.start));

  const segments: CaptionSegment[] = [];
  let current: CaptionCharacterTiming[] = [];
  let boundaryPending = false;

  const finishCurrent = (nextStart: number): void => {
    if (!current.length) return;
    const start = toTime(current[0].start, 0);
    const end = Math.max(start + 0.01, toTime(nextStart, toTime(current[current.length - 1].end, start + 0.01)));
    const segment = makeSegment(current, start, end);
    if (segment) segments.push(segment);
    current = [];
  };

  for (let index = 0; index < ordered.length; index++) {
    const item = ordered[index];
    const character = item.character;
    const previous = ordered[index - 1]?.character ?? "";
    const next = ordered[index + 1]?.character ?? "";
    const decimalPoint = character === "." && /\d/.test(previous) && /\d/.test(next);

    if (!decimalPoint && BREAK_PUNCTUATION.test(character)) {
      if (current.length) boundaryPending = true;
      continue;
    }

    const visible = character.replace(PUNCTUATION, "");
    if (!visible) continue;
    if (/^\\s+$/u.test(visible)) {
      if (current.length && !boundaryPending) current.push(item);
      continue;
    }

    if (boundaryPending && current.length) {
      finishCurrent(toTime(item.start, 0));
      boundaryPending = false;
    }

    current.push(item);
  }

  if (current.length) {
    const lastEnd = toTime(current[current.length - 1].end, 0);
    finishCurrent(Math.max(toTime(data.duration, lastEnd), lastEnd));
  }

  return segments.find((segment) => time >= segment.start && time < segment.end) ?? null;
};

type CaptionTokenTiming = {
  text: string;
  after?: string;
  start: number;
  end: number;
};

/** Select a complete punctuation-delimited phrase from word-timed narration tokens. */
export const getActiveTokenCaption = (
  tokens: CaptionTokenTiming[],
  time: number,
): string => {
  const segments: Array<{ text: string; start: number; end: number }> = [];
  let current: CaptionTokenTiming[] = [];
  let boundaryPending = false;

  const finishCurrent = (nextStart: number): void => {
    if (!current.length) return;
    const start = toTime(current[0].start, 0);
    const end = Math.max(
      start + 0.01,
      toTime(nextStart, toTime(current[current.length - 1].end, start + 0.01)),
    );
    const text = cleanCaptionText(
      current.map((token) => token.text + (token.after ?? "")).join(""),
    );
    if (text) segments.push({ text, start, end });
    current = [];
  };

  for (const token of tokens) {
    if (boundaryPending && current.length) {
      finishCurrent(toTime(token.start, 0));
      boundaryPending = false;
    }
    current.push(token);
    if (/[，,。．.!！?？；;：:、…⋯—–]/u.test(token.after ?? "")) {
      boundaryPending = true;
    }
  }

  if (current.length) {
    finishCurrent(toTime(current[current.length - 1].end, 0));
  }

  return segments.find((segment) => time >= segment.start && time < segment.end)?.text ?? "";
};
