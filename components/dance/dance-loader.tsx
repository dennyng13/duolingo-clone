"use client";

import dynamic from "next/dynamic";

// The game is entirely client-side (Web Audio, localStorage, WebSockets).
const DanceApp = dynamic(() => import("./dance-app"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-600 to-fuchsia-500 text-3xl font-black text-white">
      🪩 Lingo Dance…
    </div>
  ),
});

export function DanceLoader({ initialRoom }: { initialRoom?: string }) {
  return <DanceApp initialRoom={initialRoom} />;
}
