// Shared types for Lingo Dance: used by the browser client, the in-browser
// practice room and the standalone WebSocket server (server/dance-server.ts).

export type Rating = "perfect" | "great" | "cool" | "bad" | "miss";
export type Difficulty = "easy" | "normal" | "hard";
export type PromptMode = "meaning" | "listen" | "copy";
export type RoomState = "lobby" | "playing" | "results";

export const RATINGS: readonly Rating[] = [
  "perfect",
  "great",
  "cool",
  "bad",
  "miss",
];

/** Indices into the wardrobe lists in lib/dance/avatar.ts. */
export type Avatar = {
  skin: number;
  hair: number;
  hairColor: number;
  top: number;
  topColor: number;
  bottom: number;
  bottomColor: number;
  shoes: number;
  shoeColor: number;
  accessory: number;
};

export type WordItem = {
  /** English answer. Alternatives can be separated with "/" (grey/gray). */
  en: string;
  /** Vietnamese meaning shown as the prompt. */
  vi: string;
  emoji?: string;
};

export type RoomConfig = {
  wordSetId: string;
  customWords: WordItem[];
  songId: string;
  difficulty: Difficulty;
  mode: PromptMode;
  rounds: number;
};

export type PlayerStats = {
  score: number;
  combo: number;
  maxCombo: number;
  correct: number;
  perfect: number;
  great: number;
  cool: number;
  bad: number;
  miss: number;
};

export type PlayerPublic = PlayerStats & {
  id: string;
  name: string;
  avatar: Avatar;
  isBot: boolean;
  /** Spectators (e.g. the teacher on the projector) watch but do not dance. */
  spectator: boolean;
};

export type GameStart = {
  id: number;
  /** Song start (beat 0) in server epoch milliseconds. */
  startAt: number;
  songId: string;
  bpm: number;
  beatsPerRound: number;
  leadInBeats: number;
  outroBeats: number;
  difficulty: Difficulty;
  mode: PromptMode;
  words: WordItem[];
  participants: string[];
};

export type RoomSnapshot = {
  code: string;
  hostId: string | null;
  state: RoomState;
  config: RoomConfig;
  players: PlayerPublic[];
  game: GameStart | null;
};

export type ClientMessage =
  | { type: "ping"; t: number }
  | { type: "create"; name: string; avatar: Avatar }
  | { type: "join"; code: string; name: string; avatar: Avatar }
  | { type: "profile"; name: string; avatar: Avatar }
  | { type: "spectate"; value: boolean }
  | { type: "config"; config: Partial<RoomConfig> }
  | { type: "add-bot" }
  | { type: "kick"; playerId: string }
  | { type: "start" }
  | { type: "judge"; round: number; rating: Rating; correct: boolean }
  | { type: "lobby" }
  | { type: "leave" };

export type JudgeEvent = {
  playerId: string;
  round: number;
  rating: Rating;
  points: number;
  score: number;
  combo: number;
};

export type ServerMessage =
  | { type: "pong"; t: number; server: number }
  | { type: "welcome"; playerId: string; room: RoomSnapshot }
  | { type: "room"; room: RoomSnapshot }
  | ({ type: "judged" } & JudgeEvent)
  | { type: "kicked" }
  | { type: "error"; message: string };
