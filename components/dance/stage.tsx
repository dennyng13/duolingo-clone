"use client";

import type { CSSProperties, ReactNode } from "react";

import { RATING_LABEL } from "@/lib/dance/rules";
import type { LiveJudge } from "@/lib/dance/store";
import type { PlayerPublic } from "@/lib/dance/types";
import { cn } from "@/lib/utils";

import {
  Dancer,
  DancerHead,
  EXPRESSION_BY_RATING,
  pickMove,
  type MoveName,
} from "./dancer";

const SPARKLES = [
  [8, 12],
  [18, 30],
  [30, 8],
  [70, 10],
  [82, 26],
  [92, 14],
  [55, 22],
  [40, 34],
];

type StageProps = {
  players: PlayerPublic[];
  meId: string | null;
  hostId?: string | null;
  beatSec: number;
  phaseSec?: number;
  judges?: Record<string, LiveJudge>;
  showScores?: boolean;
  /** Shrink dancers to the stage height (the stage must have a fixed height). */
  fit?: boolean;
  /** Show at most this many dancers (always including the local player). */
  maxShown?: number;
  colors?: [string, string];
  className?: string;
  style?: CSSProperties;
  stageRef?: React.Ref<HTMLDivElement>;
  onKick?: (playerId: string) => void;
  children?: ReactNode;
};

function sizeFor(count: number) {
  if (count <= 3) return 150;
  if (count <= 6) return 120;
  if (count <= 10) return 96;
  if (count <= 18) return 78;
  return 62;
}

/** Puts the local player in the middle of the line-up (others keep join order). */
function lineUp(
  players: PlayerPublic[],
  meId: string | null,
  maxShown: number
) {
  const me = players.find((p) => p.id === meId);
  const others = players
    .filter((p) => p.id !== meId)
    .slice(0, Math.max(0, maxShown - (me ? 1 : 0)));
  if (!me) return others;
  const half = Math.floor(others.length / 2);
  return [...others.slice(0, half), me, ...others.slice(half)];
}

export function Stage({
  players,
  meId,
  hostId,
  beatSec,
  phaseSec = 0,
  judges = {},
  showScores = false,
  fit = false,
  maxShown = Infinity,
  colors = ["#ff5fb7", "#4fd1ff"],
  className,
  style,
  stageRef,
  onKick,
  children,
}: StageProps) {
  const ordered = lineUp(players, meId, maxShown);
  const hiddenCount = players.length - ordered.length;
  const size = sizeFor(ordered.length);
  // 160/100 is the dancer's aspect ratio; ~120px is left for tags and popups.
  const width = fit
    ? `min(${size}px, calc((100cqh - 120px) * 0.625))`
    : `${size}px`;

  return (
    <div
      ref={stageRef}
      className={cn(
        "dance-stage flex flex-col",
        fit && "[container-type:size]",
        className
      )}
      style={
        {
          "--light-a": colors[0],
          "--light-b": colors[1],
          ...style,
        } as CSSProperties
      }
    >
      <div className="dance-spot a" />
      <div className="dance-spot b" />
      <div className="dance-spot c" />
      <div className="disco-ball" />
      {SPARKLES.map(([x, y], i) => (
        <span
          key={i}
          className="stage-sparkle"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }}
        />
      ))}
      <div className="dance-floor" />
      <div className="dance-floor-glow" />

      {children}

      {hiddenCount > 0 && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white">
          +{hiddenCount} người đang nhảy
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-center gap-x-1 gap-y-3 px-2 pb-3 pt-14 sm:gap-x-3">
        {ordered.map((player) => {
          const judge = judges[player.id];
          const isMe = player.id === meId;
          const move: MoveName = judge
            ? pickMove(player.id, judge.round, judge.rating, judge.combo)
            : "idle";
          return (
            <div
              key={player.id}
              className="relative flex flex-col items-center"
              style={{ width }}
            >
              {isMe && (
                <div className="me-arrow absolute -top-6 z-10 rounded-full bg-yellow-300 px-2 text-[11px] font-black text-purple-900 shadow">
                  BẠN ▼
                </div>
              )}
              {judge && (
                <div
                  key={judge.id}
                  className={cn(
                    "judge-pop",
                    `pop-${judge.rating}`,
                    size < 90 ? "text-sm" : "text-xl"
                  )}
                >
                  {RATING_LABEL[judge.rating]}
                  {judge.combo >= 2 && judge.rating !== "miss" && (
                    <span className="ml-1 text-xs not-italic text-yellow-200">
                      x{judge.combo}
                    </span>
                  )}
                </div>
              )}
              <Dancer
                avatar={player.avatar}
                beatSec={beatSec}
                phaseSec={phaseSec}
                move={move}
                moveKey={judge ? `${judge.round}-${judge.id}` : "idle"}
                expression={judge ? EXPRESSION_BY_RATING[judge.rating] : "joy"}
                className="w-full"
              />
              <div
                className={cn(
                  "mt-0.5 flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-bold shadow sm:text-xs",
                  isMe
                    ? "bg-yellow-300 text-purple-900"
                    : "bg-white/90 text-purple-900"
                )}
              >
                {hostId === player.id && <span title="Chủ phòng">👑</span>}
                <span className="truncate">{player.name}</span>
                {onKick && player.id !== meId && (
                  <button
                    type="button"
                    className="ml-0.5 rounded-full px-1 text-rose-500 hover:bg-rose-100"
                    title="Mời ra khỏi phòng"
                    onClick={() => onKick(player.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
              {showScores && (
                <div className="mt-0.5 text-[11px] font-black tabular-nums text-yellow-200 drop-shadow">
                  {player.score.toLocaleString("vi-VN")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Leaderboard({
  players,
  meId,
  className,
  compact = false,
}: {
  players: PlayerPublic[];
  meId: string | null;
  className?: string;
  compact?: boolean;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const list = compact ? ranked.slice(0, 5) : ranked;
  return (
    <ol className={cn("space-y-1", className)}>
      {list.map((p, i) => (
        <li
          key={p.id}
          className={cn(
            "flex items-center gap-2 rounded-xl px-2 py-1 text-sm",
            p.id === meId
              ? "bg-yellow-300 text-purple-900"
              : "bg-white/10 text-white"
          )}
        >
          <span className="w-5 text-center font-black">
            {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
          </span>
          <DancerHead avatar={p.avatar} className="h-7 w-7 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
          {p.combo >= 3 && (
            <span className="rounded bg-pink-500 px-1 text-[10px] font-black text-white">
              x{p.combo}
            </span>
          )}
          <span className="font-black tabular-nums">
            {p.score.toLocaleString("vi-VN")}
          </span>
        </li>
      ))}
    </ol>
  );
}
