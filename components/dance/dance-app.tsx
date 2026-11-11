"use client";

import { useEffect } from "react";

import { useDance } from "@/lib/dance/store";

import { Game } from "./game";
import { Lobby } from "./lobby";
import { Menu } from "./menu";
import { Results } from "./results";

export default function DanceApp({ initialRoom }: { initialRoom?: string }) {
  const phase = useDance((s) => s.phase);
  const room = useDance((s) => s.room);

  // Leave the room when navigating away from /dance.
  useEffect(() => () => useDance.getState().leave(), []);

  if (phase !== "room" || !room) return <Menu initialRoom={initialRoom} />;
  if (room.state === "lobby") return <Lobby />;
  if (room.state === "playing" && room.game) return <Game key={room.game.id} />;
  return <Results />;
}
