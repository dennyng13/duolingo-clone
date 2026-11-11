"use client";

import { useEffect } from "react";

import { LogOut, RotateCcw, Volume2 } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

import { Button } from "@/components/ui/button";
import { music } from "@/lib/dance/audio";
import { getSong } from "@/lib/dance/songs";
import { speak } from "@/lib/dance/speech";
import { useDance } from "@/lib/dance/store";
import type { PlayerPublic } from "@/lib/dance/types";
import { displayWord } from "@/lib/dance/words";
import { cn } from "@/lib/utils";

import { Dancer, DancerHead } from "./dancer";

const PODIUM = [
  {
    place: 1,
    medal: "🥈",
    height: "h-20",
    color: "from-slate-300 to-slate-400",
  },
  {
    place: 0,
    medal: "🥇",
    height: "h-28",
    color: "from-yellow-300 to-amber-400",
  },
  {
    place: 2,
    medal: "🥉",
    height: "h-14",
    color: "from-orange-300 to-orange-500",
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

  const podiumPlayer = (index: number): PlayerPublic | undefined =>
    ranked[index];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-800 via-purple-700 to-fuchsia-600 p-3 text-white sm:p-6">
      {myRank === 0 && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={400}
          tweenDuration={8000}
        />
      )}
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white/70">
            {song.emoji} {song.name} · kết quả
          </p>
          <h1 className="text-4xl font-black drop-shadow sm:text-5xl">
            {myRank === 0
              ? "Bạn là ngôi sao sàn nhảy! 🌟"
              : me
                ? `Bạn hạng ${myRank + 1}!`
                : "Kết quả"}
          </h1>
        </header>

        {/* Podium */}
        <div className="flex items-end justify-center gap-2 sm:gap-6">
          {PODIUM.map(({ place, medal, height: h, color }) => {
            const player = podiumPlayer(place);
            if (!player) return <div key={place} className="w-24 sm:w-36" />;
            return (
              <div
                key={place}
                className="flex w-24 flex-col items-center sm:w-36"
              >
                <Dancer
                  avatar={player.avatar}
                  beatSec={60 / song.bpm}
                  move={place === 0 ? "cheer-loop" : "idle"}
                  expression="joy"
                  className={place === 0 ? "w-24 sm:w-32" : "w-20 sm:w-28"}
                />
                <div className="mt-1 max-w-full truncate text-sm font-black">
                  {player.name}
                </div>
                <div className="text-xs font-bold text-yellow-200">
                  {player.score.toLocaleString("vi-VN")} điểm
                </div>
                <div
                  className={cn(
                    "mt-1 flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b pt-2 text-3xl shadow-lg",
                    h,
                    color
                  )}
                >
                  {medal}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="overflow-hidden rounded-3xl bg-white text-slate-700 shadow-xl">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 text-xs uppercase text-purple-700">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Người chơi</th>
                  <th className="px-3 py-2 text-right">Điểm</th>
                  <th className="px-3 py-2 text-right">Đúng</th>
                  <th className="hidden px-3 py-2 text-right sm:table-cell">
                    Perfect
                  </th>
                  <th className="hidden px-3 py-2 text-right sm:table-cell">
                    Combo
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-t border-slate-100",
                      p.id === meId && "bg-yellow-50 font-bold"
                    )}
                  >
                    <td className="px-3 py-1.5 font-black">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <DancerHead avatar={p.avatar} className="h-7 w-7" />
                        <span className="truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-black tabular-nums">
                      {p.score.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {p.correct}/{total}
                    </td>
                    <td className="hidden px-3 py-1.5 text-right tabular-nums sm:table-cell">
                      {p.perfect}
                    </td>
                    <td className="hidden px-3 py-1.5 text-right tabular-nums sm:table-cell">
                      {p.maxCombo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-3xl bg-white p-4 text-slate-700 shadow-xl">
            <h2 className="mb-2 text-lg font-black">📚 Từ cần ôn lại</h2>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">
                Bạn đã xem bài này — không có từ nào của riêng bạn.
              </p>
            ) : uniqueReview.length === 0 ? (
              <p className="text-sm font-bold text-emerald-600">
                Tuyệt vời! Bạn gõ đúng tất cả các từ. 🎉
              </p>
            ) : (
              <ul className="space-y-1.5">
                {uniqueReview.map((h) => (
                  <li
                    key={h.word.en}
                    className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 text-sm"
                  >
                    <span className="text-xl">{h.word.emoji}</span>
                    <span className="font-black text-slate-800">
                      {displayWord(h.word)}
                    </span>
                    <span className="text-slate-500">= {h.word.vi}</span>
                    {h.typed && (
                      <span className="text-xs text-rose-500 line-through">
                        {h.typed}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => speak(displayWord(h.word))}
                      className="ml-auto rounded-lg p-1 text-sky-500 hover:bg-sky-100"
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
            <Button
              variant="secondary"
              size="lg"
              onClick={() => send({ type: "lobby" })}
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Chơi bài tiếp theo
            </Button>
          ) : (
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold">
              ⏳ Chờ chủ phòng mở bài tiếp theo…
            </div>
          )}
          <Button variant="dangerOutline" size="lg" onClick={() => leave()}>
            <LogOut className="mr-2 h-5 w-5" /> Rời phòng
          </Button>
        </div>
      </div>
    </div>
  );
}
