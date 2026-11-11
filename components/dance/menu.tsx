"use client";

import { useState } from "react";

import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Keyboard,
  Loader2,
  Music2,
  Settings2,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { music } from "@/lib/dance/audio";
import { randomFunName } from "@/lib/dance/avatar";
import { loadPrefs, savePrefs } from "@/lib/dance/prefs";
import { useDance } from "@/lib/dance/store";
import { defaultServerUrl } from "@/lib/dance/transport";
import type { Avatar } from "@/lib/dance/types";

import { AvatarEditor } from "./avatar-editor";
import { DancerShowcase } from "./showcase";

const TICKER = [
  "PERFECT",
  "ENGLISH × RHYTHM",
  "TYPE THE WORD",
  "HIT THE BEAT",
  "COMBO",
  "VOGUE",
  "POP & LOCK",
  "FREESTYLE",
];

export function Menu({ initialRoom }: { initialRoom?: string }) {
  const { user } = useUser();
  const phase = useDance((s) => s.phase);
  const error = useDance((s) => s.error);
  const connect = useDance((s) => s.connect);

  const [prefs] = useState(loadPrefs);
  const [name, setName] = useState(prefs.name);
  const [avatar, setAvatarState] = useState<Avatar>(prefs.avatar);
  const [code, setCode] = useState(
    (initialRoom ?? "").toUpperCase().slice(0, 6)
  );
  const [serverUrl, setServerUrl] = useState(prefs.serverUrl);
  const [showServer, setShowServer] = useState(false);

  const busy = phase === "connecting";
  const suggestedName = user?.firstName || user?.username || "";

  const setAvatar = (next: Avatar) => {
    setAvatarState(next);
    savePrefs({ avatar: next });
  };

  const go = (kind: "create" | "join" | "solo") => {
    music.unlock();
    music.sfx("join");
    const finalName = name.trim() || suggestedName || randomFunName();
    if (!name.trim()) setName(finalName);
    savePrefs({ name: finalName, avatar, serverUrl: serverUrl.trim() });
    void connect(
      kind,
      { name: finalName, avatar },
      { code, serverUrl: serverUrl.trim() }
    );
  };

  return (
    <div className="club-bg min-h-[100dvh] overflow-x-hidden">
      {/* ticker */}
      <div className="overflow-hidden border-b border-white/10 bg-black/40 py-1.5">
        <div className="marquee font-display gap-8 text-sm tracking-[0.3em] text-white/40">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span
              key={i}
              className={i % 4 === 0 ? "text-[var(--neon-pink)]" : undefined}
            >
              {t} ✦
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:py-10">
        <header className="flex items-center justify-between">
          <Link
            href="/learn"
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Lingo
          </Link>
          <span className="label">Season 01</span>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.05fr]">
          {/* Left: brand + join */}
          <section className="flex min-w-0 flex-col gap-6">
            <div>
              <p className="label mb-3 text-[var(--neon-cyan)]">
                English vocabulary × rhythm battle
              </p>
              <h1 className="font-display text-[4.5rem] leading-[0.85] sm:text-[7.5rem]">
                <span className="text-gradient">Lingo</span>
                <br />
                Dance
              </h1>
              <p className="mt-4 max-w-md text-base text-white/70">
                Gõ đúng từ. Bắt đúng nhịp. Vũ công của bạn sẽ cháy hết mình trên
                sân khấu — cùng cả lớp, theo thời gian thực.
              </p>
            </div>

            <ul className="grid grid-cols-3 gap-2 text-xs text-white/70">
              {[
                {
                  icon: Keyboard,
                  title: "Gõ chính tả",
                  text: "Nghĩa → từ tiếng Anh",
                },
                { icon: Music2, title: "Bắt nhịp", text: "Enter đúng beat" },
                { icon: Users, title: "Battle", text: "Cả lớp cùng lúc" },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="glass rounded-xl p-3">
                  <Icon className="mb-2 h-4 w-4 text-[var(--neon-pink)]" />
                  <p className="font-bold text-white">{title}</p>
                  <p>{text}</p>
                </li>
              ))}
            </ul>

            {error && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div className="glass flex flex-col gap-4 rounded-2xl p-5">
              <label className="block">
                <span className="label mb-2 block">Nghệ danh</span>
                <input
                  value={name}
                  maxLength={16}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={suggestedName || "VD: Minh Anh"}
                  className="field text-lg font-bold"
                />
              </label>

              <button
                type="button"
                className="btn-neon w-full"
                disabled={busy}
                onClick={() => go("create")}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Tạo phòng mới
              </button>

              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim()) go("join");
                }}
              >
                <input
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="CODE"
                  aria-label="Mã phòng"
                  className="field font-display min-w-0 text-center text-2xl tracking-[0.4em]"
                />
                <button
                  type="submit"
                  className="btn-ghost shrink-0"
                  disabled={busy || !code.trim()}
                >
                  Vào phòng
                </button>
              </form>

              <button
                type="button"
                className="btn-ghost w-full"
                disabled={busy}
                onClick={() => go("solo")}
              >
                Luyện tập solo cùng bot
              </button>

              <button
                type="button"
                onClick={() => setShowServer((v) => !v)}
                className="flex items-center gap-1 self-start text-[11px] font-semibold uppercase tracking-widest text-white/35 hover:text-white/70"
              >
                <Settings2 className="h-3.5 w-3.5" /> Máy chủ nhiều người chơi
              </button>
              {showServer && (
                <div className="space-y-1 text-xs text-white/50">
                  <input
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder={defaultServerUrl()}
                    className="field font-mono text-xs"
                  />
                  <p>
                    Để trống để dùng mặc định. Chạy máy chủ bằng{" "}
                    <code className="rounded bg-white/10 px-1">
                      bun run dance:server
                    </code>
                    .
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Right: wardrobe */}
          <section className="glass min-w-0 overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p className="font-display text-2xl tracking-widest">Wardrobe</p>
              <p className="label">Phối đồ cho vũ công</p>
            </div>
            <DancerShowcase
              avatar={avatar}
              className="h-[380px] sm:h-[440px]"
            />
            <div className="p-5">
              <AvatarEditor avatar={avatar} onChange={setAvatar} />
            </div>
          </section>
        </div>

        <section className="grid gap-3 text-sm text-white/65 sm:grid-cols-4">
          {[
            ["01", "Mỗi lượt hiện nghĩa tiếng Việt — gõ từ tiếng Anh."],
            ["02", "Sai chính tả, ô sẽ báo đỏ ngay để bạn sửa."],
            ["03", "Chờ tia sáng chạm vòng tròn rồi nhấn Enter."],
            ["04", "Chuỗi combo dài mở khoá những bước nhảy khó hơn."],
          ].map(([n, text]) => (
            <div key={n} className="border-t border-white/10 pt-3">
              <p className="font-display text-3xl text-white/25">{n}</p>
              <p>{text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
