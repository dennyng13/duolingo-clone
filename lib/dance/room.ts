// Room logic shared by the WebSocket server and the in-browser practice mode.
// Pure TypeScript (no DOM / Node APIs) so both environments can run it.

import {
  BOT_NAMES,
  randomAvatar,
  sanitizeAvatar,
  sanitizeName,
} from "./avatar";
import { randomId, randomRoomCode, shuffle } from "./random";
import {
  DIFFICULTIES,
  LEAD_IN_BEATS,
  OUTRO_BEATS,
  ROUND_OPTIONS,
  judgeWindows,
  keepsCombo,
  makeTiming,
  pointsFor,
  targetBeat,
  type Windows,
} from "./rules";
import { SONGS, getSong } from "./songs";
import {
  RATINGS,
  type ClientMessage,
  type Difficulty,
  type GameStart,
  type PlayerPublic,
  type PlayerStats,
  type PromptMode,
  type Rating,
  type RoomConfig,
  type RoomSnapshot,
  type RoomState,
  type ServerMessage,
  type WordItem,
} from "./types";
import { getWordPool, isKnownWordSet, sanitizeWords } from "./words";

export type Outbox = (playerId: string, message: ServerMessage) => void;

export const MAX_PLAYERS = 40;
export const MAX_BOTS = 8;
/** Time between "start" and beat 0, so every client can get ready. */
const START_DELAY_MS = 3500;

type Player = PlayerPublic & {
  skill: number;
  judged: Set<number>;
  joinedAt: number;
};

const emptyStats = (): PlayerStats => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  correct: 0,
  perfect: 0,
  great: 0,
  cool: 0,
  bad: 0,
  miss: 0,
});

export const defaultConfig = (): RoomConfig => ({
  wordSetId: "university",
  customWords: [],
  songId: SONGS[0].id,
  difficulty: "normal",
  mode: "meaning",
  rounds: 12,
});

const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];
const MODE_IDS: PromptMode[] = ["meaning", "listen", "copy"];

export function sanitizeConfig(
  patch: unknown,
  current: RoomConfig
): RoomConfig {
  const next = { ...current };
  if (!patch || typeof patch !== "object") return next;
  const raw = patch as Record<string, unknown>;
  if (typeof raw.wordSetId === "string" && isKnownWordSet(raw.wordSetId)) {
    next.wordSetId = raw.wordSetId;
  }
  if (raw.customWords !== undefined) {
    next.customWords = sanitizeWords(raw.customWords);
  }
  if (
    typeof raw.songId === "string" &&
    SONGS.some((s) => s.id === raw.songId)
  ) {
    next.songId = raw.songId;
  }
  if (DIFFICULTY_IDS.includes(raw.difficulty as Difficulty)) {
    next.difficulty = raw.difficulty as Difficulty;
  }
  if (MODE_IDS.includes(raw.mode as PromptMode)) {
    next.mode = raw.mode as PromptMode;
  }
  if (
    typeof raw.rounds === "number" &&
    (ROUND_OPTIONS as readonly number[]).includes(raw.rounds)
  ) {
    next.rounds = raw.rounds;
  }
  return next;
}

export function pickWords(config: RoomConfig, rng = Math.random): WordItem[] {
  const pool = getWordPool(config);
  const out: WordItem[] = [];
  while (out.length < config.rounds && pool.length > 0) {
    for (const word of shuffle(pool, rng)) {
      if (out.length >= config.rounds) break;
      if (pool.length > 1 && out[out.length - 1]?.en === word.en) continue;
      out.push(word);
    }
  }
  return out;
}

function botOutcome(
  skill: number,
  w: Windows
): { rating: Rating; offset: number } {
  const r = Math.random();
  const between = (a: number, b: number) =>
    (Math.random() < 0.5 ? -1 : 1) * (a + Math.random() * (b - a));
  if (r < skill * 0.45)
    return { rating: "perfect", offset: between(0, w.perfect) };
  if (r < skill * 0.75)
    return { rating: "great", offset: between(w.perfect, w.great) };
  if (r < skill * 0.95)
    return { rating: "cool", offset: between(w.great, w.cool) };
  if (r < skill * 0.95 + (1 - skill * 0.95) * 0.4) {
    return { rating: "bad", offset: between(w.cool, w.late) };
  }
  return { rating: "miss", offset: w.late };
}

export class Room {
  hostId: string | null = null;
  state: RoomState = "lobby";
  config: RoomConfig = defaultConfig();
  game: GameStart | null = null;

  private players = new Map<string, Player>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private gameCounter = 0;
  private disposed = false;

  constructor(
    readonly code: string,
    private readonly out: Outbox,
    private readonly now: () => number = () => Date.now()
  ) {}

  /** True when only bots (or nobody) are left. */
  get isEmpty() {
    for (const p of this.players.values()) if (!p.isBot) return false;
    return true;
  }

  get playerCount() {
    return this.players.size;
  }

  has(playerId: string) {
    return this.players.has(playerId);
  }

  snapshot(): RoomSnapshot {
    return {
      code: this.code,
      hostId: this.hostId,
      state: this.state,
      config: this.config,
      game: this.game,
      players: [...this.players.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isBot: p.isBot,
          spectator: p.spectator,
          score: p.score,
          combo: p.combo,
          maxCombo: p.maxCombo,
          correct: p.correct,
          perfect: p.perfect,
          great: p.great,
          cool: p.cool,
          bad: p.bad,
          miss: p.miss,
        })),
    };
  }

  /** Returns an error message, or null when the player joined. */
  join(id: string, name: unknown, avatar: unknown): string | null {
    if (this.disposed) return "Phòng đã đóng.";
    if (this.players.has(id)) return null;
    if (this.players.size >= MAX_PLAYERS) return "Phòng đã đầy.";
    this.players.set(id, {
      id,
      name: sanitizeName(name),
      avatar: sanitizeAvatar(avatar),
      isBot: false,
      spectator: false,
      skill: 1,
      judged: new Set(),
      joinedAt: this.now() + this.players.size / 1000,
      ...emptyStats(),
    });
    if (!this.hostId) this.hostId = id;
    this.out(id, { type: "welcome", playerId: id, room: this.snapshot() });
    this.broadcastRoom(id);
    return null;
  }

  leave(id: string) {
    if (!this.players.delete(id)) return;
    if (this.hostId === id) {
      const nextHost = [...this.players.values()]
        .filter((p) => !p.isBot)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      this.hostId = nextHost?.id ?? null;
    }
    if (this.isEmpty) {
      this.dispose();
      return;
    }
    this.broadcastRoom();
  }

  handle(id: string, msg: ClientMessage) {
    const player = this.players.get(id);
    if (!player || this.disposed) return;
    const isHost = this.hostId === id;

    switch (msg.type) {
      case "profile":
        player.name = sanitizeName(msg.name);
        player.avatar = sanitizeAvatar(msg.avatar);
        this.broadcastRoom();
        return;
      case "spectate":
        if (this.state !== "lobby") return;
        player.spectator = Boolean(msg.value);
        this.broadcastRoom();
        return;
      case "config":
        if (!isHost || this.state !== "lobby") return;
        this.config = sanitizeConfig(msg.config, this.config);
        this.broadcastRoom();
        return;
      case "add-bot":
        if (!isHost || this.state !== "lobby") return;
        this.addBot();
        return;
      case "kick": {
        if (!isHost || msg.playerId === id) return;
        const target = this.players.get(msg.playerId);
        if (!target) return;
        if (!target.isBot) this.out(target.id, { type: "kicked" });
        this.leave(target.id);
        return;
      }
      case "start":
        if (!isHost) return;
        this.start(id);
        return;
      case "judge":
        this.applyJudge(id, msg.round, msg.rating, msg.correct);
        return;
      case "lobby":
        if (!isHost || this.state === "lobby") return;
        this.backToLobby();
        return;
      default:
        return;
    }
  }

  addBot() {
    const bots = [...this.players.values()].filter((p) => p.isBot);
    if (bots.length >= MAX_BOTS || this.players.size >= MAX_PLAYERS) return;
    const used = new Set(bots.map((b) => b.name));
    const name =
      BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${bots.length + 1}`;
    const id = `bot-${randomId(6)}`;
    this.players.set(id, {
      id,
      name,
      avatar: randomAvatar(),
      isBot: true,
      spectator: false,
      skill: 0.55 + Math.random() * 0.4,
      judged: new Set(),
      joinedAt: this.now() + this.players.size / 1000,
      ...emptyStats(),
    });
    this.broadcastRoom();
  }

  private start(requesterId: string) {
    if (this.state !== "lobby") return;
    const dancers = [...this.players.values()].filter((p) => !p.spectator);
    if (dancers.length === 0) {
      this.out(requesterId, {
        type: "error",
        message: "Cần ít nhất 1 người nhảy (đang có toàn người xem).",
      });
      return;
    }
    const words = pickWords(this.config);
    if (words.length === 0) {
      this.out(requesterId, {
        type: "error",
        message: "Danh sách từ đang trống.",
      });
      return;
    }

    const song = getSong(this.config.songId);
    const preset = DIFFICULTIES[this.config.difficulty];
    for (const p of this.players.values()) {
      Object.assign(p, emptyStats());
      p.judged = new Set();
    }
    const game: GameStart = {
      id: ++this.gameCounter,
      startAt: this.now() + START_DELAY_MS,
      songId: song.id,
      bpm: song.bpm,
      beatsPerRound: preset.beatsPerRound,
      leadInBeats: LEAD_IN_BEATS,
      outroBeats: OUTRO_BEATS,
      difficulty: this.config.difficulty,
      mode: this.config.mode,
      words,
      participants: dancers.map((p) => p.id),
    };
    this.game = game;
    this.state = "playing";

    const timing = makeTiming(
      game.bpm,
      game.beatsPerRound,
      words.length,
      game.leadInBeats,
      game.outroBeats
    );
    const windows = judgeWindows(game.difficulty, timing.beatSec);
    for (const bot of dancers.filter((p) => p.isBot)) {
      for (let round = 0; round < words.length; round++) {
        const { rating, offset } = botOutcome(bot.skill, windows);
        const at =
          game.startAt +
          (targetBeat(timing, round) * timing.beatSec + offset) * 1000;
        this.later(at - this.now(), () =>
          this.applyJudge(bot.id, round, rating, rating !== "miss")
        );
      }
    }
    this.later(
      game.startAt + timing.durationSec * 1000 + 600 - this.now(),
      () => this.finish()
    );
    this.broadcastRoom();
  }

  private applyJudge(
    id: string,
    round: number,
    rating: Rating,
    correct: boolean
  ) {
    const game = this.game;
    const p = this.players.get(id);
    if (this.state !== "playing" || !game || !p) return;
    if (!game.participants.includes(id)) return;
    if (!Number.isInteger(round) || round < 0 || round >= game.words.length)
      return;
    if (!RATINGS.includes(rating) || p.judged.has(round)) return;

    // Reject judgements that arrive impossibly early (simple anti-cheat).
    const timing = makeTiming(
      game.bpm,
      game.beatsPerRound,
      game.words.length,
      game.leadInBeats,
      game.outroBeats
    );
    const earliest =
      game.startAt +
      (targetBeat(timing, round) - 2) * timing.beatSec * 1000 -
      1500;
    if (this.now() < earliest) return;

    const finalRating: Rating = correct ? rating : "miss";
    p.judged.add(round);
    const points = pointsFor(finalRating, p.combo);
    p.score += points;
    p.combo = keepsCombo(finalRating) ? p.combo + 1 : 0;
    p.maxCombo = Math.max(p.maxCombo, p.combo);
    p[finalRating] += 1;
    if (correct) p.correct += 1;

    this.broadcast({
      type: "judged",
      playerId: id,
      round,
      rating: finalRating,
      points,
      score: p.score,
      combo: p.combo,
    });
  }

  private finish() {
    if (this.state !== "playing") return;
    this.clearTimers();
    this.state = "results";
    this.broadcastRoom();
  }

  private backToLobby() {
    this.clearTimers();
    this.state = "lobby";
    this.game = null;
    this.broadcastRoom();
  }

  private later(ms: number, fn: () => void) {
    const timer = setTimeout(
      () => {
        this.timers.delete(timer);
        if (!this.disposed) fn();
      },
      Math.max(0, ms)
    );
    this.timers.add(timer);
  }

  private clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  broadcast(message: ServerMessage, exceptId?: string) {
    for (const p of this.players.values()) {
      if (!p.isBot && p.id !== exceptId) this.out(p.id, message);
    }
  }

  private broadcastRoom(exceptId?: string) {
    this.broadcast({ type: "room", room: this.snapshot() }, exceptId);
  }

  dispose() {
    this.disposed = true;
    this.clearTimers();
  }
}

export class RoomRegistry {
  private rooms = new Map<string, Room>();

  constructor(private readonly out: Outbox) {}

  create() {
    let code = randomRoomCode();
    while (this.rooms.has(code)) code = randomRoomCode();
    const room = new Room(code, this.out);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string) {
    return this.rooms.get(code.trim().toUpperCase());
  }

  leave(room: Room, playerId: string) {
    room.leave(playerId);
    if (room.isEmpty) {
      room.dispose();
      this.rooms.delete(room.code);
    }
  }

  get size() {
    return this.rooms.size;
  }
}
