"use client";

import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";

import {
  ACCESSORIES,
  AVATAR_LIMITS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  PANTS_COLORS,
  SKIN_TONES,
  randomAvatar,
} from "@/lib/dance/avatar";
import type { Avatar } from "@/lib/dance/types";
import { cn } from "@/lib/utils";

import { Dancer } from "./dancer";

type Props = {
  avatar: Avatar;
  onChange: (avatar: Avatar) => void;
  className?: string;
};

function Swatches({
  colors,
  value,
  onPick,
  label,
}: {
  colors: string[];
  value: number;
  onPick: (index: number) => void;
  label: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((color, i) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${i + 1}`}
            onClick={() => onPick(i)}
            className={cn(
              "h-7 w-7 rounded-full border-2 border-white shadow ring-2 transition-transform hover:scale-110",
              value === i ? "ring-purple-500" : "ring-slate-200"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

function Cycler({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: string[];
  value: number;
  onPick: (index: number) => void;
}) {
  const step = (delta: number) =>
    onPick((value + delta + options.length) % options.length);
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => step(-1)}
          className="rounded-lg border-2 border-b-4 border-slate-200 p-1 hover:bg-slate-100"
          aria-label={`${label} trước`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-bold text-slate-700">
          {options[value]}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          className="rounded-lg border-2 border-b-4 border-slate-200 p-1 hover:bg-slate-100"
          aria-label={`${label} sau`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AvatarEditor({ avatar, onChange, className }: Props) {
  const set = (key: keyof Avatar) => (value: number) =>
    onChange({ ...avatar, [key]: Math.min(value, AVATAR_LIMITS[key] - 1) });

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row", className)}>
      <div className="relative mx-auto flex w-40 shrink-0 flex-col items-center justify-end rounded-3xl bg-gradient-to-b from-purple-500 to-fuchsia-500 px-4 pb-3 pt-6">
        <Dancer avatar={avatar} beatSec={0.6} className="w-28" />
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="mt-2 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-purple-700 shadow hover:bg-white"
        >
          <Shuffle className="h-3.5 w-3.5" /> Ngẫu nhiên
        </button>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        <Cycler
          label="Kiểu tóc"
          options={HAIR_STYLES}
          value={avatar.hairStyle}
          onPick={set("hairStyle")}
        />
        <Cycler
          label="Phụ kiện"
          options={ACCESSORIES}
          value={avatar.accessory}
          onPick={set("accessory")}
        />
        <Swatches
          label="Màu tóc"
          colors={HAIR_COLORS}
          value={avatar.hairColor}
          onPick={set("hairColor")}
        />
        <Swatches
          label="Màu da"
          colors={SKIN_TONES}
          value={avatar.skin}
          onPick={set("skin")}
        />
        <Swatches
          label="Áo"
          colors={OUTFIT_COLORS}
          value={avatar.outfit}
          onPick={set("outfit")}
        />
        <Swatches
          label="Quần"
          colors={PANTS_COLORS}
          value={avatar.pants}
          onPick={set("pants")}
        />
      </div>
    </div>
  );
}
