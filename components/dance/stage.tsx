"use client";

import type { CSSProperties, ReactNode } from "react";

import { GROOVE_STYLES, pickMove } from "@/lib/dance/choreo";
import { hashString } from "@/lib/dance/random";
import { RATING_LABEL } from "@/lib/dance/rules";
import type { LiveJudge } from "@/lib/dance/store";
import type { PlayerPublic } from "@/lib/dance/types";
import { cn } from "@/lib/utils";

import { Dancer, DancerHead, EXPRESSION_BY_RATING } from "./dancer";

const EQ_BARS = 32;

type StageProps = {
  players: PlayerPublic[];
  meId: string | null;
  hostId?: string | null;
  beatSec: number;
  /** Song clock in seconds (keeps every dancer on the music). */
  clock?: () => number;
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
  if (count <= 3) return 168;
  if (count <= 6) return 136;
  if (count <= 10) return 100;
  if (count <= 18) return 72;
  return 58;
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

export function StageBackdrop({ beatSec }: { beatSec: number }) {
  return (
    <>
      <div className="club-wall" />
      <div
        className="club-eq"
        style={{ "--beat": `${beatSec}s` } as CSSProperties}
      >
        {Array.from({ length: EQ_BARS }, (_, i) => (
          <span
            key={i}
            style={{ animationDelay: `${-((i * 7) % 11) * beatSec * 0.09}s` }}
          />
        ))}
      </div>
      <div className="club-beam a" />
      <div className="club-beam b" />
      <div className="club-beam c" />
      <div className="club-beam d" />
      <div className="club-truss">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="club-floor" />
      <div className="club-haze" />
    </>
  );
}

export function Stage({
  players,
  meId,
  hostId,
  beatSec,
  clock,
  judges = {},
  showScores = false,
  fit = false,
  maxShown = Infinity,
  colors = ["#ff2d95", "#19e3ff"],
  className,
  style,
  stageRef,
  onKick,
  children,
}: StageProps) {
  const ordered = lineUp(players, meId, maxShown);
  const hiddenCount = players.length - ordered.length;
  const size = sizeFor(ordered.length);
  // Dancers are twice as tall as wide; ~90px is left for tags and popups.
  const width = fit
    ? `min(${size}px, calc((100cqh - 90px) * 0.46))`
    : `${size}px`;
  const reflect = ordered.length <= 12;

  return (
    <div
      ref={stageRef}
      className={cn(
        "club-stage flex flex-col",
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
      <StageBackdrop beatSec={beatSec} />

      {children}

      {hiddenCount > 0 && (
        <div className="glass absolute right-3 top-6 z-10 rounded-full px-3 py-1 text-xs font-semibold">
          +{hiddenCount} vũ công khác
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-center gap-x-2 gap-y-6 px-3 pb-[5%] pt-12 sm:gap-x-5">
        {ordered.map((player) => {
          const judge = judges[player.id];
          const isMe = player.id === meId;
          return (
            <div
              key={player.id}
              className="relative flex flex-col items-center"
              style={{ width }}
            >
              {judge && (
                <div
                  key={judge.id}
                  className={cn(
                    "judge-pop",
                    `pop-${judge.rating}`,
                    size < 90 ? "text-lg" : "text-3xl"
                  )}
                >
                  {RATING_LABEL[judge.rating]}
                  {judge.combo >= 2 && judge.rating !== "miss" && (
                    <span className="ml-1 text-[0.6em] text-white">
                      x{judge.combo}
                    </span>
                  )}
                </div>
              )}
              <Dancer
                avatar={player.avatar}
                beatSec={beatSec}
                clock={clock}
                grooveStyle={hashString(player.id) % GROOVE_STYLES}
                action={
                  judge
                    ? {
                        move: pickMove(
                          player.id,
                          judge.round,
                          judge.rating,
                          judge.combo
                        ),
                        key: judge.id,
                      }
                    : null
                }
                expression={judge ? EXPRESSION_BY_RATING[judge.rating] : "joy"}
                reflect={reflect}
                className="w-full"
              />
              <div
                className={cn(
                  "relative z-[2] mt-1 flex max-w-[150%] items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur sm:text-[11px]",
                  isMe
                    ? "bg-[var(--neon-pink)] text-white shadow-[0_0_14px_rgba(255,45,149,0.7)]"
                    : "border border-white/15 bg-black/50 text-white/85"
                )}
              >
                {hostId === player.id && (
                  <span className="text-[9px] text-yellow-300">★</span>
                )}
                {player.isBot && (
                  <span className="rounded bg-white/15 px-1 text-[8px] tracking-wider">
                    BOT
                  </span>
                )}
                <span className="max-w-[90px] truncate">
                  {isMe ? `${player.name} (bạn)` : player.name}
                </span>
                {onKick && player.id !== meId && (
                  <button
                    type="button"
                    className="ml-0.5 rounded-full px-1 text-white/60 hover:bg-white/20 hover:text-white"
                    title="Mời ra khỏi phòng"
                    onClick={() => onKick(player.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
              {showScores && (
                <div className="font-display relative z-[2] text-sm leading-tight text-white/90 drop-shadow">
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
}: {
  players: PlayerPublic[];
  meId: string | null;
  className?: string;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <ol className={cn("space-y-1.5", className)}>
      {ranked.map((p, i) => (
        <li
          key={p.id}
          className={cn(
            "flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm",
            p.id === meId
              ? "bg-[rgba(255,45,149,0.18)] ring-1 ring-[#ff2d95]"
              : "bg-white/[0.04]"
          )}
        >
          <span
            className={cn(
              "font-display w-6 text-center text-lg",
              i < 3 ? "text-gradient" : "text-white/50"
            )}
          >
            {i + 1}
          </span>
          <DancerHead
            avatar={p.avatar}
            className="h-8 w-8 shrink-0 rounded-full bg-white/5"
          />
          <span className="min-w-0 flex-1 truncate font-semibold">
            {p.name}
          </span>
          {p.isBot && (
            <span className="rounded bg-white/10 px-1 text-[9px] tracking-wider text-white/60">
              BOT
            </span>
          )}
          {p.combo >= 3 && (
            <span className="rounded bg-[var(--neon-lime)] px-1 text-[10px] font-black text-black">
              x{p.combo}
            </span>
          )}
          <span className="font-display text-lg tabular-nums">
            {p.score.toLocaleString("vi-VN")}
          </span>
        </li>
      ))}
    </ol>
  );
}
