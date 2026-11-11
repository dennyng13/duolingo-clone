"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Languages, LogOut, Square, Volume2, VolumeX } from "lucide-react";
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
  perfect: "text-[#ff7cf3]",
  great: "text-[#19e3ff]",
  cool: "text-[#c8ff3d]",
  bad: "text-[#ffb34d]",
  miss: "text-white/50",
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
      <div className="absolute inset-x-[23px] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/30 to-white/40" />
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
                <span className="font-display absolute inset-0 grid place-items-center text-[11px] tracking-wider text-[#c8ff3d]">
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
    <div className="flex flex-wrap justify-center gap-1.5">
      {answer.split("").map((char, i) => {
        if (char === " ") return <span key={i} className="w-4" />;
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
          <span key={i} className="letter-slot" data-state={state}>
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
          className="btn-ghost text-base"
        >
          <Volume2 className="h-5 w-5 text-[#19e3ff]" /> Nghe lại
        </button>
        {word.emoji && (
          <span className="text-3xl opacity-80">{word.emoji}</span>
        )}
      </div>
    );
  }
  if (mode === "copy") {
    return (
      <div className="text-center">
        <div
          data-testid="prompt-word"
          className="font-display text-gradient text-5xl tracking-widest sm:text-6xl"
        >
          {displayWord(word)}
        </div>
        <div className="text-sm text-white/55">{word.vi}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {word.emoji && (
        <span className="text-3xl opacity-80 sm:text-4xl">{word.emoji}</span>
      )}
      <span className="text-2xl font-extrabold text-white sm:text-[2rem]">
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

  const [round, setRound] = useState(-1);
  const [typed, setTyped] = useState("");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [countdown, setCountdown] = useState<string | null>("READY");
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
  const countdownRef = useRef<string | null>("READY");
  const judgedRef = useRef(new Set<number>());
  const typedRef = useRef("");
  const speakRef = useRef(prefs.speak);
  // Dancers follow the same clock as the music.
  const songClock = useCallback(() => clockRef.current?.now() ?? 0, []);

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
      if (beat < 0) cd = "READY";
      else if (r === -1) {
        const remaining = timing.leadInBeats - Math.floor(beat);
        cd =
          remaining > 4
            ? "GET READY"
            : remaining === 1
              ? "GO!"
              : String(remaining - 1);
      } else if (r >= timing.rounds) cd = "FINISH";
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
        text: "Chưa tới nhịp — chờ tia sáng chạm vòng tròn rồi nhấn Enter",
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
      className="flex h-[100dvh] flex-col overflow-hidden bg-[#05040a] text-white"
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-black/60 px-3 py-2 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--neon-pink)]" />
          <span className="font-display hidden truncate text-lg tracking-widest sm:inline">
            {song.name}
          </span>
        </div>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            ref={progressRef}
            className="h-full rounded-full bg-gradient-to-r from-[#ff2d95] via-[#9b4dff] to-[#19e3ff]"
            style={{ width: 0 }}
          />
        </div>
        <span className="font-display text-lg tabular-nums tracking-wider text-white/70">
          {Math.min(Math.max(round + 1, 0), game.words.length)}/
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
            "rounded-lg p-1.5",
            speakOn
              ? "bg-[#19e3ff]/25 text-[#19e3ff]"
              : "bg-white/10 text-white/50"
          )}
        >
          <Languages className="h-4 w-4" />
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
          clock={songClock}
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
                className="pop-in font-display text-gradient text-center text-7xl tracking-widest drop-shadow-[0_0_24px_rgba(255,45,149,0.6)] sm:text-9xl"
              >
                {countdown}
              </div>
            </div>
          )}
          {!isDancer && (
            <div className="glass absolute left-3 top-6 z-10 rounded-full px-3 py-1 text-xs font-semibold">
              Đang xem trực tiếp
            </div>
          )}
        </Stage>
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-black/50 p-3 lg:block">
          <p className="font-display mb-2 text-xl tracking-widest text-white/70">
            Ranking
          </p>
          <Leaderboard players={dancers} meId={meId} />
        </aside>
      </div>

      {/* Prompt panel */}
      <section className="relative border-t border-white/10 bg-[#0b0912] px-3 pb-3 pt-2 shadow-[0_-20px_40px_-20px_rgba(255,45,149,0.35)]">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
          <div className="flex min-h-[28px] w-full flex-wrap items-center justify-center gap-2">
            {isDancer && lastResult && (
              <div
                key={lastResult.round}
                className={cn(
                  "fade-up flex flex-wrap items-center gap-x-2 rounded-full border px-3 py-0.5 text-sm",
                  lastResult.correct
                    ? "border-[#c8ff3d]/30 bg-[#c8ff3d]/10"
                    : "border-rose-400/30 bg-rose-500/10"
                )}
              >
                <span
                  className={cn(
                    "font-display text-base tracking-wider",
                    RESULT_COLORS[lastResult.rating]
                  )}
                >
                  {RATING_LABEL[lastResult.rating]}
                  {lastResult.points > 0 && ` +${lastResult.points}`}
                </span>
                <span>
                  {lastResult.correct ? "✓" : "✗"}{" "}
                  <b className="text-white">{displayWord(lastResult.word)}</b>{" "}
                  <span className="text-white/60">= {lastResult.word.vi}</span>
                </span>
                {!lastResult.correct && lastResult.typed && (
                  <span className="opacity-70">
                    (bạn gõ “{lastResult.typed}”)
                  </span>
                )}
              </div>
            )}
            {!isDancer && previousWord && (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-0.5 text-sm">
                Từ trước:{" "}
                <b className="text-white">{displayWord(previousWord)}</b>{" "}
                <span className="text-white/60">= {previousWord.vi}</span>
                {previousStats && (
                  <span className="ml-2 font-semibold text-[#c8ff3d]">
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
              <p className="text-base font-semibold text-white/55">
                {round < 0
                  ? "Nhạc sắp vào — đặt tay lên bàn phím"
                  : "Hết bài! Đang tổng kết điểm…"}
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
                "w-full max-w-md rounded-xl border bg-white/[0.06] px-4 py-2.5 text-center text-2xl font-bold tracking-wide text-white outline-none transition-[border-color,box-shadow] placeholder:text-base placeholder:font-medium placeholder:tracking-normal placeholder:text-white/30 disabled:opacity-50",
                !preset.liveCheck || typed.length === 0
                  ? "border-white/15 focus:border-[#ff2d95] focus:shadow-[0_0_0_3px_rgba(255,45,149,0.2)]"
                  : prefixOk
                    ? "border-[#c8ff3d] shadow-[0_0_0_3px_rgba(200,255,61,0.15)]"
                    : "border-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.2)]"
              )}
            />
          )}

          {hint && (
            <p
              key={hint.key}
              className="shake text-sm font-semibold text-[#ffb34d]"
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
