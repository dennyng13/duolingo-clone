import { pick, randomInt } from "./random";
import type { Avatar } from "./types";

// Wardrobe for the dancers. Each Avatar field is an index into one of these.

export const SKIN_TONES = [
  "#F6D7C3",
  "#EBC09F",
  "#D59C74",
  "#A86F48",
  "#7A4A2C",
  "#4E2E1C",
];

export const HAIR_COLORS = [
  "#17151B",
  "#3A2418",
  "#6E4A33",
  "#C9A06A",
  "#E9DCC6",
  "#C7C9D3",
  "#F06FA8",
  "#5B7CFF",
  "#B33A2E",
];

/** Shared fashion palette for tops, bottoms and shoes. */
export const FASHION_COLORS = [
  "#141418",
  "#F3EFE6",
  "#8F98A3",
  "#C9B8FF",
  "#FF3D97",
  "#2E6BFF",
  "#C8FF3D",
  "#FF7A1A",
  "#D92D3F",
  "#7E9E7A",
  "#C29A6B",
  "#3A4B70",
  "#6A2FD9",
  "#12B5AE",
];

export const HAIR_STYLES = [
  "Two-block",
  "Fade ngắn",
  "Dài thẳng",
  "Đuôi ngựa cao",
  "Bob",
  "Búi đôi",
  "Xoăn",
  "Wolf cut",
];

export const TOPS = [
  "Hoodie oversize",
  "Crop top + jacket",
  "Tank top",
  "Bomber",
  "Áo phông graphic",
  "Áo kim sa",
  "Track jacket",
];

export const BOTTOMS = [
  "Quần cargo",
  "Skinny jeans",
  "Váy xếp ly",
  "Quần track",
  "Quần biker",
  "Quần ống rộng",
];

export const SHOES = ["Sneaker chunky", "High-top", "Boots", "Đế platform"];

export const ACCESSORIES = [
  "Không",
  "Kính râm",
  "Mũ lưỡi trai ngược",
  "Mũ len",
  "Tai nghe đeo cổ",
  "Dây chuyền",
  "Mũ bucket",
  "Khuyên tai",
];

export const AVATAR_LIMITS: Record<keyof Avatar, number> = {
  skin: SKIN_TONES.length,
  hair: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  top: TOPS.length,
  topColor: FASHION_COLORS.length,
  bottom: BOTTOMS.length,
  bottomColor: FASHION_COLORS.length,
  shoes: SHOES.length,
  shoeColor: FASHION_COLORS.length,
  accessory: ACCESSORIES.length,
};

export function randomAvatar(rng = Math.random): Avatar {
  const avatar = {} as Avatar;
  for (const key of Object.keys(AVATAR_LIMITS) as (keyof Avatar)[]) {
    avatar[key] = randomInt(AVATAR_LIMITS[key], rng);
  }
  // Keep outfits readable: top and bottom in different colours.
  if (avatar.topColor === avatar.bottomColor) {
    avatar.bottomColor = (avatar.bottomColor + 5) % FASHION_COLORS.length;
  }
  return avatar;
}

export function sanitizeAvatar(input: unknown): Avatar {
  const out = randomAvatar();
  if (!input || typeof input !== "object") return out;
  const raw = input as Record<string, unknown>;
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

const FUN_NAMES = ["Dancer", "Groover", "Rookie", "B-Kid", "Mover", "Stepper"];

export function randomFunName() {
  return `${pick(FUN_NAMES)} ${randomInt(90) + 10}`;
}

export const BOT_NAMES = [
  "Nova",
  "Kai",
  "Mira",
  "Zed",
  "Luna",
  "Rex",
  "Jade",
  "Neo",
];
