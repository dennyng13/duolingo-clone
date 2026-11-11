import { randomAvatar, sanitizeAvatar } from "./avatar";
import type { Avatar } from "./types";

const KEY = "lingo-dance-prefs";

export type DancePrefs = {
  name: string;
  avatar: Avatar;
  serverUrl: string;
  muted: boolean;
  speak: boolean;
};

export function loadPrefs(): DancePrefs {
  const fallback: DancePrefs = {
    name: "",
    avatar: randomAvatar(),
    serverUrl: "",
    muted: false,
    speak: true,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(KEY) ?? "null"
    ) as Partial<DancePrefs> | null;
    if (!raw) return fallback;
    return {
      name: typeof raw.name === "string" ? raw.name.slice(0, 16) : "",
      avatar: raw.avatar ? sanitizeAvatar(raw.avatar) : fallback.avatar,
      serverUrl: typeof raw.serverUrl === "string" ? raw.serverUrl : "",
      muted: Boolean(raw.muted),
      speak: raw.speak !== false,
    };
  } catch {
    return fallback;
  }
}

export function savePrefs(patch: Partial<DancePrefs>) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadPrefs(), ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode): preferences just aren't remembered
  }
}
