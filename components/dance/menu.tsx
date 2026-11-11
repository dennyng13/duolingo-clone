"use client";

import { useState } from "react";

import { useUser } from "@clerk/nextjs";
import { Loader2, Settings2, Users, Wand2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { music } from "@/lib/dance/audio";
import { randomFunName } from "@/lib/dance/avatar";
import { loadPrefs, savePrefs } from "@/lib/dance/prefs";
import { useDance } from "@/lib/dance/store";
import { defaultServerUrl } from "@/lib/dance/transport";
import type { Avatar } from "@/lib/dance/types";

import { AvatarEditor } from "./avatar-editor";

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
    <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-700 via-purple-600 to-fuchsia-500 px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between text-white">
          <Link
            href="/learn"
            className="text-sm font-bold opacity-80 hover:opacity-100"
          >
            ← Lingo
          </Link>
        </header>

        <div className="text-center text-white">
          <h1 className="text-4xl font-black tracking-tight drop-shadow sm:text-6xl">
            <span className="title-wobble">🪩</span> Lingo Dance
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base font-semibold text-white/90 sm:text-lg">
            Gõ đúng từ tiếng Anh, nhấn{" "}
            <kbd className="rounded bg-white/20 px-1.5">Enter</kbd> đúng nhịp —
            nhân vật của bạn sẽ nhảy cùng cả lớp!
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-3xl border-2 border-b-8 border-purple-200 bg-white p-5 shadow-xl">
            <h2 className="mb-3 text-lg font-black text-slate-700">
              1. Tạo nhân vật của bạn
            </h2>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Tên hiển thị
              </span>
              <input
                value={name}
                maxLength={16}
                onChange={(e) => setName(e.target.value)}
                placeholder={suggestedName || "Ví dụ: Minh Anh"}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-lg font-bold text-slate-700 outline-none focus:border-purple-400"
              />
            </label>
            <AvatarEditor avatar={avatar} onChange={setAvatar} />
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border-2 border-b-8 border-purple-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-black text-slate-700">
              2. Vào sàn nhảy
            </h2>

            <Button
              variant="super"
              size="lg"
              disabled={busy}
              onClick={() => go("create")}
            >
              {busy ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Users className="mr-2 h-5 w-5" />
              )}
              Tạo phòng mới (giáo viên / chủ phòng)
            </Button>

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
                placeholder="MÃ PHÒNG"
                aria-label="Mã phòng"
                className="w-full min-w-0 rounded-xl border-2 border-slate-200 px-3 text-center text-xl font-black uppercase tracking-[0.3em] text-slate-700 outline-none focus:border-sky-400"
              />
              <Button
                variant="primary"
                size="lg"
                disabled={busy || !code.trim()}
                type="submit"
              >
                Vào phòng
              </Button>
            </form>

            <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-400">
              <div className="h-px flex-1 bg-slate-200" /> hoặc{" "}
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Button
              variant="secondary"
              size="lg"
              disabled={busy}
              onClick={() => go("solo")}
            >
              <Wand2 className="mr-2 h-5 w-5" /> Luyện tập một mình (cùng bot)
            </Button>

            <div className="rounded-2xl bg-purple-50 p-4 text-sm text-slate-600">
              <p className="mb-2 font-black text-purple-700">Cách chơi</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  Mỗi nhịp nhạc sẽ hiện một từ (nghĩa tiếng Việt, hình hoặc âm
                  thanh).
                </li>
                <li>Gõ từ tiếng Anh vào ô — ô sẽ báo đỏ nếu sai chính tả.</li>
                <li>
                  Chờ quả bóng chạy tới <b>vòng vàng</b> rồi nhấn <b>Enter</b>:
                  càng đúng nhịp càng được <b>PERFECT</b>!
                </li>
                <li>
                  Đúng liên tiếp để lên combo và nhảy những bước thật ngầu.
                </li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setShowServer((v) => !v)}
              className="flex items-center gap-1 self-start text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              <Settings2 className="h-3.5 w-3.5" /> Máy chủ nhiều người chơi
            </button>
            {showServer && (
              <div className="space-y-1 text-xs text-slate-500">
                <input
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder={defaultServerUrl()}
                  className="w-full rounded-lg border-2 border-slate-200 px-2 py-1 font-mono text-slate-700 outline-none focus:border-purple-400"
                />
                <p>
                  Để trống để dùng mặc định. Máy chủ chạy bằng lệnh{" "}
                  <code className="rounded bg-slate-100 px-1">
                    bun run dance:server
                  </code>
                  .
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
