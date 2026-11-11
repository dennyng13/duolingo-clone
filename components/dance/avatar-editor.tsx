"use client";

import { useState } from "react";

import { Shuffle } from "lucide-react";

import {
  ACCESSORIES,
  BOTTOMS,
  FASHION_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SHOES,
  SKIN_TONES,
  TOPS,
  randomAvatar,
} from "@/lib/dance/avatar";
import type { Avatar } from "@/lib/dance/types";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
  style?: { key: keyof Avatar; options: string[] };
  color?: { key: keyof Avatar; colors: string[] };
};

const TABS: Tab[] = [
  {
    id: "hair",
    label: "Tóc",
    style: { key: "hair", options: HAIR_STYLES },
    color: { key: "hairColor", colors: HAIR_COLORS },
  },
  {
    id: "top",
    label: "Áo",
    style: { key: "top", options: TOPS },
    color: { key: "topColor", colors: FASHION_COLORS },
  },
  {
    id: "bottom",
    label: "Quần / váy",
    style: { key: "bottom", options: BOTTOMS },
    color: { key: "bottomColor", colors: FASHION_COLORS },
  },
  {
    id: "shoes",
    label: "Giày",
    style: { key: "shoes", options: SHOES },
    color: { key: "shoeColor", colors: FASHION_COLORS },
  },
  {
    id: "acc",
    label: "Phụ kiện",
    style: { key: "accessory", options: ACCESSORIES },
  },
  { id: "skin", label: "Màu da", color: { key: "skin", colors: SKIN_TONES } },
];

/** Wardrobe controls; the preview is rendered by the parent. */
export function AvatarEditor({
  avatar,
  onChange,
  className,
}: {
  avatar: Avatar;
  onChange: (avatar: Avatar) => void;
  className?: string;
}) {
  const [tabId, setTabId] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  const set = (key: keyof Avatar, value: number) =>
    onChange({ ...avatar, [key]: value });

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTabId(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
              t.id === tab.id
                ? "bg-white text-black"
                : "text-white/55 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--neon-cyan)] hover:bg-white/5"
        >
          <Shuffle className="h-3.5 w-3.5" /> Mix
        </button>
      </div>

      {tab.style && (
        <div>
          <p className="label mb-2">Kiểu dáng</p>
          <div className="flex flex-wrap gap-1.5">
            {tab.style.options.map((name, i) => (
              <button
                key={name}
                type="button"
                className="chip"
                data-on={avatar[tab.style!.key] === i}
                onClick={() => set(tab.style!.key, i)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab.color && (
        <div>
          <p className="label mb-2">Màu</p>
          <div className="flex flex-wrap gap-2">
            {tab.color.colors.map((color, i) => (
              <button
                key={color}
                type="button"
                aria-label={`${tab.label} màu ${i + 1}`}
                onClick={() => set(tab.color!.key, i)}
                className={cn(
                  "h-7 w-7 rounded-full ring-offset-2 ring-offset-[#0d0b14] transition-transform hover:scale-110",
                  avatar[tab.color!.key] === i
                    ? "ring-2 ring-white"
                    : "ring-1 ring-white/15"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
