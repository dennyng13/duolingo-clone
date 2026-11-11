// Original procedurally generated tracks (see lib/dance/audio.ts).
// No audio files and no third-party music: everything is synthesised live.

export type SongStyle = "pop" | "disco" | "chill" | "edm";
export type ChordQuality = "maj" | "min" | "maj7" | "min7" | "dom7";
export type Chord = [root: number, quality: ChordQuality];

export type Song = {
  id: string;
  name: string;
  vibe: string;
  emoji: string;
  bpm: number;
  style: SongStyle;
  /** One chord per bar, looped. Roots are MIDI note numbers around C4. */
  chords: Chord[];
  /** Two colours for the stage lights. */
  colors: [string, string];
};

export const SONGS: Song[] = [
  {
    id: "sunny",
    name: "Sunny Steps",
    vibe: "Pop vui tươi · 96 BPM",
    emoji: "🌞",
    bpm: 96,
    style: "pop",
    chords: [
      [60, "maj"],
      [67, "maj"],
      [69, "min"],
      [65, "maj"],
    ],
    colors: ["#ffb347", "#ff5fb7"],
  },
  {
    id: "neon",
    name: "Neon Disco",
    vibe: "Disco sôi động · 110 BPM",
    emoji: "🪩",
    bpm: 110,
    style: "disco",
    chords: [
      [62, "min7"],
      [67, "dom7"],
      [60, "maj7"],
      [69, "min7"],
    ],
    colors: ["#b05cff", "#4fd1ff"],
  },
  {
    id: "bubble",
    name: "Bubble Tea Chill",
    vibe: "Lo-fi nhẹ nhàng · 86 BPM",
    emoji: "🧋",
    bpm: 86,
    style: "chill",
    chords: [
      [65, "maj7"],
      [64, "min7"],
      [62, "min7"],
      [60, "maj7"],
    ],
    colors: ["#7ee8c4", "#a68bff"],
  },
  {
    id: "rocket",
    name: "Rocket Party",
    vibe: "EDM bùng nổ · 124 BPM",
    emoji: "🚀",
    bpm: 124,
    style: "edm",
    chords: [
      [71, "min"],
      [67, "maj"],
      [62, "maj"],
      [69, "maj"],
    ],
    colors: ["#ff4d6d", "#ffd23f"],
  },
];

export function getSong(id: string) {
  return SONGS.find((s) => s.id === id) ?? SONGS[0];
}

export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
};
