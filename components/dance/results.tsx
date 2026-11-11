"use client";

import { useEffect } from "react";

import { LogOut, RotateCcw, Volume2 } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

import { music } from "@/lib/dance/audio";
import { GROOVE_STYLES } from "@/lib/dance/choreo";
import { hashString } from "@/lib/dance/random";
import { getSong } from "@/lib/dance/songs";
import { speak } from "@/lib/dance/speech";
import { useDance } from "@/lib/dance/store";
import { displayWord } from "@/lib/dance/words";
import { cn } from "@/lib/utils";

import { Dancer, DancerHead } from "./dancer";
import { StageBackdrop } from "./stage";

const PODIUM = [
  { place: 1, label: "2ND", height: "h-16", glow: "from-white/25 to-white/5" },
  {
    place: 0,
    label: "1ST",
    height: "h-24",
    glow: "from-[#ff2d95]/50 to-[#9b4dff]/10",
  },
  {
    place: 2,
    label: "3RD",
    height: "h-10",
    glow: "from-[#19e3ff]/35 to-white/5",
  },
];

export function Results() {
  const room = useDance((s) => s.room)!;
  const meId = useDance((s) => s.playerId);
  const history = useDance((s) => s.history);
  const send = useDance((s) => s.send);
  const leave = useDance((s) => s.leave);
  const { width, height } = useWindowSize();

  const game = room.game;
  const song = getSong(game?.songId ?? room.config.songId);
  const beatSec = 60 / song.bpm;
  const total = game?.words.length ?? 0;
  const ranked = room.players
    .filter((p) => game?.participants.includes(p.id))
    .sort((a, b) => b.score - a.score);
  const isHost = room.hostId === meId;
  const myRank = ranked.findIndex((p) => p.id === meId);
  const me = ranked[myRank];
  const toReview = history.filter((h) => !h.correct);
  const uniqueReview = toReview.filter(
    (h, i) => toReview.findIndex((x) => x.word.en === h.word.en) === i
  );

  useEffect(() => {
    music.sfx("fanfare");
  }, []);

  return (
    <div className="club-bg min-h-[100dvh] p-3 sm:p-6">
      {myRank === 0 && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={350}
          tweenDuration={8000}
          colors={["#ff2d95", "#19e3ff", "#c8ff3d", "#ffffff", "#9b4dff"]}
        />
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="text-center">
          <p className="label">{song.name} · Final ranking</p>
          <h1 className="font-display mt-1 text-6xl leading-none tracking-wider sm:text-8xl">
            {myRank === 0 ? (
              <span className="text-gradient">Champion</span>
            ) : me ? (
              <>
                Rank <span className="text-gradient">#{myRank + 1}</span>
              </>
            ) : (
              "Results"
            )}
          </h1>
        </header>

        {/* Podium on a club stage */}
        <div
          className="club-stage relative flex h-[420px] items-end justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 px-3 sm:gap-8"
          style={
            {
              "--light-a": song.colors[0],
              "--light-b": song.colors[1],
            } as React.CSSProperties
          }
        >
          <StageBackdrop beatSec={beatSec} />
          {PODIUM.map(({ place, label, height: h, glow }) => {
            const player = ranked[place];
            if (!player) return <div key={place} className="w-24 sm:w-36" />;
            return (
              <div
                key={place}
                className="relative z-[1] flex w-24 flex-col items-center sm:w-36"
              >
                <div className="max-w-full truncate text-sm font-bold">
                  {player.name}
                </div>
                <div className="font-display text-xl tracking-wider text-white/80">
                  {player.score.toLocaleString("vi-VN")}
                </div>
                <Dancer
                  avatar={player.avatar}
                  beatSec={beatSec}
                  grooveStyle={hashString(player.id) % GROOVE_STYLES}
                  action={
                    place === 0
                      ? { move: "victory", key: "win", loop: true }
                      : null
                  }
                  expression="joy"
                  className={cn(
                    "-mb-1",
                    place === 0
                      ? "w-[96px] sm:w-[124px]"
                      : "w-[80px] sm:w-[104px]"
                  )}
                />
                <div
                  className={cn(
                    "glass flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-1",
                    h,
                    glow
                  )}
                >
                  <span className="font-display text-2xl tracking-widest">
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="glass min-w-0 overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-widest text-white/45">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Vũ công</th>
                  <th className="px-3 py-2.5 text-right">Điểm</th>
                  <th className="px-3 py-2.5 text-right">Đúng</th>
                  <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                    Perfect
                  </th>
                  <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                    Combo
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-white/5",
                      p.id === meId && "bg-[rgba(255,45,149,0.12)]"
                    )}
                  >
                    <td
                      className={cn(
                        "font-display px-3 py-1.5 text-xl",
                        i < 3 ? "text-gradient" : "text-white/50"
                      )}
                    >
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <DancerHead
                          avatar={p.avatar}
                          className="h-8 w-8 rounded-full bg-white/5"
                        />
                        <span className="truncate font-semibold">{p.name}</span>
                        {p.isBot && (
                          <span className="rounded bg-white/10 px-1 text-[9px] tracking-wider text-white/60">
                            BOT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-display px-3 py-1.5 text-right text-xl tabular-nums">
                      {p.score.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-white/80">
                      {p.correct}/{total}
                    </td>
                    <td className="hidden px-3 py-1.5 text-right tabular-nums text-white/80 sm:table-cell">
                      {p.perfect}
                    </td>
                    <td className="hidden px-3 py-1.5 text-right tabular-nums text-white/80 sm:table-cell">
                      {p.maxCombo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="glass min-w-0 rounded-2xl p-4">
            <h2 className="mb-3 text-lg font-extrabold">Từ cần ôn lại</h2>
            {history.length === 0 ? (
              <p className="text-sm text-white/55">
                Bạn đã xem bài này — không có từ nào của riêng bạn.
              </p>
            ) : uniqueReview.length === 0 ? (
              <p className="text-sm font-semibold text-[#c8ff3d]">
                Không sai từ nào. Quá đỉnh!
              </p>
            ) : (
              <ul className="space-y-1.5">
                {uniqueReview.map((h) => (
                  <li
                    key={h.word.en}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="font-bold text-white">
                      {displayWord(h.word)}
                    </span>
                    <span className="text-white/55">= {h.word.vi}</span>
                    {h.typed && (
                      <span className="text-xs text-rose-300 line-through">
                        {h.typed}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => speak(displayWord(h.word))}
                      className="ml-auto rounded-lg p-1 text-[#19e3ff] hover:bg-white/10"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {isHost ? (
            <button
              type="button"
              className="btn-neon"
              onClick={() => send({ type: "lobby" })}
            >
              <RotateCcw className="h-4 w-4" /> Bài tiếp theo
            </button>
          ) : (
            <div className="glass rounded-xl px-4 py-3 text-sm text-white/70">
              Chờ chủ phòng mở bài tiếp theo…
            </div>
          )}
          <button type="button" className="btn-ghost" onClick={() => leave()}>
            <LogOut className="h-4 w-4" /> Rời phòng
          </button>
        </div>
      </div>
    </div>
  );
}
