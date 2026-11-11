"use client";

import { useState } from "react";

import { Bot, Check, Copy, Eye, LogOut, Play, Shirt } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { music } from "@/lib/dance/audio";
import { MAX_BOTS } from "@/lib/dance/room";
import { DIFFICULTIES, PROMPT_MODES, ROUND_OPTIONS } from "@/lib/dance/rules";
import { SONGS, getSong } from "@/lib/dance/songs";
import { useDance } from "@/lib/dance/store";
import type {
  Difficulty,
  PromptMode,
  RoomConfig,
  RoomSnapshot,
} from "@/lib/dance/types";
import {
  ALL_WORDS_ID,
  CUSTOM_WORDS_ID,
  WORD_SETS,
  formatCustomWords,
  getWordPool,
  parseCustomWords,
  wordSetLabel,
} from "@/lib/dance/words";
import { savePrefs } from "@/lib/dance/prefs";
import { cn } from "@/lib/utils";

import { AvatarEditor } from "./avatar-editor";
import { Stage } from "./stage";

const CUSTOM_PLACEHOLDER = `Mỗi dòng một từ, ví dụ:
apple = quả táo = 🍎
happy = vui vẻ
grey/gray = màu xám`;

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl border-2 border-b-4 px-3 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed",
            value === o.value
              ? "border-purple-500 bg-purple-500 text-white"
              : "border-slate-200 bg-white text-slate-600 enabled:hover:bg-slate-50"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function Settings({ room, isHost }: { room: RoomSnapshot; isHost: boolean }) {
  const send = useDance((s) => s.send);
  const config = room.config;
  const [customText, setCustomText] = useState(() =>
    formatCustomWords(config.customWords)
  );
  const parsed = parseCustomWords(customText);
  const update = (patch: Partial<RoomConfig>) =>
    send({ type: "config", config: patch });
  const disabled = !isHost;

  return (
    <div className="space-y-4">
      <Field label="Chủ đề từ vựng">
        <select
          value={config.wordSetId}
          disabled={disabled}
          onChange={(e) => update({ wordSetId: e.target.value })}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 outline-none focus:border-purple-400 disabled:bg-slate-50"
        >
          {WORD_SETS.map((set) => (
            <option key={set.id} value={set.id}>
              {set.emoji} {set.name} ({set.words.length} từ)
            </option>
          ))}
          <option value={ALL_WORDS_ID}>{wordSetLabel(ALL_WORDS_ID)}</option>
          <option value={CUSTOM_WORDS_ID}>
            {wordSetLabel(CUSTOM_WORDS_ID)}
          </option>
        </select>
        {config.wordSetId === CUSTOM_WORDS_ID &&
          (isHost ? (
            <div className="mt-2">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onBlur={() => update({ customWords: parsed })}
                rows={6}
                placeholder={CUSTOM_PLACEHOLDER}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-mono text-sm text-slate-700 outline-none focus:border-purple-400"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {parsed.length} từ hợp lệ · đã lưu {config.customWords.length}
                </span>
                <button
                  type="button"
                  onClick={() => update({ customWords: parsed })}
                  className="font-bold text-purple-600 hover:underline"
                >
                  Lưu danh sách
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Danh sách tự nhập: {config.customWords.length} từ
            </p>
          ))}
        {config.wordSetId === CUSTOM_WORDS_ID &&
          config.customWords.length === 0 && (
            <p className="mt-1 text-xs font-semibold text-amber-600">
              Chưa có từ nào — sẽ dùng chủ đề Động vật.
            </p>
          )}
        <p className="mt-1 truncate text-xs text-slate-400">
          Ví dụ:{" "}
          {getWordPool(config)
            .slice(0, 6)
            .map((w) => w.en)
            .join(", ")}
          …
        </p>
      </Field>

      <Field label="Bài nhạc">
        <div className="grid grid-cols-2 gap-2">
          {SONGS.map((song) => (
            <button
              key={song.id}
              type="button"
              disabled={disabled}
              onClick={() => update({ songId: song.id })}
              className={cn(
                "rounded-2xl border-2 border-b-4 p-2 text-left transition-colors disabled:cursor-not-allowed",
                config.songId === song.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 bg-white enabled:hover:bg-slate-50"
              )}
            >
              <div className="text-sm font-black text-slate-700">
                {song.emoji} {song.name}
              </div>
              <div className="text-xs text-slate-500">{song.vibe}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Độ khó">
        <Segmented<Difficulty>
          disabled={disabled}
          value={config.difficulty}
          onChange={(difficulty) => update({ difficulty })}
          options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({
            value: d,
            label: DIFFICULTIES[d].label,
            hint: DIFFICULTIES[d].description,
          }))}
        />
        <p className="mt-1 text-xs text-slate-500">
          {DIFFICULTIES[config.difficulty].description}
        </p>
      </Field>

      <Field label="Kiểu chơi">
        <Segmented<PromptMode>
          disabled={disabled}
          value={config.mode}
          onChange={(mode) => update({ mode })}
          options={(Object.keys(PROMPT_MODES) as PromptMode[]).map((m) => ({
            value: m,
            label: PROMPT_MODES[m].label,
            hint: PROMPT_MODES[m].description,
          }))}
        />
        <p className="mt-1 text-xs text-slate-500">
          {PROMPT_MODES[config.mode].description}
        </p>
      </Field>

      <Field label="Số từ mỗi bài">
        <Segmented<number>
          disabled={disabled}
          value={config.rounds}
          onChange={(rounds) => update({ rounds })}
          options={ROUND_OPTIONS.map((r) => ({ value: r, label: String(r) }))}
        />
      </Field>
    </div>
  );
}

export function Lobby() {
  const room = useDance((s) => s.room)!;
  const meId = useDance((s) => s.playerId);
  const mode = useDance((s) => s.mode);
  const send = useDance((s) => s.send);
  const leave = useDance((s) => s.leave);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const me = room.players.find((p) => p.id === meId);
  const isHost = room.hostId === meId;
  const dancers = room.players.filter((p) => !p.spectator);
  const watchers = room.players.filter((p) => p.spectator);
  const bots = room.players.filter((p) => p.isBot).length;
  const song = getSong(room.config.songId);
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dance?room=${room.code}`
      : `/dance?room=${room.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked – the link is visible anyway
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-700 via-purple-600 to-fuchsia-500 p-3 sm:p-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center gap-3 rounded-3xl bg-white/15 p-3 text-white backdrop-blur">
          {mode === "online" ? (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs font-bold uppercase opacity-80">
                  Mã phòng
                </p>
                <p className="text-4xl font-black tracking-[0.25em]">
                  {room.code}
                </p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-semibold opacity-90">
                  Học sinh mở link hoặc nhập mã ở trang Lingo Dance:
                </p>
                <button
                  type="button"
                  onClick={copy}
                  className="mt-0.5 flex max-w-full items-center gap-1 truncate rounded-lg bg-white/20 px-2 py-1 font-mono text-xs hover:bg-white/30"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate">{joinUrl}</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase opacity-80">Chế độ</p>
              <p className="text-2xl font-black">Luyện tập cùng bot 🤖</p>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Shirt className="mr-1 h-4 w-4" /> Nhân vật
            </Button>
            <Button variant="dangerOutline" size="sm" onClick={() => leave()}>
              <LogOut className="mr-1 h-4 w-4" /> Rời phòng
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-3">
            <Stage
              className="min-h-[340px] rounded-3xl border-4 border-white/30 shadow-2xl lg:min-h-[460px]"
              players={dancers}
              meId={meId}
              hostId={room.hostId}
              beatSec={60 / song.bpm}
              colors={song.colors}
              onKick={
                isHost
                  ? (id) => send({ type: "kick", playerId: id })
                  : undefined
              }
            >
              <div className="absolute left-3 top-3 rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-white">
                {dancers.length} người nhảy · {room.players.length} trong phòng
              </div>
            </Stage>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/15 p-3 text-sm text-white">
              <label className="flex cursor-pointer items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-yellow-300"
                  checked={me?.spectator ?? false}
                  onChange={(e) =>
                    send({ type: "spectate", value: e.target.checked })
                  }
                />
                <Eye className="h-4 w-4" /> Chỉ xem (giáo viên chiếu lên màn
                hình lớn)
              </label>
              {watchers.length > 0 && (
                <span className="ml-auto text-xs opacity-80">
                  👀 Đang xem: {watchers.map((w) => w.name).join(", ")}
                </span>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-3xl border-2 border-b-8 border-purple-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-700">
                Cài đặt bài nhảy
              </h2>
              {!isHost && (
                <span className="text-xs font-bold text-slate-400">
                  Chủ phòng chọn
                </span>
              )}
            </div>
            <Settings room={room} isHost={isHost} />

            {isHost && (
              <Button
                variant="default"
                size="sm"
                disabled={bots >= MAX_BOTS}
                onClick={() => send({ type: "add-bot" })}
              >
                <Bot className="mr-1 h-4 w-4" /> Thêm bot ({bots}/{MAX_BOTS})
              </Button>
            )}

            {isHost ? (
              <Button
                variant="secondary"
                size="lg"
                className="h-14 text-lg"
                disabled={dancers.length === 0}
                onClick={() => {
                  music.unlock();
                  send({ type: "start" });
                }}
              >
                <Play className="mr-2 h-5 w-5" /> Bắt đầu nhảy!
              </Button>
            ) : (
              <div className="rounded-2xl bg-purple-50 p-3 text-center text-sm font-bold text-purple-700">
                ⏳ Chờ chủ phòng bắt đầu… Hãy sẵn sàng tay trên bàn phím!
              </div>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Đổi nhân vật</DialogTitle>
          </DialogHeader>
          {me && (
            <>
              <input
                defaultValue={me.name}
                maxLength={16}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== me.name) {
                    savePrefs({ name });
                    send({ type: "profile", name, avatar: me.avatar });
                  }
                }}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-lg font-bold text-slate-700 outline-none focus:border-purple-400"
              />
              <AvatarEditor
                avatar={me.avatar}
                onChange={(avatar) => {
                  savePrefs({ avatar });
                  send({ type: "profile", name: me.name, avatar });
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
