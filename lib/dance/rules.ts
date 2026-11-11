import type { Difficulty, PromptMode, Rating } from "./types";

/** Beats of music before the first word (2 bars, with a 3-2-1 count-in). */
export const LEAD_IN_BEATS = 8;
/** Beats of music after the last word. */
export const OUTRO_BEATS = 8;

export type DifficultyPreset = {
  label: string;
  description: string;
  beatsPerRound: number;
  /** first = show first letter + slots, slots = only letter count, none = nothing */
  hint: "first" | "slots" | "none";
  /** Colour the input red as soon as the spelling goes wrong. */
  liveCheck: boolean;
  windowScale: number;
};

export const DIFFICULTIES: Record<Difficulty, DifficultyPreset> = {
  easy: {
    label: "Dễ",
    description: "12 nhịp mỗi từ · gợi ý chữ cái đầu",
    beatsPerRound: 12,
    hint: "first",
    liveCheck: true,
    windowScale: 1.35,
  },
  normal: {
    label: "Vừa",
    description: "8 nhịp mỗi từ · gợi ý số chữ cái",
    beatsPerRound: 8,
    hint: "slots",
    liveCheck: true,
    windowScale: 1,
  },
  hard: {
    label: "Khó",
    description: "6 nhịp mỗi từ · không gợi ý",
    beatsPerRound: 6,
    hint: "none",
    liveCheck: false,
    windowScale: 0.75,
  },
};

export const PROMPT_MODES: Record<
  PromptMode,
  { label: string; description: string }
> = {
  meaning: {
    label: "Nhìn nghĩa → gõ từ",
    description: "Hiện nghĩa tiếng Việt + hình, gõ từ tiếng Anh",
  },
  listen: {
    label: "Nghe → gõ từ",
    description: "Máy đọc từ tiếng Anh, học sinh gõ lại (chính tả)",
  },
  copy: {
    label: "Nhìn từ → gõ lại",
    description: "Hiện sẵn từ tiếng Anh, luyện gõ cho bé mới học",
  },
};

export const ROUND_OPTIONS = [8, 12, 16, 20, 24] as const;

export type Timing = {
  bpm: number;
  beatSec: number;
  beatsPerRound: number;
  leadInBeats: number;
  outroBeats: number;
  rounds: number;
  totalBeats: number;
  durationSec: number;
};

export function makeTiming(
  bpm: number,
  beatsPerRound: number,
  rounds: number,
  leadInBeats = LEAD_IN_BEATS,
  outroBeats = OUTRO_BEATS
): Timing {
  const beatSec = 60 / bpm;
  const totalBeats = leadInBeats + rounds * beatsPerRound + outroBeats;
  return {
    bpm,
    beatSec,
    beatsPerRound,
    leadInBeats,
    outroBeats,
    rounds,
    totalBeats,
    durationSec: totalBeats * beatSec,
  };
}

export const roundStartBeat = (t: Timing, round: number) =>
  t.leadInBeats + round * t.beatsPerRound;

/** The beat on which the student must press Enter: the last beat of the round. */
export const targetBeat = (t: Timing, round: number) =>
  roundStartBeat(t, round) + t.beatsPerRound - 1;

/** -1 during the count-in, `rounds` during the outro. */
export function roundAtBeat(t: Timing, beat: number) {
  if (beat < t.leadInBeats) return -1;
  const round = Math.floor((beat - t.leadInBeats) / t.beatsPerRound);
  return Math.min(round, t.rounds);
}

export function isTargetBeat(t: Timing, beat: number) {
  if (beat < t.leadInBeats) return false;
  const rel = beat - t.leadInBeats;
  return (
    rel < t.rounds * t.beatsPerRound &&
    rel % t.beatsPerRound === t.beatsPerRound - 1
  );
}

export type Windows = {
  perfect: number;
  great: number;
  cool: number;
  /** How early (seconds) Enter is accepted at all. */
  early: number;
  /** How late (seconds) Enter is accepted; after this the round is a MISS. */
  late: number;
};

export function judgeWindows(difficulty: Difficulty, beatSec: number): Windows {
  const scale = DIFFICULTIES[difficulty].windowScale;
  // Late window must end before the next word appears (one beat later).
  const late = Math.min(beatSec * 0.5, 0.36);
  const early = Math.min(beatSec * 0.9, 0.6);
  const cap = (value: number) => Math.min(value, late);
  return {
    perfect: cap(0.055 * scale),
    great: cap(0.11 * scale),
    cool: cap(0.18 * scale),
    early,
    late,
  };
}

export function rateOffset(offsetSec: number, windows: Windows): Rating {
  const abs = Math.abs(offsetSec);
  if (abs <= windows.perfect) return "perfect";
  if (abs <= windows.great) return "great";
  if (abs <= windows.cool) return "cool";
  return "bad";
}

export const RATING_POINTS: Record<Rating, number> = {
  perfect: 100,
  great: 70,
  cool: 40,
  bad: 10,
  miss: 0,
};

export const RATING_LABEL: Record<Rating, string> = {
  perfect: "PERFECT",
  great: "GREAT",
  cool: "COOL",
  bad: "BAD",
  miss: "MISS",
};

export const keepsCombo = (rating: Rating) =>
  rating === "perfect" || rating === "great" || rating === "cool";

/** Combo bonus: +10 per word already in the combo, capped at +100. */
export function pointsFor(rating: Rating, comboBefore: number) {
  const base = RATING_POINTS[rating];
  if (!keepsCombo(rating)) return base;
  return base + Math.min(comboBefore, 10) * 10;
}
