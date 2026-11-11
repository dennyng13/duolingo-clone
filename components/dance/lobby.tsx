"use client";

import { useState } from "react";

import { Bot, Check, Copy, Eye, LogOut, Play, Shirt, X } from "lucide-react";

import { music } from "@/lib/dance/audio";
import { savePrefs } from "@/lib/dance/prefs";
import { MAX_BOTS } from "@/lib/dance/room";
import { DIFFICULTIES, PROMPT_MODES, ROUND_OPTIONS } from "@/lib/dance/rules";
import { SONGS, getSong } from "@/lib/dance/songs";
import { useDance } from "@/lib/dance/store";
import type {
  Avatar,
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
import { cn } from "@/lib/utils";

import { AvatarEditor } from "./avatar-editor";
import { DancerShowcase } from "./showcase";
import { Stage } from "./stage";

const CUSTOM_PLACEHOLDER = `Mỗi dòng một từ, ví dụ:
negotiate = đàm phán
sustainable = bền vững
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
          className="chip"
          data-on={value === o.value}
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
      <p className="label mb-2">{label}</p>
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
  const advanced = WORD_SETS.filter((s) => s.level === "advanced");
  const basic = WORD_SETS.filter((s) => s.level === "basic");

  return (
    <div className="space-y-5">
      <Field label="Bộ từ vựng">
        <select
          value={config.wordSetId}
          disabled={disabled}
          onChange={(e) => update({ wordSetId: e.target.value })}
          className="field font-semibold disabled:opacity-70"
        >
          <optgroup label="Sinh viên · trung cấp">
            {advanced.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.words.length} từ)
              </option>
            ))}
          </optgroup>
          <optgroup label="Cơ bản · khởi động">
            {basic.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.words.length} từ)
              </option>
            ))}
          </optgroup>
          <optgroup label="Khác">
            <option value={ALL_WORDS_ID}>{wordSetLabel(ALL_WORDS_ID)}</option>
            <option value={CUSTOM_WORDS_ID}>
              {wordSetLabel(CUSTOM_WORDS_ID)}
            </option>
          </optgroup>
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
                className="field font-mono text-sm"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-white/50">
                <span>
                  {parsed.length} từ hợp lệ · đã lưu {config.customWords.length}
                </span>
                <button
                  type="button"
                  onClick={() => update({ customWords: parsed })}
                  className="font-bold text-[var(--neon-cyan)] hover:underline"
                >
                  Lưu danh sách
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-white/50">
              Danh sách tự nhập: {config.customWords.length} từ
            </p>
          ))}
        {config.wordSetId === CUSTOM_WORDS_ID &&
          config.customWords.length === 0 && (
            <p className="mt-1 text-xs font-semibold text-amber-300">
              Chưa có từ nào — sẽ dùng bộ “{WORD_SETS[0].name}”.
            </p>
          )}
        <p className="mt-1.5 truncate text-xs text-white/40">
          {getWordPool(config)
            .slice(0, 6)
            .map((w) => w.en)
            .join(" · ")}
          …
        </p>
      </Field>

      <Field label="Track">
        <div className="grid grid-cols-2 gap-2">
          {SONGS.map((song) => (
            <button
              key={song.id}
              type="button"
              disabled={disabled}
              onClick={() => update({ songId: song.id })}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-colors disabled:cursor-default",
                config.songId === song.id
                  ? "border-transparent bg-gradient-to-br from-[#ff2d95]/30 to-[#19e3ff]/20 ring-1 ring-[#ff2d95]"
                  : "border-white/10 bg-white/[0.03] enabled:hover:border-white/30"
              )}
            >
              <div className="font-display text-lg leading-none tracking-wider">
                {song.name}
              </div>
              <div className="mt-1 text-[11px] text-white/55">{song.vibe}</div>
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
        <p className="mt-1.5 text-xs text-white/45">
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
        <p className="mt-1.5 text-xs text-white/45">
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

function WardrobeModal({
  name,
  avatar,
  onClose,
  onSave,
}: {
  name: string;
  avatar: Avatar;
  onClose: () => void;
  onSave: (name: string, avatar: Avatar) => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draft, setDraft] = useState(avatar);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass grid max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#0d0b14]/95 md:grid-cols-[1fr_1.2fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <DancerShowcase
          avatar={draft}
          className="h-[300px] md:h-full md:min-h-[460px]"
        />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-3xl tracking-widest">Wardrobe</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-white/60 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <label>
            <span className="label mb-2 block">Nghệ danh</span>
            <input
              value={draftName}
              maxLength={16}
              onChange={(e) => setDraftName(e.target.value)}
              className="field font-bold"
            />
          </label>
          <AvatarEditor avatar={draft} onChange={setDraft} />
          <button
            type="button"
            className="btn-neon mt-auto"
            onClick={() => onSave(draftName.trim() || name, draft)}
          >
            Lưu outfit
          </button>
        </div>
      </div>
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
    <div className="club-bg min-h-[100dvh] p-3 sm:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="glass flex flex-wrap items-center gap-4 rounded-2xl px-4 py-3">
          {mode === "online" ? (
            <>
              <div>
                <p className="label">Mã phòng</p>
                <p className="font-display text-gradient text-5xl leading-none tracking-[0.25em]">
                  {room.code}
                </p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="text-white/60">
                  Người chơi mở link hoặc nhập mã ở trang Lingo Dance
                </p>
                <button
                  type="button"
                  onClick={copy}
                  className="mt-1 flex max-w-full items-center gap-1.5 truncate rounded-lg bg-white/[0.06] px-2 py-1 font-mono text-xs text-white/80 hover:bg-white/10"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[var(--neon-lime)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate">{joinUrl}</span>
                </button>
              </div>
            </>
          ) : (
            <div>
              <p className="label">Chế độ</p>
              <p className="font-display text-4xl leading-none tracking-widest">
                Solo practice
              </p>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditing(true)}
            >
              <Shirt className="h-4 w-4" /> Outfit
            </button>
            <button type="button" className="btn-ghost" onClick={() => leave()}>
              <LogOut className="h-4 w-4" /> Rời phòng
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
          <div className="flex min-w-0 flex-col gap-3">
            <Stage
              className="min-h-[420px] rounded-2xl border border-white/10 lg:min-h-[560px]"
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
              <div className="absolute left-4 top-6 z-10 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-lime)]" />
                <span className="font-display text-lg tracking-widest">
                  Backstage
                </span>
                <span className="text-xs text-white/60">
                  · {dancers.length} vũ công
                </span>
              </div>
            </Stage>

            <div className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#ff2d95]"
                  checked={me?.spectator ?? false}
                  onChange={(e) =>
                    send({ type: "spectate", value: e.target.checked })
                  }
                />
                <Eye className="h-4 w-4 text-white/60" /> Chỉ xem — giáo viên
                chiếu lên màn hình lớn
              </label>
              {watchers.length > 0 && (
                <span className="ml-auto text-xs text-white/50">
                  Đang xem: {watchers.map((w) => w.name).join(", ")}
                </span>
              )}
            </div>
          </div>

          <aside className="glass flex min-w-0 flex-col gap-5 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl tracking-widest">Setlist</h2>
              {!isHost && <span className="label">Chủ phòng chọn</span>}
            </div>
            <Settings room={room} isHost={isHost} />

            {isHost && (
              <button
                type="button"
                className="btn-ghost"
                disabled={bots >= MAX_BOTS}
                onClick={() => send({ type: "add-bot" })}
              >
                <Bot className="h-4 w-4" /> Thêm bot ({bots}/{MAX_BOTS})
              </button>
            )}

            {isHost ? (
              <button
                type="button"
                className="btn-neon h-14 text-base"
                disabled={dancers.length === 0}
                onClick={() => {
                  music.unlock();
                  send({ type: "start" });
                }}
              >
                <Play className="h-5 w-5" /> Bắt đầu biểu diễn
              </button>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-sm text-white/70">
                Chờ chủ phòng bắt đầu… đặt tay lên bàn phím nhé.
              </div>
            )}
          </aside>
        </div>
      </div>

      {editing && me && (
        <WardrobeModal
          name={me.name}
          avatar={me.avatar}
          onClose={() => setEditing(false)}
          onSave={(name, avatar) => {
            savePrefs({ name, avatar });
            send({ type: "profile", name, avatar });
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
