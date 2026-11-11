"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LogOut, Music, Square, Volume2, VolumeX } from "lucide-react";
import { useWindowSize } from "react-use";

import { music, type SongClock } from "@/lib/dance/audio";
import { loadPrefs, savePrefs } from "@/lib/dance/prefs";
import {
  DIFFICULTIES,
  RATING_LABEL,
  judgeWindows,
  keepsCombo,
  makeTiming,
  pointsFor,
  rateOffset,
  roundAtBeat,
  roundStartBeat,
  targetBeat,
} from "@/lib/dance/rules";
import { getSong } from "@/lib/dance/songs";
import { speak } from "@/lib/dance/speech";
import { useDance } from "@/lib/dance/store";
import type { Rating, WordItem } from "@/lib/dance/types";
import {
  answersFor,
  displayWord,
  isCorrectAnswer,
  isPrefixOfAnswer,
} from "@/lib/dance/words";
import { cn } from "@/lib/utils";

import { Leaderboard, Stage } from "./stage";

type LastResult = {
  round: number;
  word: WordItem;
  typed: string;
  rating: Rating;
  correct: boolean;
  points: number;
};

const RESULT_COLORS: Record<Rating, string> = {
  perfect: "text-fuchsia-300",
  great: "text-sky-300",
  cool: "text-emerald-300",
  bad: "text-orange-300",
  miss: "text-slate-300",
};

function BeatBar({
  beats,
  lit,
  cursorRef,
  targetRef,
}: {
  beats: number;
  lit: number;
  cursorRef: React.Ref<HTMLDivElement>;
  targetRef: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="relative h-14 w-full max-w-2xl select-none">
      <div className="absolute inset-x-[23px] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15" />
      <div className="absolute inset-y-0 left-[23px] right-[23px]">
        {Array.from({ length: beats }, (_, i) => {
          const left = `${(i / (beats - 1)) * 100}%`;
          if (i === beats - 1) {
            return (
              <div
                key={i}
                ref={targetRef}
                className="beat-target"
                style={{ left }}
              >
                <span className="absolute inset-0 grid place-items-center text-[9px] font-black tracking-tight text-yellow-100">
                  ENTER
                </span>
              </div>
            );
          }
          return (
            <div
              key={i}
              className={cn("beat-tick", i < lit && "lit")}
              style={{ left }}
            />
          );
        })}
        <div
          ref={cursorRef}
          className="beat-cursor"
          style={{ left: 0, opacity: 0 }}
        />
      </div>
    </div>
  );
}

function LetterSlots({
  word,
  typed,
  showFirst,
  liveCheck,
}: {
  word: WordItem;
  typed: string;
  showFirst: boolean;
  liveCheck: boolean;
}) {
  const value = typed.toLowerCase();
  const answers = answersFor(word);
  const answer = answers.find((a) => a.startsWith(value)) ?? answers[0] ?? "";
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {answer.split("").map((char, i) => {
        if (char === " ") return <span key={i} className="w-3" />;
        const typedChar = value[i];
        const isFixed = !/[a-z]/.test(char);
        const state =
          typedChar === undefined
            ? "empty"
            : !liveCheck
              ? "typed"
              : typedChar === char
                ? "ok"
                : "bad";
        return (
          <span
            key={i}
            className={cn(
              "grid h-9 w-7 place-items-center rounded-lg border-b-4 text-lg font-black uppercase sm:h-10 sm:w-8",
              state === "empty" && "border-white/30 bg-white/10 text-white/35",
              state === "typed" && "border-sky-300 bg-white/20 text-white",
              state === "ok" &&
                "border-emerald-500 bg-emerald-400 text-emerald-950",
              state === "bad" && "border-rose-600 bg-rose-400 text-rose-950"
            )}
          >
            {typedChar ?? (isFixed ? char : showFirst && i === 0 ? char : "")}
          </span>
        );
      })}
    </div>
  );
}

function PromptCard({
  word,
  mode,
}: {
  word: WordItem;
  mode: "meaning" | "listen" | "copy";
}) {
  if (mode === "listen") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            speak(displayWord(word));
          }}
          className="flex items-center gap-2 rounded-2xl bg-sky-400 px-4 py-2 text-lg font-black text-sky-950 shadow-[0_4px_0_#0369a1] active:translate-y-1 active:shadow-none"
        >
          <Volume2 className="h-6 w-6" /> Nghe lại
        </button>
        {word.emoji && <span className="text-4xl">{word.emoji}</span>}
      </div>
    );
  }
  if (mode === "copy") {
    return (
      <div className="text-center">
        <div
          data-testid="prompt-word"
          className="text-4xl font-black tracking-wide text-yellow-200 drop-shadow sm:text-5xl"
        >
          {displayWord(word)}
        </div>
        <div className="text-sm font-semibold text-white/70">
          {word.emoji} {word.vi}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {word.emoji && (
        <span className="text-5xl drop-shadow sm:text-6xl">{word.emoji}</span>
      )}
      <span className="text-2xl font-black text-white drop-shadow sm:text-3xl">
        {word.vi || "(gõ từ tiếng Anh)"}
      </span>
    </div>
  );
}

export function Game() {
  const room = useDance((s) => s.room)!;
  const meId = useDance((s) => s.playerId);
  const judges = useDance((s) => s.judges);
  const send = useDance((s) => s.send);
  const leave = useDance((s) => s.leave);

  const game = room.game!;
  const song = getSong(game.songId);
  const preset = DIFFICULTIES[game.difficulty];
  const timing = useMemo(
    () =>
      makeTiming(
        game.bpm,
        game.beatsPerRound,
        game.words.length,
        game.leadInBeats,
        game.outroBeats
      ),
    [game]
  );
  const windows = useMemo(
    () => judgeWindows(game.difficulty, timing.beatSec),
    [game, timing]
  );

  const isHost = room.hostId === meId;
  const isDancer = Boolean(meId && game.participants.includes(meId));
  const dancers = room.players.filter((p) => game.participants.includes(p.id));
  const { width: windowWidth } = useWindowSize();

  const [prefs] = useState(loadPrefs);
  const [muted, setMuted] = useState(prefs.muted);
  const [speakOn, setSpeakOn] = useState(prefs.speak);
  const [phaseSec] = useState(() => {
    const songSec =
      (Date.now() + useDance.getState().clockOffset - game.startAt) / 1000;
    return -(((songSec % timing.beatSec) + timing.beatSec) % timing.beatSec);
  });

  const [round, setRound] = useState(-1);
  const [typed, setTyped] = useState("");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [countdown, setCountdown] = useState<string | null>("Chuẩn bị…");
  const [lit, setLit] = useState(0);
  const [hint, setHint] = useState<{ text: string; key: number } | null>(null);

  const clockRef = useRef<SongClock | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const roundRef = useRef(-1);
  const litRef = useRef(0);
  const countdownRef = useRef<string | null>("Chuẩn bị…");
  const judgedRef = useRef(new Set<number>());
  const typedRef = useRef("");
  const speakRef = useRef(prefs.speak);

  // Start the music once per game, aligned to the server's start time.
  useEffect(() => {
    music.setMuted(loadPrefs().muted);
    const delaySec =
      (game.startAt - useDance.getState().clockOffset - Date.now()) / 1000;
    clockRef.current = music.start(song, timing, delaySec);
    return () => {
      music.stop();
      clockRef.current = null;
    };
  }, [game.id, game.startAt, song, timing]);

  const judge = useCallback(
    (r: number, rating: Rating, correct: boolean) => {
      if (!meId || judgedRef.current.has(r)) return;
      judgedRef.current.add(r);
      const word = game.words[r];
      const state = useDance.getState();
      const mine = state.room?.players.find((p) => p.id === meId);
      const combo = mine?.combo ?? 0;
      const points = pointsFor(rating, combo);
      const typedNow = typedRef.current;
      state.send({ type: "judge", round: r, rating, correct });
      state.localJudge({
        playerId: meId,
        round: r,
        rating,
        points,
        score: (mine?.score ?? 0) + points,
        combo: keepsCombo(rating) ? combo + 1 : 0,
      });
      state.pushHistory({ round: r, word, typed: typedNow, rating, correct });
      setLastResult({
        round: r,
        word,
        typed: typedNow,
        rating,
        correct,
        points,
      });
      music.sfx(rating);
      if (speakRef.current && game.mode !== "listen") speak(displayWord(word));

      const target = targetRef.current;
      if (target) {
        target.classList.add(`r-${rating}`);
        setTimeout(() => target.classList.remove(`r-${rating}`), 450);
      }
    },
    [game, meId]
  );

  // Frame loop: round changes, auto-miss, beat bar, countdown, stage pulse.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const clock = clockRef.current;
      if (!clock) return;
      const t = clock.now();
      const beat = t / timing.beatSec;
      const r = roundAtBeat(timing, beat);
      const playingRound = r >= 0 && r < timing.rounds;

      if (r !== roundRef.current) {
        const prev = roundRef.current;
        if (
          isDancer &&
          prev >= 0 &&
          prev < timing.rounds &&
          !judgedRef.current.has(prev)
        ) {
          judge(prev, "miss", false);
        }
        roundRef.current = r;
        typedRef.current = "";
        setTyped("");
        setRound(r);
        setHint(null);
        if (playingRound) {
          if (game.mode === "listen") speak(displayWord(game.words[r]));
          inputRef.current?.focus({ preventScroll: true });
        }
      }

      const target = targetRef.current;
      if (isDancer && playingRound && !judgedRef.current.has(r)) {
        const dt = t - targetBeat(timing, r) * timing.beatSec;
        if (dt > windows.late) judge(r, "miss", false);
        target?.classList.toggle(
          "active",
          dt >= -windows.early && dt <= windows.late
        );
      } else {
        target?.classList.remove("active");
      }

      const cursor = cursorRef.current;
      if (cursor) {
        if (playingRound) {
          const progress =
            (beat - roundStartBeat(timing, r)) / (timing.beatsPerRound - 1);
          cursor.style.left = `${Math.min(Math.max(progress, 0), 1.06) * 100}%`;
          cursor.style.opacity = progress > 1.06 ? "0" : "1";
        } else {
          cursor.style.opacity = "0";
        }
      }

      const litNow = playingRound
        ? Math.floor(beat - roundStartBeat(timing, r)) + 1
        : 0;
      if (litNow !== litRef.current) {
        litRef.current = litNow;
        setLit(litNow);
      }

      let cd: string | null = null;
      if (beat < 0) cd = "Chuẩn bị…";
      else if (r === -1) {
        const remaining = timing.leadInBeats - Math.floor(beat);
        cd =
          remaining > 4
            ? "Get ready!"
            : remaining === 1
              ? "GO!"
              : String(remaining - 1);
      } else if (r >= timing.rounds) cd = "FINISH! 🎉";
      if (cd !== countdownRef.current) {
        countdownRef.current = cd;
        setCountdown(cd);
      }

      if (progressRef.current) {
        const p = Math.min(Math.max(t / timing.durationSec, 0), 1);
        progressRef.current.style.width = `${p * 100}%`;
      }
      if (stageRef.current) {
        const frac = beat - Math.floor(beat);
        stageRef.current.style.setProperty(
          "--pulse",
          beat >= 0 ? String(Math.max(0, 1 - frac * 2.5)) : "0"
        );
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game, isDancer, judge, timing, windows]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.repeat) return;
    const clock = clockRef.current;
    const r = roundRef.current;
    if (
      !clock ||
      !isDancer ||
      r < 0 ||
      r >= timing.rounds ||
      judgedRef.current.has(r)
    )
      return;
    const dt = clock.now() - targetBeat(timing, r) * timing.beatSec;
    if (dt < -windows.early) {
      setHint({
        text: "Chưa tới nhịp! Chờ bóng chạm vòng vàng rồi nhấn Enter ⏳",
        key: Date.now(),
      });
      music.sfx("early");
      return;
    }
    const correct = isCorrectAnswer(typedRef.current, game.words[r]);
    judge(r, correct ? rateOffset(dt, windows) : "miss", correct);
  };

  const word =
    round >= 0 && round < game.words.length ? game.words[round] : null;
  const answered = lastResult?.round === round;
  const prefixOk = word ? isPrefixOfAnswer(typed, word) : true;
  const previousWord =
    round > 0 && round <= game.words.length ? game.words[round - 1] : null;
  const previousStats = useMemo(() => {
    if (round <= 0) return null;
    const list = Object.values(judges).filter((j) => j.round === round - 1);
    return {
      right: list.filter((j) => j.rating !== "miss").length,
      total: dancers.length,
    };
  }, [judges, round, dancers.length]);

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden bg-[#12052c] text-white"
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-black/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Music className="h-4 w-4 shrink-0 text-pink-300" />
          <span className="truncate text-sm font-black">
            {song.emoji} <span className="hidden sm:inline">{song.name}</span>
          </span>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            ref={progressRef}
            className="h-full rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-yellow-300"
            style={{ width: 0 }}
          />
        </div>
        <span className="hidden text-xs font-bold tabular-nums text-white/70 sm:inline">
          Từ {Math.min(Math.max(round + 1, 0), game.words.length)}/
          {game.words.length}
        </span>
        <button
          type="button"
          title={speakOn ? "Tắt đọc phát âm" : "Bật đọc phát âm"}
          onClick={() => {
            const next = !speakOn;
            setSpeakOn(next);
            speakRef.current = next;
            savePrefs({ speak: next });
          }}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-black",
            speakOn ? "bg-sky-500/80" : "bg-white/10 text-white/60"
          )}
        >
          🗣️ ABC
        </button>
        <button
          type="button"
          title={muted ? "Bật nhạc" : "Tắt nhạc"}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            music.setMuted(next);
            savePrefs({ muted: next });
          }}
          className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        {isHost && (
          <button
            type="button"
            title="Dừng bài, về phòng chờ"
            onClick={() => send({ type: "lobby" })}
            className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"
          >
            <Square className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          title="Rời phòng"
          onClick={() => leave()}
          className="rounded-lg bg-white/10 p-1.5 hover:bg-rose-500/60"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Stage + leaderboard */}
      <div className="flex min-h-0 flex-1">
        <Stage
          stageRef={stageRef}
          className="min-h-0 flex-1"
          players={dancers}
          meId={meId}
          hostId={room.hostId}
          beatSec={timing.beatSec}
          phaseSec={phaseSec}
          judges={judges}
          showScores
          fit
          maxShown={windowWidth < 640 ? 6 : 24}
          colors={song.colors}
        >
          {countdown && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div
                key={countdown}
                className="countdown-pop text-center text-5xl font-black italic text-yellow-200 drop-shadow-[0_4px_0_rgba(80,20,120,0.9)] sm:text-7xl"
              >
                {countdown}
              </div>
            </div>
          )}
          {!isDancer && (
            <div className="absolute left-3 top-3 z-10 rounded-full bg-black/40 px-3 py-1 text-xs font-bold">
              👀 Bạn đang xem
            </div>
          )}
        </Stage>
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-white/10 bg-black/30 p-3 lg:block">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-white/60">
            Bảng điểm
          </p>
          <Leaderboard players={dancers} meId={meId} />
        </aside>
      </div>

      {/* Prompt panel */}
      <section className="relative border-t-4 border-fuchsia-400 bg-gradient-to-b from-[#2b1263] to-[#1a0840] px-3 pb-3 pt-2">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
          <div className="flex min-h-[28px] w-full flex-wrap items-center justify-center gap-2">
            {isDancer && lastResult && (
              <div
                key={lastResult.round}
                className={cn(
                  "countdown-pop flex flex-wrap items-center gap-x-2 rounded-full px-3 py-0.5 text-sm font-bold",
                  lastResult.correct
                    ? "bg-emerald-500/20 text-emerald-100"
                    : "bg-rose-500/20 text-rose-100"
                )}
              >
                <span
                  className={cn(
                    "font-black italic",
                    RESULT_COLORS[lastResult.rating]
                  )}
                >
                  {RATING_LABEL[lastResult.rating]}
                  {lastResult.points > 0 && ` +${lastResult.points}`}
                </span>
                <span>
                  {lastResult.correct ? "✓" : "✗"}{" "}
                  <b className="text-yellow-200">
                    {displayWord(lastResult.word)}
                  </b>{" "}
                  = {lastResult.word.vi} {lastResult.word.emoji}
                </span>
                {!lastResult.correct && lastResult.typed && (
                  <span className="opacity-70">
                    (bạn gõ “{lastResult.typed}”)
                  </span>
                )}
              </div>
            )}
            {!isDancer && previousWord && (
              <div className="rounded-full bg-white/10 px-3 py-0.5 text-sm font-bold">
                Từ trước:{" "}
                <b className="text-yellow-200">{displayWord(previousWord)}</b> ={" "}
                {previousWord.vi} {previousWord.emoji}
                {previousStats && (
                  <span className="ml-2 text-emerald-300">
                    {previousStats.right}/{previousStats.total} bạn đúng
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex min-h-[64px] items-center justify-center">
            {word ? (
              <PromptCard word={word} mode={game.mode} />
            ) : (
              <p className="text-lg font-bold text-white/70">
                {round < 0
                  ? "Nhạc sắp bắt đầu — đặt tay lên bàn phím nào!"
                  : "Hoàn thành! Đang tổng kết điểm…"}
              </p>
            )}
          </div>

          {isDancer && word && preset.hint !== "none" && (
            <LetterSlots
              word={word}
              typed={typed}
              showFirst={preset.hint === "first"}
              liveCheck={preset.liveCheck}
            />
          )}

          {isDancer && (
            <input
              ref={inputRef}
              value={typed}
              disabled={!word || answered}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
              aria-label="Gõ từ tiếng Anh"
              placeholder={
                word
                  ? answered
                    ? "Chờ từ tiếp theo…"
                    : "Gõ từ tiếng Anh…"
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value.slice(0, 40);
                typedRef.current = value;
                setTyped(value);
              }}
              onKeyDown={onKeyDown}
              className={cn(
                "w-full max-w-md rounded-2xl border-4 bg-white px-4 py-2 text-center text-2xl font-black text-slate-800 outline-none transition-colors placeholder:text-base placeholder:font-semibold placeholder:text-slate-400 disabled:bg-white/70",
                !preset.liveCheck || typed.length === 0
                  ? "border-purple-300 focus:border-yellow-300"
                  : prefixOk
                    ? "border-emerald-400"
                    : "border-rose-500"
              )}
            />
          )}

          {hint && (
            <p
              key={hint.key}
              className="shake text-sm font-bold text-yellow-200"
            >
              {hint.text}
            </p>
          )}

          <BeatBar
            beats={timing.beatsPerRound}
            lit={lit}
            cursorRef={cursorRef}
            targetRef={targetRef}
          />
        </div>
      </section>
    </div>
  );
}
