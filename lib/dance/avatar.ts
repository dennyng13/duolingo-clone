import { pick, randomInt } from "./random";
import type { Avatar } from "./types";

export const SKIN_TONES = [
  "#FFE3CC",
  "#F9C9A0",
  "#E8A87C",
  "#C68642",
  "#8D5524",
];

export const HAIR_COLORS = [
  "#2B2B33",
  "#6B3E26",
  "#F4C542",
  "#FF7EB6",
  "#5AA9FF",
  "#9B6BFF",
  "#3DDC97",
  "#FF6B4A",
];

export const OUTFIT_COLORS = [
  "#FF6B6B",
  "#FFB84D",
  "#4ECDC4",
  "#5A8DEE",
  "#A06CD5",
  "#FF7EB6",
  "#43C463",
  "#3A3F6B",
];

export const PANTS_COLORS = [
  "#2D3047",
  "#3B5BA5",
  "#6B4F3A",
  "#F1F1F1",
  "#7A3E9D",
];

export const HAIR_STYLES = [
  "Ngắn",
  "Dựng ngược",
  "Tóc bob",
  "Đuôi ngựa",
  "Búi hai bên",
  "Xoăn",
  "Tóc dài",
];

export const ACCESSORIES = [
  "Không có",
  "Kính tròn",
  "Tai nghe",
  "Nơ xinh",
  "Mũ lưỡi trai",
  "Kẹp ngôi sao",
];

export const AVATAR_LIMITS: Record<keyof Avatar, number> = {
  skin: SKIN_TONES.length,
  hairStyle: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  outfit: OUTFIT_COLORS.length,
  pants: PANTS_COLORS.length,
  accessory: ACCESSORIES.length,
};

export function randomAvatar(rng = Math.random): Avatar {
  return {
    skin: randomInt(SKIN_TONES.length, rng),
    hairStyle: randomInt(HAIR_STYLES.length, rng),
    hairColor: randomInt(HAIR_COLORS.length, rng),
    outfit: randomInt(OUTFIT_COLORS.length, rng),
    pants: randomInt(PANTS_COLORS.length, rng),
    accessory: randomInt(ACCESSORIES.length, rng),
  };
}

export function sanitizeAvatar(input: unknown): Avatar {
  const fallback = randomAvatar();
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Record<string, unknown>;
  const out = { ...fallback };
  for (const key of Object.keys(AVATAR_LIMITS) as (keyof Avatar)[]) {
    const value = raw[key];
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value < AVATAR_LIMITS[key]
    ) {
      out[key] = value;
    }
  }
  return out;
}

export function sanitizeName(input: unknown) {
  const name =
    typeof input === "string" ? input.replace(/\s+/g, " ").trim() : "";
  return name.slice(0, 16) || randomFunName();
}

const FUN_NAMES = [
  "Mèo Mướp",
  "Bé Bơ",
  "Sóc Nâu",
  "Gấu Mập",
  "Thỏ Ngọc",
  "Cún Con",
  "Vịt Vàng",
  "Cá Heo",
];

export function randomFunName() {
  return `${pick(FUN_NAMES)} ${randomInt(90) + 10}`;
}

export const BOT_NAMES = [
  "DJ Panda",
  "Robo Rex",
  "Kiki",
  "Bubbles",
  "Luna",
  "Ziggy",
  "Momo",
  "Captain Beat",
];
