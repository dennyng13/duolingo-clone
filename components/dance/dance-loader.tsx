"use client";

import dynamic from "next/dynamic";

// The game is entirely client-side (Web Audio, localStorage, WebSockets).
const DanceApp = dynamic(() => import("./dance-app"), {
  ssr: false,
  loading: () => (
    <div className="club-bg flex min-h-[100dvh] items-center justify-center">
      <p className="font-display text-gradient animate-pulse text-6xl tracking-widest">
        Lingo Dance
      </p>
    </div>
  ),
});

export function DanceLoader({ initialRoom }: { initialRoom?: string }) {
  return <DanceApp initialRoom={initialRoom} />;
}
