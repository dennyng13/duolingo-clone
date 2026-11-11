import { toast } from "sonner";
import { create } from "zustand";

import {
  connectOnline,
  createSoloTransport,
  defaultServerUrl,
  type Transport,
} from "./transport";
import type {
  Avatar,
  ClientMessage,
  JudgeEvent,
  Rating,
  RoomSnapshot,
  ServerMessage,
  WordItem,
} from "./types";

export type LiveJudge = JudgeEvent & { id: number };

export type HistoryItem = {
  round: number;
  word: WordItem;
  typed: string;
  rating: Rating;
  correct: boolean;
};

type Phase = "menu" | "connecting" | "room";
type ConnectKind = "create" | "join" | "solo";

type DanceState = {
  phase: Phase;
  mode: "online" | "solo" | null;
  error: string | null;
  transport: Transport | null;
  playerId: string | null;
  room: RoomSnapshot | null;
  /** serverTime - Date.now(), in ms. */
  clockOffset: number;
  judges: Record<string, LiveJudge>;
  history: HistoryItem[];

  connect(
    kind: ConnectKind,
    profile: { name: string; avatar: Avatar },
    options?: { code?: string; serverUrl?: string }
  ): Promise<void>;
  send(message: ClientMessage): void;
  leave(message?: string): void;
  /** Optimistic judgement for the local player (server echo is merged). */
  localJudge(event: JudgeEvent): void;
  pushHistory(item: HistoryItem): void;
};

let judgeSeq = 0;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let samples: { rtt: number; offset: number }[] = [];

export const useDance = create<DanceState>()((set, get) => {
  const handle = (message: ServerMessage) => {
    switch (message.type) {
      case "pong": {
        const now = Date.now();
        const rtt = now - message.t;
        samples = [
          ...samples,
          { rtt, offset: message.server - (message.t + rtt / 2) },
        ].slice(-12);
        const best = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
        set({ clockOffset: best.offset });
        return;
      }
      case "welcome":
        set({
          playerId: message.playerId,
          room: message.room,
          phase: "room",
          error: null,
        });
        return;
      case "room": {
        const previous = get().room;
        const newGame =
          message.room.game && message.room.game.id !== previous?.game?.id;
        set({
          room: message.room,
          ...(newGame ? { judges: {}, history: [] } : {}),
        });
        return;
      }
      case "judged": {
        const { type: _type, ...event } = message;
        void _type;
        set((state) => {
          if (!state.room) return {};
          const players = state.room.players.map((p) =>
            p.id === event.playerId
              ? { ...p, score: event.score, combo: event.combo }
              : p
          );
          const prev = state.judges[event.playerId];
          const sameRound = prev && prev.round === event.round;
          return {
            room: { ...state.room, players },
            judges: {
              ...state.judges,
              [event.playerId]: sameRound
                ? { ...prev, ...event, id: prev.id }
                : { ...event, id: ++judgeSeq },
            },
          };
        });
        return;
      }
      case "kicked":
        get().leave("Bạn đã được mời ra khỏi phòng.");
        return;
      case "error":
        if (get().phase === "connecting") {
          get().leave(message.message);
        } else {
          toast.error(message.message);
        }
        return;
    }
  };

  return {
    phase: "menu",
    mode: null,
    error: null,
    transport: null,
    playerId: null,
    room: null,
    clockOffset: 0,
    judges: {},
    history: [],

    async connect(kind, profile, options = {}) {
      get().transport?.close();
      set({ phase: "connecting", error: null, room: null, playerId: null });

      let transport: Transport;
      if (kind === "solo") {
        transport = createSoloTransport();
      } else {
        try {
          transport = await connectOnline(
            options.serverUrl || defaultServerUrl()
          );
        } catch {
          set({
            phase: "menu",
            error:
              "Không kết nối được máy chủ nhiều người chơi. Hãy chạy `bun run dance:server` (hoặc kiểm tra địa chỉ máy chủ), hoặc thử chế độ Luyện tập.",
          });
          return;
        }
      }
      if (get().phase !== "connecting") {
        transport.close();
        return;
      }

      samples = [];
      transport.onMessage(handle);
      transport.onClose(() => {
        if (get().transport === transport) {
          get().leave("Mất kết nối với máy chủ.");
        }
      });
      set({ transport, mode: transport.kind });

      for (let i = 0; i < 6; i++) {
        setTimeout(
          () => transport.send({ type: "ping", t: Date.now() }),
          i * 120
        );
      }
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(
        () => transport.send({ type: "ping", t: Date.now() }),
        10000
      );

      if (kind === "join") {
        transport.send({
          type: "join",
          code: (options.code ?? "").trim().toUpperCase(),
          ...profile,
        });
      } else {
        transport.send({ type: "create", ...profile });
      }
    },

    send(message) {
      get().transport?.send(message);
    },

    leave(message) {
      const transport = get().transport;
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      set({
        transport: null,
        phase: "menu",
        mode: null,
        room: null,
        playerId: null,
        judges: {},
        history: [],
        error: message ?? null,
      });
      if (transport) {
        transport.send({ type: "leave" });
        transport.close();
      }
    },

    localJudge(event) {
      set((state) => {
        const prev = state.judges[event.playerId];
        if (prev && prev.round === event.round) return {};
        return {
          judges: {
            ...state.judges,
            [event.playerId]: { ...event, id: ++judgeSeq },
          },
        };
      });
    },

    pushHistory(item) {
      set((state) => ({ history: [...state.history, item] }));
    },
  };
});
