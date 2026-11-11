"use client";

import { useEffect, useState } from "react";

import { MOVE_LABELS, SHOWCASE_MOVES } from "@/lib/dance/choreo";
import type { Avatar } from "@/lib/dance/types";
import { cn } from "@/lib/utils";

import { Dancer } from "./dancer";
import { StageBackdrop } from "./stage";

/** One big dancer on a mini club stage, cycling through the move list. */
export function DancerShowcase({
  avatar,
  bpm = 112,
  className,
}: {
  avatar: Avatar;
  bpm?: number;
  className?: string;
}) {
  const beatSec = 60 / bpm;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((n) => n + 1), beatSec * 5 * 1000);
    return () => clearInterval(id);
  }, [beatSec]);

  const move = SHOWCASE_MOVES[index % SHOWCASE_MOVES.length];

  return (
    <div className={cn("club-stage", className)}>
      <StageBackdrop beatSec={beatSec} />
      <div className="absolute inset-x-0 bottom-[7%] flex justify-center">
        <Dancer
          avatar={avatar}
          beatSec={beatSec}
          action={{ move, key: index }}
          expression="joy"
          reflect
          className="w-[38%] max-w-[170px]"
        />
      </div>
      <div className="absolute left-3 top-6 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-pink)]" />
        <span
          key={move}
          className="font-display fade-up text-lg tracking-widest text-white/90"
        >
          {MOVE_LABELS[move]}
        </span>
      </div>
    </div>
  );
}
