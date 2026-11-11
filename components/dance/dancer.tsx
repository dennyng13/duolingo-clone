import type { CSSProperties } from "react";

import {
  HAIR_COLORS,
  OUTFIT_COLORS,
  PANTS_COLORS,
  SKIN_TONES,
} from "@/lib/dance/avatar";
import { hashString } from "@/lib/dance/random";
import type { Avatar, Rating } from "@/lib/dance/types";
import { cn } from "@/lib/utils";

export type MoveName =
  | "idle"
  | "step"
  | "wave"
  | "clap"
  | "disco"
  | "robot"
  | "spin"
  | "jump"
  | "star"
  | "slide"
  | "fail"
  | "cheer"
  | "cheer-loop";

export type Expression = "joy" | "wink" | "meh" | "sad";

const MOVES_BY_RATING: Record<Rating, MoveName[]> = {
  perfect: ["star", "spin", "jump", "wave"],
  great: ["disco", "robot", "slide", "wave"],
  cool: ["step", "clap", "disco"],
  bad: ["step"],
  miss: ["fail"],
};

export const EXPRESSION_BY_RATING: Record<Rating, Expression> = {
  perfect: "joy",
  great: "joy",
  cool: "wink",
  bad: "meh",
  miss: "sad",
};

/** Same move for the same player + word on every screen. */
export function pickMove(
  playerId: string,
  round: number,
  rating: Rating,
  combo: number
) {
  const pool = MOVES_BY_RATING[rating];
  if (rating === "perfect" && combo >= 5)
    return combo % 2 === 0 ? "spin" : "star";
  return pool[hashString(`${playerId}:${round}`) % pool.length];
}

const OUTLINE = "#2b2140";
const darken = (hex: string, amount = 0.18) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (shift: number) =>
    Math.max(0, Math.round(((n >> shift) & 255) * (1 - amount)));
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
};

type Colors = { skin: string; hair: string; outfit: string; pants: string };

function colorsOf(avatar: Avatar): Colors {
  return {
    skin: SKIN_TONES[avatar.skin] ?? SKIN_TONES[0],
    hair: HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0],
    outfit: OUTFIT_COLORS[avatar.outfit] ?? OUTFIT_COLORS[0],
    pants: PANTS_COLORS[avatar.pants] ?? PANTS_COLORS[0],
  };
}

// ---------------------------------------------------------------------------
// Hair & accessories

function HairBack({ style, color }: { style: number; color: string }) {
  const common = { fill: color, stroke: OUTLINE, strokeWidth: 1.6 };
  switch (style) {
    case 2:
      return (
        <path
          {...common}
          d="M16 54 C 12 22, 30 12, 50 12 C 70 12, 88 22, 84 54 L 86 80 C 80 86, 72 84, 70 80 L 30 80 C 28 84, 20 86, 14 80 Z"
        />
      );
    case 3:
      return (
        <g className="d-pony">
          <path
            {...common}
            d="M74 30 C 94 26, 102 48, 93 68 C 90 75, 83 76, 84 69 C 89 54, 84 42, 71 38 Z"
          />
        </g>
      );
    case 4:
      return (
        <g {...common}>
          <circle cx="27" cy="21" r="11" />
          <circle cx="73" cy="21" r="11" />
        </g>
      );
    case 5:
      return (
        <g {...common}>
          <ellipse cx="50" cy="40" rx="35" ry="30" />
          {[
            [17, 52],
            [15, 37],
            [22, 23],
            [35, 13],
            [50, 9],
            [65, 13],
            [78, 23],
            [85, 37],
            [83, 52],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="11" />
          ))}
        </g>
      );
    case 6:
      return (
        <path
          {...common}
          d="M18 50 C 14 18, 32 11, 50 11 C 68 11, 86 18, 82 50 L 88 108 C 78 116, 66 112, 64 104 L 36 104 C 34 112, 22 116, 12 108 Z"
        />
      );
    default:
      return null;
  }
}

function HairFront({
  style,
  color,
  outfit,
}: {
  style: number;
  color: string;
  outfit: string;
}) {
  const common = {
    fill: color,
    stroke: OUTLINE,
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
  };
  switch (style) {
    case 1:
      return (
        <path
          {...common}
          d="M20 52 C 16 30, 26 18, 36 17 L 34 7 L 44 13 L 50 3 L 56 13 L 66 7 L 64 17 C 74 18, 84 30, 80 52 C 76 40, 70 34, 62 33 L 58 38 L 52 32 L 46 38 L 40 32 L 34 36 C 28 38, 22 44, 20 52 Z"
        />
      );
    case 2:
    case 4:
      return (
        <path
          {...common}
          d="M20 50 C 18 26, 32 15, 50 15 C 68 15, 82 26, 80 50 C 76 42, 72 36, 70 30 C 62 38, 50 40, 38 34 C 32 40, 24 44, 20 50 Z"
        />
      );
    case 3:
      return (
        <>
          <path
            {...common}
            d="M20 50 C 18 24, 34 14, 52 15 C 70 16, 82 28, 80 48 C 70 40, 56 34, 44 26 C 38 34, 28 42, 20 50 Z"
          />
          <circle
            cx="75"
            cy="33"
            r="4"
            fill={outfit}
            stroke={OUTLINE}
            strokeWidth="1.4"
          />
        </>
      );
    case 5:
      return (
        <g {...common}>
          <circle cx="28" cy="33" r="7.5" />
          <circle cx="37" cy="24" r="8.5" />
          <circle cx="50" cy="21" r="9" />
          <circle cx="63" cy="24" r="8.5" />
          <circle cx="72" cy="33" r="7.5" />
        </g>
      );
    case 6:
      return (
        <path
          {...common}
          d="M20 52 C 18 24, 34 13, 52 14 C 72 15, 84 28, 80 52 C 78 40, 70 30, 58 28 C 48 36, 34 40, 20 52 Z"
        />
      );
    default:
      return (
        <path
          {...common}
          d="M20 48 C 18 24, 34 14, 50 14 C 66 14, 82 24, 80 48 C 76 36, 66 30, 50 31 C 34 30, 24 36, 20 48 Z"
        />
      );
  }
}

function Accessory({ kind, outfit }: { kind: number; outfit: string }) {
  switch (kind) {
    case 1:
      return (
        <g fill="rgba(255,255,255,0.25)" stroke={OUTLINE} strokeWidth="2">
          <circle cx="39" cy="56" r="7.5" />
          <circle cx="61" cy="56" r="7.5" />
          <path d="M46.5 56 L53.5 56" fill="none" />
        </g>
      );
    case 2:
      return (
        <g stroke={OUTLINE} strokeWidth="1.6">
          <path
            d="M18 52 C 15 12, 85 12, 82 52"
            fill="none"
            strokeWidth="4.5"
          />
          <rect x="11" y="45" width="11" height="17" rx="4" fill="#FF5A8A" />
          <rect x="78" y="45" width="11" height="17" rx="4" fill="#FF5A8A" />
        </g>
      );
    case 3:
      return (
        <g
          fill="#FF5A8A"
          stroke={OUTLINE}
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <path d="M68 20 L57 12 L57 28 Z" />
          <path d="M68 20 L79 12 L79 28 Z" />
          <circle cx="68" cy="20" r="3.5" />
        </g>
      );
    case 4:
      return (
        <g stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round">
          <path
            d="M19 40 C 20 16, 36 9, 50 9 C 64 9, 80 16, 81 40 Z"
            fill={outfit}
          />
          <path
            d="M16 40 C 34 33, 66 33, 84 40 C 87 47, 70 46, 50 45 C 30 46, 13 47, 16 40 Z"
            fill={darken(outfit, 0.25)}
          />
          <circle cx="50" cy="10" r="2.6" fill={darken(outfit, 0.25)} />
        </g>
      );
    case 5:
      return (
        <path
          d="M70 19 L72.6 24.4 L78.5 25.1 L74.2 29.1 L75.3 35 L70 32.1 L64.7 35 L65.8 29.1 L61.5 25.1 L67.4 24.4 Z"
          fill="#FFD23F"
          stroke={OUTLINE}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Face

function BaseFace() {
  return (
    <g className="f-base">
      <ellipse cx="40" cy="56" rx="4.2" ry="5.4" fill={OUTLINE} />
      <ellipse cx="60" cy="56" rx="4.2" ry="5.4" fill={OUTLINE} />
      <circle cx="41.6" cy="53.6" r="1.7" fill="#fff" />
      <circle cx="61.6" cy="53.6" r="1.7" fill="#fff" />
      <path
        d="M44 66 Q50 71.5 56 66"
        fill="none"
        stroke="#7A2E3A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
  );
}

function ReactionFace({ expression }: { expression: Expression }) {
  const stroke = {
    fill: "none",
    stroke: OUTLINE,
    strokeWidth: 2.6,
    strokeLinecap: "round" as const,
  };
  switch (expression) {
    case "joy":
      return (
        <g className="f-react">
          <path {...stroke} d="M35 57 Q40 50.5 45 57" />
          <path {...stroke} d="M55 57 Q60 50.5 65 57" />
          <path
            d="M42.5 63.5 Q50 77 57.5 63.5 Z"
            fill="#7A2E3A"
            stroke={OUTLINE}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <ellipse cx="50" cy="70" rx="3.6" ry="2.2" fill="#FF8FA3" />
        </g>
      );
    case "wink":
      return (
        <g className="f-react">
          <ellipse cx="40" cy="56" rx="4.2" ry="5.4" fill={OUTLINE} />
          <circle cx="41.6" cy="53.6" r="1.7" fill="#fff" />
          <path {...stroke} d="M55 56 Q60 52 65 56" />
          <path
            d="M43 64.5 Q50 73 57 64.5"
            fill="none"
            stroke="#7A2E3A"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
      );
    case "meh":
      return (
        <g className="f-react">
          <ellipse cx="40" cy="57" rx="3.6" ry="3.6" fill={OUTLINE} />
          <ellipse cx="60" cy="57" rx="3.6" ry="3.6" fill={OUTLINE} />
          <path
            d="M45 67.5 L55 66.5"
            fill="none"
            stroke="#7A2E3A"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      );
    case "sad":
      return (
        <g className="f-react">
          <path {...stroke} strokeWidth={2} d="M34 47.5 L44 50" />
          <path {...stroke} strokeWidth={2} d="M66 47.5 L56 50" />
          <ellipse cx="40" cy="57" rx="3.6" ry="4.6" fill={OUTLINE} />
          <ellipse cx="60" cy="57" rx="3.6" ry="4.6" fill={OUTLINE} />
          <path
            d="M44 70 Q50 64.5 56 70"
            fill="none"
            stroke="#7A2E3A"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M74 38 Q77 44 74 46 Q71 44 74 38 Z"
            fill="#7EC8FF"
            stroke={OUTLINE}
            strokeWidth="1"
          />
        </g>
      );
  }
}

function Head({
  avatar,
  colors,
  expression,
}: {
  avatar: Avatar;
  colors: Colors;
  expression: Expression;
}) {
  return (
    <>
      <circle
        cx="21"
        cy="57"
        r="6"
        fill={colors.skin}
        stroke={OUTLINE}
        strokeWidth="1.6"
      />
      <circle
        cx="79"
        cy="57"
        r="6"
        fill={colors.skin}
        stroke={OUTLINE}
        strokeWidth="1.6"
      />
      <circle
        cx="50"
        cy="51"
        r="30"
        fill={colors.skin}
        stroke={OUTLINE}
        strokeWidth="1.8"
      />
      <ellipse cx="31" cy="64" rx="5" ry="3" fill="#FF8FA3" opacity="0.55" />
      <ellipse cx="69" cy="64" rx="5" ry="3" fill="#FF8FA3" opacity="0.55" />
      <BaseFace />
      <ReactionFace expression={expression} />
      <HairFront
        style={avatar.hairStyle}
        color={colors.hair}
        outfit={colors.outfit}
      />
      <Accessory kind={avatar.accessory} outfit={colors.outfit} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Full character

type DancerProps = {
  avatar: Avatar;
  move?: MoveName;
  /** Changing this restarts the move animation (e.g. the round number). */
  moveKey?: string | number;
  expression?: Expression;
  beatSec: number;
  /** Negative animation delay that keeps the idle bounce on the beat. */
  phaseSec?: number;
  className?: string;
  style?: CSSProperties;
};

export function Dancer({
  avatar,
  move = "idle",
  moveKey,
  expression = "joy",
  beatSec,
  phaseSec = 0,
  className,
  style,
}: DancerProps) {
  const colors = colorsOf(avatar);
  const sleeve = darken(colors.outfit, 0.08);
  const shoe = "#FFFFFF";

  return (
    <div
      className={cn("dancer", className)}
      data-move={move}
      style={
        {
          "--beat": `${beatSec}s`,
          "--phase": `${phaseSec}s`,
          ...style,
        } as CSSProperties
      }
    >
      <svg key={moveKey} viewBox="0 0 100 160" aria-hidden="true">
        <ellipse
          className="d-shadow"
          cx="50"
          cy="153"
          rx="25"
          ry="4.5"
          fill="rgba(0,0,0,0.28)"
        />
        <g className="d-body">
          <g className="d-head">
            <HairBack style={avatar.hairStyle} color={colors.hair} />
          </g>

          {/* legs */}
          <g className="d-leg-l">
            <rect
              x="38"
              y="110"
              width="10.5"
              height="33"
              rx="5"
              fill={colors.pants}
              stroke={OUTLINE}
              strokeWidth="1.6"
            />
            <ellipse
              cx="41.5"
              cy="145"
              rx="8.5"
              ry="5"
              fill={shoe}
              stroke={OUTLINE}
              strokeWidth="1.6"
            />
          </g>
          <g className="d-leg-r">
            <rect
              x="51.5"
              y="110"
              width="10.5"
              height="33"
              rx="5"
              fill={colors.pants}
              stroke={OUTLINE}
              strokeWidth="1.6"
            />
            <ellipse
              cx="58.5"
              cy="145"
              rx="8.5"
              ry="5"
              fill={shoe}
              stroke={OUTLINE}
              strokeWidth="1.6"
            />
          </g>

          {/* torso */}
          <path
            d="M35 91 Q35 84 41 84 L59 84 Q65 84 65 91 L67.5 116 Q68 121 63 121 L37 121 Q32 121 32.5 116 Z"
            fill={colors.outfit}
            stroke={OUTLINE}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M33 113 L67 113 L67.5 116 Q68 121 63 121 L37 121 Q32 121 32.5 116 Z"
            fill={darken(colors.outfit, 0.2)}
          />
          <path
            d="M50 94 L52.4 99 L57.8 99.6 L53.8 103.3 L54.9 108.7 L50 106 L45.1 108.7 L46.2 103.3 L42.2 99.6 L47.6 99 Z"
            fill="#fff"
            opacity="0.92"
          />

          {/* arms */}
          <g className="d-arm-l">
            <g transform="rotate(8 29 88)">
              <rect
                x="24"
                y="85"
                width="10"
                height="16"
                rx="5"
                fill={sleeve}
                stroke={OUTLINE}
                strokeWidth="1.6"
              />
              <rect
                x="25"
                y="97"
                width="8"
                height="15"
                rx="4"
                fill={colors.skin}
                stroke={OUTLINE}
                strokeWidth="1.4"
              />
              <circle
                cx="29"
                cy="113"
                r="5.6"
                fill={colors.skin}
                stroke={OUTLINE}
                strokeWidth="1.6"
              />
            </g>
          </g>
          <g className="d-arm-r">
            <g transform="rotate(-8 71 88)">
              <rect
                x="66"
                y="85"
                width="10"
                height="16"
                rx="5"
                fill={sleeve}
                stroke={OUTLINE}
                strokeWidth="1.6"
              />
              <rect
                x="67"
                y="97"
                width="8"
                height="15"
                rx="4"
                fill={colors.skin}
                stroke={OUTLINE}
                strokeWidth="1.4"
              />
              <circle
                cx="71"
                cy="113"
                r="5.6"
                fill={colors.skin}
                stroke={OUTLINE}
                strokeWidth="1.6"
              />
            </g>
          </g>

          <g className="d-head">
            <Head avatar={avatar} colors={colors} expression={expression} />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Static head-only portrait for lists and leaderboards. */
export function DancerHead({
  avatar,
  className,
}: {
  avatar: Avatar;
  className?: string;
}) {
  const colors = colorsOf(avatar);
  return (
    <svg
      viewBox="8 2 84 84"
      className={cn("dancer-head", className)}
      aria-hidden="true"
    >
      <HairBack
        style={avatar.hairStyle === 6 ? 2 : avatar.hairStyle}
        color={colors.hair}
      />
      <Head avatar={avatar} colors={colors} expression="joy" />
    </svg>
  );
}
