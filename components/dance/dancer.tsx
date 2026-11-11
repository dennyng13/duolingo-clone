"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";

import { FASHION_COLORS, HAIR_COLORS, SKIN_TONES } from "@/lib/dance/avatar";
import {
  BASE,
  RIG,
  poseAt,
  rootY,
  type MoveName,
  type MoveState,
  type Pose,
} from "@/lib/dance/choreo";
import type { Avatar, Rating } from "@/lib/dance/types";
import { cn } from "@/lib/utils";

export type Expression = "joy" | "wink" | "meh" | "sad";

export const EXPRESSION_BY_RATING: Record<Rating, Expression> = {
  perfect: "joy",
  great: "joy",
  cool: "wink",
  bad: "meh",
  miss: "sad",
};

export type DancerAction = {
  move: MoveName;
  /** A new key (e.g. the round number) starts the move again. */
  key: string | number;
  loop?: boolean;
};

// ---------------------------------------------------------------------------
// Colour helpers

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum =
    0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum > 150;
}

/** Tapered capsule hanging down from the joint (0,0) to (0,len). */
function limb(len: number, w1: number, w2: number) {
  const a = w1 / 2;
  const b = w2 / 2;
  return `M ${-a} 0 L ${-b} ${len} A ${b} ${b} 0 0 0 ${b} ${len} L ${a} 0 A ${a} ${a} 0 0 0 ${-a} 0 Z`;
}

type Palette = {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  top: string;
  topShade: string;
  topLine: string;
  inner: string;
  bottom: string;
  bottomShade: string;
  bottomLine: string;
  shoe: string;
  shoeShade: string;
  accent: string;
  lips: string;
  gold: string;
};

function paletteOf(avatar: Avatar): Palette {
  const skin = SKIN_TONES[avatar.skin] ?? SKIN_TONES[0];
  const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0];
  const top = FASHION_COLORS[avatar.topColor] ?? FASHION_COLORS[0];
  const bottom = FASHION_COLORS[avatar.bottomColor] ?? FASHION_COLORS[1];
  const shoe = FASHION_COLORS[avatar.shoeColor] ?? FASHION_COLORS[1];
  return {
    skin,
    skinShade: shade(skin, -0.16),
    hair,
    hairShade: shade(hair, isLight(hair) ? -0.25 : 0.18),
    top,
    topShade: shade(top, -0.2),
    topLine: shade(top, isLight(top) ? -0.35 : -0.45),
    inner: isLight(top) ? "#16161b" : "#f3efe6",
    bottom,
    bottomShade: shade(bottom, -0.22),
    bottomLine: shade(bottom, isLight(bottom) ? -0.35 : -0.45),
    shoe,
    shoeShade: shade(shoe, -0.25),
    accent: isLight(top) ? "#16161b" : "#ffffff",
    lips: shade(skin, -0.32),
    gold: "#E9C46A",
  };
}

// ---------------------------------------------------------------------------
// Garment pieces (all coordinates are local to their joint)

const LONG_SLEEVES = new Set([0, 1, 3, 6]);
const BARE_ARMS = new Set([2, 5]);

function Leg({
  side,
  avatar,
  c,
}: {
  side: -1 | 1;
  avatar: Avatar;
  c: Palette;
}) {
  const s = side < 0 ? "L" : "R";
  const outer = side; // outer edge direction
  const b = avatar.bottom;
  const pantsThigh: Record<number, [number, number]> = {
    0: [28, 25],
    1: [23, 17],
    3: [25, 21],
    5: [29, 29],
  };
  const pantsShin: Record<number, [number, number]> = {
    0: [25, 18],
    1: [17, 12.5],
    3: [21, 15],
    5: [29, 34],
  };
  const skinThigh = limb(RIG.thigh, 21, 14.5);
  const skinShin = limb(RIG.shin, 14.5, 9.5);
  const pantsStroke = { fill: c.bottom };
  const skinStroke = { fill: c.skin };
  const thigh = pantsThigh[b];
  const shin = pantsShin[b];

  return (
    <g data-j={`hip${s}`} transform={`translate(${side * RIG.hipHalf} 0)`}>
      <g data-j={`knee${s}`} transform={`translate(0 ${RIG.thigh})`}>
        <g data-j={`shin${s}`}>
          {shin ? (
            <>
              <path d={limb(RIG.shin, shin[0], shin[1])} {...pantsStroke} />
              {b === 3 && (
                <path
                  d={`M ${outer * (shin[0] / 2 - 2.5)} 0 L ${outer * (shin[1] / 2 - 2.5)} ${RIG.shin - 6}`}
                  stroke={c.accent}
                  strokeWidth={2.2}
                />
              )}
              {(b === 0 || b === 3) && (
                <rect
                  x={-shin[1] / 2}
                  y={RIG.shin - 7}
                  width={shin[1]}
                  height={7}
                  rx={3}
                  fill={c.bottomShade}
                />
              )}
            </>
          ) : (
            <path d={skinShin} {...skinStroke} />
          )}
          {avatar.shoes === 2 && (
            <path
              d={`M -9.5 38 L -9 ${RIG.shin + 2} L 9 ${RIG.shin + 2} L 9.5 38 Q 0 35 -9.5 38 Z`}
              fill={c.shoe}
              stroke={c.shoeShade}
              strokeWidth={0.8}
            />
          )}
        </g>
        <g data-j={`ankle${s}`} transform={`translate(0 ${RIG.shin})`}>
          <Shoe side={side} kind={avatar.shoes} c={c} />
        </g>
      </g>
      {/* thigh after the shin so the knee joint overlaps cleanly */}
      <g data-j={`thigh${s}`}>
        {thigh ? (
          <>
            <path d={limb(RIG.thigh, thigh[0], thigh[1])} {...pantsStroke} />
            {b === 0 && (
              <rect
                x={outer < 0 ? -thigh[0] / 2 - 1 : thigh[0] / 2 - 9}
                y={38}
                width={10}
                height={20}
                rx={2}
                fill={c.bottomShade}
                stroke={c.bottomLine}
                strokeWidth={0.6}
              />
            )}
            {b === 3 && (
              <path
                d={`M ${outer * (thigh[0] / 2 - 2.5)} 2 L ${outer * (thigh[1] / 2 - 2.5)} ${RIG.thigh}`}
                stroke={c.accent}
                strokeWidth={2.2}
              />
            )}
            {b === 1 && (
              <path
                d={`M ${outer * 4} 4 L ${outer * 3} ${RIG.thigh}`}
                stroke={c.bottomShade}
                strokeWidth={0.8}
              />
            )}
          </>
        ) : (
          <>
            <path d={skinThigh} {...skinStroke} />
            {b === 4 && <path d={limb(44, 23, 20)} {...pantsStroke} />}
          </>
        )}
      </g>
    </g>
  );
}

function Shoe({ side, kind, c }: { side: -1 | 1; kind: number; c: Palette }) {
  const sole = kind === 3 ? 7 : kind === 0 ? 4.5 : 3;
  const top = kind === 1 ? -14 : kind === 2 ? -6 : -3;
  return (
    <g transform={`scale(${side} 1)`}>
      <path
        d={`M -7 ${top} C -9.5 ${top + 4}, -10.5 ${RIG.foot - sole - 3}, -10 ${RIG.foot - sole} L 13 ${RIG.foot - sole} C 17 ${RIG.foot - sole}, 17 ${RIG.foot - sole - 6}, 11 ${RIG.foot - sole - 7.5} C 7 ${RIG.foot - sole - 9}, 6 ${top + 2}, 6 ${top} Z`}
        fill={c.shoe}
        stroke={c.shoeShade}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {kind !== 2 && (
        <path
          d={`M -3 ${RIG.foot - sole - 5} Q 4 ${RIG.foot - sole - 9} 10 ${RIG.foot - sole - 5}`}
          fill="none"
          stroke={c.shoeShade}
          strokeWidth={0.8}
        />
      )}
      <rect
        x={-10.5}
        y={RIG.foot - sole}
        width={28}
        height={sole}
        rx={sole / 2}
        fill={kind === 2 ? "#1a1a1f" : isLight(c.shoe) ? "#e9e6df" : "#f7f5f0"}
        stroke={c.shoeShade}
        strokeWidth={0.6}
      />
    </g>
  );
}

function HipBlock({ avatar, c }: { avatar: Avatar; c: Palette }) {
  const stroke = {
    stroke: c.bottomLine,
    strokeWidth: 0.8,
    strokeLinejoin: "round" as const,
  };
  if (avatar.bottom === 2) {
    return (
      <g>
        <path
          d="M -18 -12 L 18 -12 L 31 34 Q 0 41 -31 34 Z"
          fill={c.bottom}
          {...stroke}
        />
        {[-18, -9, 0, 9, 18].map((x) => (
          <path
            key={x}
            d={`M ${x * 0.55} -4 L ${x} 36`}
            stroke={c.bottomShade}
            strokeWidth={1}
          />
        ))}
      </g>
    );
  }
  const wide = avatar.bottom === 5 || avatar.bottom === 0 ? 2.5 : 0;
  return (
    <g>
      <path
        d={`M ${-19 - wide} -12 L ${19 + wide} -12 L ${21 + wide} 10 Q 11 17 0 12 Q -11 17 ${-21 - wide} 10 Z`}
        fill={c.bottom}
        {...stroke}
      />
      <path d="M 0 -4 L 0 11" stroke={c.bottomShade} strokeWidth={0.8} />
    </g>
  );
}

function Waistband({ avatar, c }: { avatar: Avatar; c: Palette }) {
  if (avatar.bottom === 4)
    return (
      <rect
        x={-18.5}
        y={-3}
        width={37}
        height={4}
        rx={1.5}
        fill={c.bottomShade}
      />
    );
  return (
    <g>
      <rect
        x={-19.5}
        y={-3}
        width={39}
        height={5}
        rx={1.5}
        fill={avatar.bottom === 0 ? "#1b1b20" : c.bottomShade}
      />
      {avatar.bottom === 0 && (
        <rect x={-3} y={-3.5} width={6} height={6} rx={1} fill={c.gold} />
      )}
    </g>
  );
}

function Torso({ avatar, c, ids }: { avatar: Avatar; c: Palette; ids: Ids }) {
  const line = {
    stroke: c.topLine,
    strokeWidth: 0.8,
    strokeLinejoin: "round" as const,
  };
  const fill = `url(#${ids.top})`;
  switch (avatar.top) {
    case 0: // oversized hoodie
      return (
        <g>
          <path
            d="M -10 -52 L -27 -46 Q -31 -42 -29 -34 L -27 30 L -25 44 Q 0 48 25 44 L 27 30 L 29 -34 Q 31 -42 27 -46 L 10 -52 Q 0 -46 -10 -52 Z"
            fill={fill}
            {...line}
          />
          <path
            d="M -15 18 L 15 18 L 18 34 L -18 34 Z"
            fill={c.topShade}
            opacity={0.8}
          />
          <rect
            x={-25.5}
            y={39}
            width={51}
            height={5}
            rx={2}
            fill={c.topShade}
          />
          <path
            d="M -5 -47 L -6 -30 M 5 -47 L 6 -30"
            stroke={c.accent}
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.8}
          />
        </g>
      );
    case 1: // crop top + open jacket
      return (
        <g>
          <path
            d="M -9 -51 Q 0 -44 9 -51 L 19 -47 L 20 -30 Q 17 -14 18 -2 Q 0 1 -18 -2 Q -17 -14 -20 -30 L -19 -47 Z"
            fill={c.inner}
            stroke={shade(c.inner, -0.3)}
            strokeWidth={0.8}
          />
          <path
            d="M -10 -52 L -27 -46 Q -31 -42 -29 -34 L -27 30 L -12 31 L -9 -18 L -12 -42 Z"
            fill={fill}
            {...line}
          />
          <path
            d="M 10 -52 L 27 -46 Q 31 -42 29 -34 L 27 30 L 12 31 L 9 -18 L 12 -42 Z"
            fill={fill}
            {...line}
          />
          <path
            d="M -12 -42 L -6 -30 L -9 -18 M 12 -42 L 6 -30 L 9 -18"
            fill="none"
            stroke={c.topShade}
            strokeWidth={1.4}
          />
        </g>
      );
    case 2: // tank top
      return (
        <g>
          <path
            d="M -15 -50 L -10 -50 Q 0 -38 10 -50 L 15 -50 L 17 -32 Q 18 -6 19 22 L 20 33 Q 0 36 -20 33 L -19 22 Q -18 -6 -17 -32 Z"
            fill={fill}
            {...line}
          />
          <path
            d="M -13 -50 L -16 -34 M 13 -50 L 16 -34"
            stroke={c.topShade}
            strokeWidth={1}
          />
        </g>
      );
    case 3: // bomber
      return (
        <g>
          <path
            d="M -10 -52 L -27 -46 Q -32 -42 -29.5 -34 L -27.5 24 Q -30 30 -26 35 Q 0 39 26 35 Q 30 30 27.5 24 L 29.5 -34 Q 32 -42 27 -46 L 10 -52 Q 0 -45 -10 -52 Z"
            fill={fill}
            {...line}
          />
          <rect x={-27} y={27} width={54} height={8} rx={3} fill={c.topShade} />
          {[-20, -12, -4, 4, 12, 20].map((x) => (
            <path
              key={x}
              d={`M ${x} 28 L ${x} 34`}
              stroke={c.topLine}
              strokeWidth={0.6}
              opacity={0.6}
            />
          ))}
          <path
            d="M -10 -52 Q 0 -45 10 -52 L 9 -48 Q 0 -42 -9 -48 Z"
            fill={c.topShade}
          />
          <path d="M 0 -45 L 0 27" stroke={c.topLine} strokeWidth={1} />
          <rect
            x={-20}
            y={-36}
            width={8}
            height={6}
            rx={1}
            fill={c.accent}
            opacity={0.85}
          />
        </g>
      );
    case 4: // graphic tee
      return (
        <g>
          <path
            d="M -9 -51 Q 0 -45 9 -51 L 24 -47 Q 28 -45 27 -38 L 23 -26 Q 19 -4 20 22 L 21 32 Q 0 35 -21 32 L -20 22 Q -19 -4 -23 -26 L -27 -38 Q -28 -45 -24 -47 Z"
            fill={fill}
            {...line}
          />
          <path
            d="M -9 -51 Q 0 -45 9 -51"
            fill="none"
            stroke={c.topShade}
            strokeWidth={2}
          />
          <g
            fill="none"
            stroke={c.accent}
            strokeWidth={2.4}
            strokeLinejoin="round"
            opacity={0.9}
          >
            <path d="M -9 -24 L 0 -32 L 9 -24" />
            <path d="M -9 -16 L 0 -24 L 9 -16" />
            <path d="M -9 -8 L 0 -16 L 9 -8" />
          </g>
        </g>
      );
    case 5: // sequin top
      return (
        <g>
          <path
            d="M -13 -50 Q 0 -40 13 -50 L 17 -32 Q 17 -6 18 20 L 19 30 Q 0 33 -19 30 L -18 20 Q -17 -6 -17 -32 Z"
            fill={`url(#${ids.sequin})`}
            {...line}
          />
          <path
            className="sequin-sheen"
            d="M -13 -50 Q 0 -40 13 -50 L 17 -32 Q 17 -6 18 20 L 19 30 Q 0 33 -19 30 L -18 20 Q -17 -6 -17 -32 Z"
            fill={`url(#${ids.sheen})`}
          />
        </g>
      );
    default: // track jacket
      return (
        <g>
          <path
            d="M -10 -53 L -26 -46 Q -30 -42 -28 -34 L -24 -24 Q -19 -4 -20 22 L -21 33 Q 0 36 21 33 L 20 22 Q 19 -4 24 -24 L 28 -34 Q 30 -42 26 -46 L 10 -53 Q 0 -47 -10 -53 Z"
            fill={fill}
            {...line}
          />
          <path
            d="M -10 -53 L -8 -46 Q 0 -43 8 -46 L 10 -53"
            fill={c.topShade}
          />
          <path d="M 0 -45 L 0 33" stroke={c.accent} strokeWidth={1.2} />
          <path
            d="M -20 -20 L -4 -20 L -4 -10 L -20 -10 Z"
            fill={c.accent}
            opacity={0.18}
          />
        </g>
      );
  }
}

function TorsoBack({ avatar, c }: { avatar: Avatar; c: Palette }) {
  if (avatar.top === 0) {
    return (
      <path
        d="M -17 -48 C -21 -64, 21 -64, 17 -48 Q 0 -40 -17 -48 Z"
        fill={c.topShade}
        stroke={c.topLine}
        strokeWidth={0.8}
      />
    );
  }
  if (BARE_ARMS.has(avatar.top)) {
    return (
      <path
        d="M -10 -52 L -24 -47 Q -27 -44 -25 -38 L -21 -28 L 21 -28 L 25 -38 Q 27 -44 24 -47 L 10 -52 Q 0 -46 -10 -52 Z"
        fill={c.skin}
        stroke={c.skinShade}
        strokeWidth={0.6}
      />
    );
  }
  return null;
}

function Arm({
  side,
  avatar,
  c,
}: {
  side: -1 | 1;
  avatar: Avatar;
  c: Palette;
}) {
  const s = side < 0 ? "L" : "R";
  const longSleeve = LONG_SLEEVES.has(avatar.top);
  const bare = BARE_ARMS.has(avatar.top);
  const big = avatar.top === 0;
  const sleeve = { fill: c.top };
  const skin = { fill: c.skin };
  const cuff = avatar.top === 0 || avatar.top === 3 || avatar.top === 6;
  const outer = side;

  return (
    <g
      data-j={`arm${s}`}
      transform={`translate(${side * RIG.shoulderHalf} ${RIG.shoulderY})`}
    >
      {longSleeve ? (
        <path
          d={limb(RIG.upperArm, big ? 17 : 15, big ? 15 : 12.5)}
          {...sleeve}
        />
      ) : (
        <>
          <path d={limb(RIG.upperArm, 11.5, 9)} {...skin} />
          {!bare && <path d={limb(24, 17, 15.5)} {...sleeve} />}
        </>
      )}
      {avatar.top === 6 && (
        <path
          d={`M ${outer * 5} 2 L ${outer * 4} ${RIG.upperArm}`}
          stroke={c.accent}
          strokeWidth={1.8}
        />
      )}
      <g data-j={`elbow${s}`} transform={`translate(0 ${RIG.upperArm})`}>
        {longSleeve ? (
          <>
            <path
              d={limb(RIG.forearm, big ? 15 : 12.5, big ? 13.5 : 11)}
              {...sleeve}
            />
            {cuff && (
              <rect
                x={big ? -7 : -5.8}
                y={RIG.forearm - 6}
                width={big ? 14 : 11.6}
                height={6}
                rx={2.5}
                fill={c.topShade}
              />
            )}
            {avatar.top === 6 && (
              <path
                d={`M ${outer * 4} 0 L ${outer * 3.5} ${RIG.forearm - 7}`}
                stroke={c.accent}
                strokeWidth={1.8}
              />
            )}
          </>
        ) : (
          <path d={limb(RIG.forearm, 9, 7.5)} {...skin} />
        )}
        <g data-j={`wrist${s}`} transform={`translate(0 ${RIG.forearm})`}>
          <path
            d="M -4.6 -1 C -6 4, -6 10, -3 13.5 C -1 15.5, 2 15.5, 4 13.5 C 6 10, 6 4, 4.6 -1 Z"
            {...skin}
          />
          <path
            d={`M ${-side * 4.5} 2 Q ${-side * 7} 6 ${-side * 5} 9`}
            fill="none"
            stroke={c.skinShade}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Head

function HairBack({ style, c }: { style: number; c: Palette }) {
  const fill = { fill: c.hair, stroke: c.hairShade, strokeWidth: 0.7 };
  switch (style) {
    case 2:
      return (
        <path
          d="M -16 -30 C -17 -50, 17 -50, 16 -30 L 19 44 C 10 50, -10 50, -19 44 Z"
          {...fill}
        />
      );
    case 3:
      return (
        <g data-j="pony">
          <path
            d="M 0 -46 C 8 -52, 16 -46, 15 -30 C 14 -12, 18 6, 12 22 C 9 10, 6 -8, 4 -24 C 3 -34, 1 -40, 0 -46 Z"
            {...fill}
          />
        </g>
      );
    case 4:
      return (
        <path
          d="M -17 -28 C -18 -50, 18 -50, 17 -28 L 17 -6 C 12 -2, -12 -2, -17 -6 Z"
          {...fill}
        />
      );
    case 5:
      return (
        <g {...fill}>
          <circle cx={-11} cy={-44} r={7.5} />
          <circle cx={11} cy={-44} r={7.5} />
        </g>
      );
    case 6:
      return (
        <g {...fill}>
          <ellipse cx={0} cy={-30} rx={19} ry={19} />
          {[150, 180, 210, 240, 270, 300, 330, 360, 390].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return (
              <circle
                key={deg}
                cx={Math.cos(r) * 18}
                cy={-30 + Math.sin(r) * 18}
                r={6.5}
              />
            );
          })}
        </g>
      );
    case 7:
      return (
        <path
          d="M -16 -28 C -17 -50, 17 -50, 16 -28 L 17 0 L 12 -4 L 10 6 L 4 0 L -4 0 L -10 6 L -12 -4 L -17 0 Z"
          {...fill}
        />
      );
    default:
      return (
        <path
          d="M -13.6 -24 C -15 -46, 15 -46, 13.6 -24 L 12.6 -19 L -12.6 -19 Z"
          fill={c.hairShade}
        />
      );
  }
}

function HairFront({ style, c }: { style: number; c: Palette }) {
  const fill = {
    fill: c.hair,
    stroke: c.hairShade,
    strokeWidth: 0.7,
    strokeLinejoin: "round" as const,
  };
  switch (style) {
    case 0:
      return (
        <>
          <path
            d="M -13.7 -23 L -13.7 -31 L -12 -31 L -12.2 -21 Z M 13.7 -23 L 13.7 -31 L 12 -31 L 12.2 -21 Z"
            fill={c.hairShade}
          />
          <path
            d="M -14 -27 C -16 -46, -4 -52, 4 -50 C 13 -49, 17 -40, 14 -28 C 13 -33, 10 -36, 6 -35 C 4 -31, -2 -29, -7 -32 C -10 -31, -12 -29, -14 -27 Z"
            {...fill}
          />
        </>
      );
    case 1:
      return (
        <path
          d="M -13.8 -27 C -14.5 -45, 14.5 -45, 13.8 -27 C 11 -35, 5 -37.5, 0 -37.5 C -5 -37.5, -11 -35, -13.8 -27 Z"
          {...fill}
        />
      );
    case 2:
      return (
        <path
          d="M 0 -44 C -9 -44, -15 -38, -15.5 -26 L -16 -4 C -13.5 -12, -12.5 -24, -7 -34 C -4.5 -38, -2 -40, 0 -40 C 2 -40, 4.5 -38, 7 -34 C 12.5 -24, 13.5 -12, 16 -4 L 15.5 -26 C 15 -38, 9 -44, 0 -44 Z"
          {...fill}
        />
      );
    case 3:
    case 5:
      return (
        <>
          <path
            d="M -13.8 -26 C -15 -46, 15 -46, 13.8 -26 C 12 -36, 6 -40, 0 -40 C -6 -40, -12 -36, -13.8 -26 Z"
            {...fill}
          />
          {style === 3 && <circle cx={1} cy={-45} r={2.6} fill={c.top} />}
          {style === 5 && (
            <path d="M 0 -44 L 0 -39" stroke={c.hairShade} strokeWidth={0.8} />
          )}
        </>
      );
    case 4:
      return (
        <path
          d="M -14.5 -26 C -15.5 -46, 15.5 -46, 14.5 -26 L 14 -30 C 9 -33, 4 -32, 0 -33 C -4 -32, -9 -33, -14 -30 Z"
          {...fill}
        />
      );
    case 6:
      return (
        <g {...fill}>
          <circle cx={-9} cy={-37} r={5} />
          <circle cx={-3} cy={-40} r={5.5} />
          <circle cx={4} cy={-40} r={5.5} />
          <circle cx={10} cy={-37} r={5} />
        </g>
      );
    default:
      return (
        <>
          <path
            d="M -14.5 -24 C -16 -46, 16 -46, 14.5 -24 L 13 -30 L 10 -26 L 8 -33 L 4 -29 L 1 -34 L -3 -29 L -6 -33 L -9 -27 L -12 -31 Z"
            {...fill}
          />
          <path
            d="M -14.5 -25 L -15.8 -9 L -12.3 -18 Z M 14.5 -25 L 15.8 -9 L 12.3 -18 Z"
            {...fill}
          />
        </>
      );
  }
}

function HeadAccessory({ kind, c }: { kind: number; c: Palette }) {
  switch (kind) {
    case 1:
      return (
        <g>
          <path
            d="M -11 -24 L -1.6 -24 L -2.2 -18.6 Q -6.5 -17.4 -10.2 -18.8 Z M 11 -24 L 1.6 -24 L 2.2 -18.6 Q 6.5 -17.4 10.2 -18.8 Z"
            fill="#0d0d12"
          />
          <path d="M -1.6 -23 L 1.6 -23" stroke="#0d0d12" strokeWidth={1.2} />
          <path
            d="M -9.5 -22.6 L -6 -22.6 M 3 -22.6 L 6.5 -22.6"
            stroke="#ffffff"
            strokeWidth={0.8}
            opacity={0.5}
          />
        </g>
      );
    case 2:
      return (
        <g>
          <path
            d="M -14.8 -29 C -15.8 -49, 15.8 -49, 14.8 -29 Q 0 -32.5 -14.8 -29 Z"
            fill={c.shoe}
            stroke={c.shoeShade}
            strokeWidth={0.8}
          />
          <path
            d="M -6 -31 Q 0 -34.5 6 -31"
            fill="none"
            stroke={c.shoeShade}
            strokeWidth={1.6}
          />
          <circle cx={0} cy={-46.5} r={1.6} fill={c.shoeShade} />
        </g>
      );
    case 3:
      return (
        <g>
          <path
            d="M -15.2 -28 C -16.5 -53, 16.5 -53, 15.2 -28 Z"
            fill={c.shoe}
            stroke={c.shoeShade}
            strokeWidth={0.8}
          />
          <rect
            x={-16}
            y={-32.5}
            width={32}
            height={7}
            rx={2.5}
            fill={c.shoeShade}
          />
          {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
            <path
              key={x}
              d={`M ${x} -32 L ${x} -26`}
              stroke={shade(c.shoe, -0.4)}
              strokeWidth={0.6}
            />
          ))}
        </g>
      );
    case 6:
      return (
        <g stroke={c.shoeShade} strokeWidth={0.8}>
          <path d="M -12.5 -31 C -13 -49, 13 -49, 12.5 -31 Z" fill={c.shoe} />
          <path
            d="M -20 -29.5 Q 0 -36 20 -29.5 L 22 -24.5 Q 0 -30.5 -22 -24.5 Z"
            fill={shade(c.shoe, -0.1)}
          />
        </g>
      );
    case 7:
      return (
        <g fill="none" stroke={c.gold} strokeWidth={1.1}>
          <circle cx={-13.6} cy={-15.5} r={2.3} />
          <circle cx={13.6} cy={-15.5} r={2.3} />
        </g>
      );
    default:
      return null;
  }
}

function NeckAccessory({ kind, c }: { kind: number; c: Palette }) {
  if (kind === 4) {
    return (
      <g>
        <path
          d="M -12 -50 Q 0 -41 12 -50"
          fill="none"
          stroke="#18181d"
          strokeWidth={2.4}
        />
        <rect x={-17} y={-56} width={8} height={11} rx={3.5} fill="#18181d" />
        <rect x={9} y={-56} width={8} height={11} rx={3.5} fill="#18181d" />
        <rect x={-15.5} y={-54} width={5} height={7} rx={2} fill={c.shoe} />
        <rect x={10.5} y={-54} width={5} height={7} rx={2} fill={c.shoe} />
      </g>
    );
  }
  if (kind === 5) {
    return (
      <g>
        <path
          d="M -8.5 -50 Q 0 -34 8.5 -50"
          fill="none"
          stroke={c.gold}
          strokeWidth={1.5}
          strokeDasharray="1.6 0.8"
        />
        <circle cx={0} cy={-37.5} r={2.4} fill={c.gold} />
      </g>
    );
  }
  return null;
}

const EYE_X = 5.6;

function Eye({ x }: { x: number }) {
  return (
    <g>
      <path
        d={`M ${x - 3.4} -21 Q ${x} -24.2 ${x + 3.4} -21 Q ${x} -19.1 ${x - 3.4} -21 Z`}
        fill="#1b1720"
      />
      <circle cx={x + 0.9} cy={-21.7} r={0.6} fill="#ffffff" />
    </g>
  );
}

function Face({ c, expression }: { c: Palette; expression: Expression }) {
  const brow = {
    fill: "none",
    stroke: c.hairShade,
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
  };
  const lips = {
    fill: "none",
    stroke: c.lips,
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
  };
  const arc = {
    fill: "none",
    stroke: "#1b1720",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
  };
  const nose = (
    <path
      d="M 0.2 -19 L -1.1 -13.6 L 0.9 -13.2"
      fill="none"
      stroke={c.skinShade}
      strokeWidth={0.9}
      strokeLinecap="round"
    />
  );
  const base = (
    <g data-j="faceBase">
      <path
        d={`M ${-EYE_X - 3.6} -26.2 Q ${-EYE_X} -27.8 ${-EYE_X + 3.6} -26.6`}
        {...brow}
      />
      <path
        d={`M ${EYE_X + 3.6} -26.2 Q ${EYE_X} -27.8 ${EYE_X - 3.6} -26.6`}
        {...brow}
      />
      <Eye x={-EYE_X} />
      <Eye x={EYE_X} />
      <path d="M -3.2 -8.9 Q 0 -7 3.2 -8.9" {...lips} />
    </g>
  );
  let reaction;
  switch (expression) {
    case "joy":
      reaction = (
        <>
          <path
            d={`M ${-EYE_X - 3.6} -27.4 Q ${-EYE_X} -29.2 ${-EYE_X + 3.6} -27.8`}
            {...brow}
          />
          <path
            d={`M ${EYE_X + 3.6} -27.4 Q ${EYE_X} -29.2 ${EYE_X - 3.6} -27.8`}
            {...brow}
          />
          <path
            d={`M ${-EYE_X - 3.2} -20.4 Q ${-EYE_X} -23.6 ${-EYE_X + 3.2} -20.4`}
            {...arc}
          />
          <path
            d={`M ${EYE_X - 3.2} -20.4 Q ${EYE_X} -23.6 ${EYE_X + 3.2} -20.4`}
            {...arc}
          />
          <path d="M -4.2 -9.8 Q 0 -3.6 4.2 -9.8 Z" fill="#3a1c22" />
          <path
            d="M -3.4 -9.6 L 3.4 -9.6 L 3 -8.4 L -3 -8.4 Z"
            fill="#ffffff"
          />
        </>
      );
      break;
    case "wink":
      reaction = (
        <>
          <path
            d={`M ${-EYE_X - 3.6} -26.2 Q ${-EYE_X} -27.8 ${-EYE_X + 3.6} -26.6`}
            {...brow}
          />
          <path
            d={`M ${EYE_X + 3.6} -27.6 Q ${EYE_X} -29.4 ${EYE_X - 3.6} -27.6`}
            {...brow}
          />
          <Eye x={-EYE_X} />
          <path
            d={`M ${EYE_X - 3.2} -21 Q ${EYE_X} -19.4 ${EYE_X + 3.2} -21`}
            {...arc}
          />
          <path d="M -3 -8.6 Q 1 -7.2 4 -10.2" {...lips} />
        </>
      );
      break;
    case "meh":
      reaction = (
        <>
          <path d={`M ${-EYE_X - 3.6} -26 L ${-EYE_X + 3.6} -26`} {...brow} />
          <path d={`M ${EYE_X - 3.6} -26 L ${EYE_X + 3.6} -26`} {...brow} />
          <Eye x={-EYE_X} />
          <Eye x={EYE_X} />
          <path
            d={`M ${-EYE_X - 3.6} -22.2 L ${-EYE_X + 3.6} -22.2 M ${EYE_X - 3.6} -22.2 L ${EYE_X + 3.6} -22.2`}
            stroke={c.skinShade}
            strokeWidth={1.6}
          />
          <path d="M -3 -8.4 L 3 -8.7" {...lips} />
        </>
      );
      break;
    case "sad":
      reaction = (
        <>
          <path
            d={`M ${-EYE_X - 3.6} -25.2 L ${-EYE_X + 3.4} -27.6`}
            {...brow}
          />
          <path d={`M ${EYE_X + 3.6} -25.2 L ${EYE_X - 3.4} -27.6`} {...brow} />
          <Eye x={-EYE_X} />
          <Eye x={EYE_X} />
          <path d="M -3.2 -7.2 Q 0 -9.4 3.2 -7.2" {...lips} />
        </>
      );
      break;
  }
  return (
    <>
      {nose}
      {base}
      <g data-j="faceReact" opacity={0}>
        {reaction}
      </g>
    </>
  );
}

function Head({
  avatar,
  c,
  expression,
}: {
  avatar: Avatar;
  c: Palette;
  expression: Expression;
}) {
  return (
    <>
      <ellipse
        cx={-13.2}
        cy={-21}
        rx={2.6}
        ry={4}
        fill={c.skin}
        stroke={c.skinShade}
        strokeWidth={0.6}
      />
      <ellipse
        cx={13.2}
        cy={-21}
        rx={2.6}
        ry={4}
        fill={c.skin}
        stroke={c.skinShade}
        strokeWidth={0.6}
      />
      <ellipse cx={0} cy={-27} rx={13.5} ry={17} fill={c.skin} />
      <path
        d="M -13 -26 C -13 -42, 13 -42, 13 -26 L 12.2 -16 C 11 -8, 5 -2.5, 0 -2.5 C -5 -2.5, -11 -8, -12.2 -16 Z"
        fill={c.skin}
        stroke={c.skinShade}
        strokeWidth={0.7}
      />
      <Face c={c} expression={expression} />
      <HairFront style={avatar.hair} c={c} />
      <HeadAccessory kind={avatar.accessory} c={c} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Animation: one requestAnimationFrame loop drives every dancer on the page.

type Entry = { tick: (nowSec: number) => void };
const entries = new Set<Entry>();
let frame = 0;

function loop() {
  const now = performance.now() / 1000;
  entries.forEach((entry) => entry.tick(now));
  frame = entries.size > 0 ? requestAnimationFrame(loop) : 0;
}

function register(entry: Entry) {
  entries.add(entry);
  if (!frame) frame = requestAnimationFrame(loop);
  return () => {
    entries.delete(entry);
  };
}

const f = (n: number) => Math.round(n * 100) / 100;

function transformsFor(p: Pose, pony: number): Record<string, string> {
  // A turning body never gets thinner than its side profile.
  const sx = p.flip >= 0 ? Math.max(p.flip, 0.24) : Math.min(p.flip, -0.24);
  return {
    root: `translate(${f(RIG.rootX + p.x)} ${f(rootY(p))}) scale(${f(sx)} 1) rotate(${f(p.rot)})`,
    hipL: `translate(${-RIG.hipHalf} 0) rotate(${f(p.hipL)})`,
    thighL: `scale(1 ${f(p.thL)})`,
    kneeL: `translate(0 ${f(RIG.thigh * p.thL)}) rotate(${f(p.knL)})`,
    shinL: `scale(1 ${f(p.snL)})`,
    ankleL: `translate(0 ${f(RIG.shin * p.snL)}) rotate(${f(p.anL)})`,
    hipR: `translate(${RIG.hipHalf} 0) rotate(${f(p.hipR)})`,
    thighR: `scale(1 ${f(p.thR)})`,
    kneeR: `translate(0 ${f(RIG.thigh * p.thR)}) rotate(${f(p.knR)})`,
    shinR: `scale(1 ${f(p.snR)})`,
    ankleR: `translate(0 ${f(RIG.shin * p.snR)}) rotate(${f(p.anR)})`,
    waist: `translate(0 ${RIG.waistY}) rotate(${f(p.waist)})`,
    chest: `translate(0 ${RIG.chestY}) rotate(${f(p.chest)})`,
    head: `translate(0 ${RIG.neckY}) rotate(${f(p.neck)})`,
    hairBack: `translate(0 ${RIG.neckY}) rotate(${f(p.neck)})`,
    armL: `translate(${-RIG.shoulderHalf} ${f(RIG.shoulderY - p.liftL)}) rotate(${f(p.shL)})`,
    elbowL: `translate(0 ${RIG.upperArm}) rotate(${f(p.elL)})`,
    wristL: `translate(0 ${RIG.forearm}) rotate(${f(p.wrL)})`,
    armR: `translate(${RIG.shoulderHalf} ${f(RIG.shoulderY - p.liftR)}) rotate(${f(p.shR)})`,
    elbowR: `translate(0 ${RIG.upperArm}) rotate(${f(p.elR)})`,
    wristR: `translate(0 ${RIG.forearm}) rotate(${f(p.wrR)})`,
    pony: `rotate(${f(pony)} 2 -44)`,
    shadow: `translate(${f(RIG.rootX + p.x)} ${RIG.groundY}) scale(${f(1 - p.air / 110)} 1)`,
  };
}

const INITIAL = transformsFor(BASE, 0);

type Ids = { top: string; sequin: string; sheen: string };

type DancerProps = {
  avatar: Avatar;
  beatSec: number;
  /** Song time in seconds; without it the dancer free-runs on the wall clock. */
  clock?: () => number;
  action?: DancerAction | null;
  expression?: Expression;
  /** Which groove the dancer uses between moves. */
  grooveStyle?: number;
  /** Mirror the dancer on a glossy floor. */
  reflect?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Dancer({
  avatar,
  beatSec,
  clock,
  action = null,
  expression = "joy",
  grooveStyle = 0,
  reflect = false,
  className,
  style,
}: DancerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const propsRef = useRef({ beatSec, clock, action, grooveStyle });
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids: Ids = { top: `${uid}t`, sequin: `${uid}s`, sheen: `${uid}h` };
  const c = paletteOf(avatar);

  useEffect(() => {
    propsRef.current = { beatSec, clock, action, grooveStyle };
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = new Map<string, Element>();
    const written = new Map<string, string>();
    const state: MoveState = { move: null, start: 0, loop: false };
    let lastKey: string | number | undefined;
    let wasActive: boolean | null = null;

    const write = (name: string, attr: string, value: string) => {
      const id = `${name}:${attr}`;
      if (written.get(id) === value) return;
      let node = nodes.get(name);
      if (!node || !node.isConnected) {
        node = svg.querySelector(`[data-j="${name}"]`) ?? undefined;
        if (!node) return;
        nodes.set(name, node);
      }
      node.setAttribute(attr, value);
      written.set(id, value);
    };

    return register({
      tick(nowSec) {
        const props = propsRef.current;
        const sec = props.clock ? props.clock() : nowSec;
        const beat = sec / props.beatSec;
        const act = props.action;
        if (act?.key !== lastKey) {
          lastKey = act?.key;
          state.move = act ? act.move : null;
          state.start = Math.round(beat * 2) / 2;
          state.loop = Boolean(act?.loop);
        }
        const { pose, active } = poseAt(beat, props.grooveStyle, state);
        const pony =
          10 * Math.sin(Math.PI * beat + 0.8) - pose.neck * 0.6 - pose.x * 0.4;
        const t = transformsFor(pose, pony);
        for (const name in t) write(name, "transform", t[name]);
        if (active !== wasActive) {
          write("faceBase", "opacity", active ? "0" : "1");
          write("faceReact", "opacity", active ? "1" : "0");
          wasActive = active;
        }
      },
    });
  }, []);

  return (
    <div
      className={cn("dancer", reflect && "dancer-reflect", className)}
      style={style}
    >
      <svg ref={svgRef} viewBox="0 0 200 400" aria-hidden="true">
        <defs>
          <linearGradient id={ids.top} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={shade(c.top, 0.08)} />
            <stop offset="0.6" stopColor={c.top} />
            <stop offset="1" stopColor={c.topShade} />
          </linearGradient>
          <pattern
            id={ids.sequin}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <rect width="4" height="4" fill={c.top} />
            <circle cx="1" cy="1" r="1" fill={shade(c.top, 0.35)} />
            <circle cx="3" cy="3" r="1" fill={shade(c.top, -0.2)} />
          </pattern>
          <linearGradient id={ids.sheen} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="0.65" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g data-j="shadow" transform={INITIAL.shadow}>
          <ellipse cx={0} cy={0} rx={34} ry={5} fill="rgba(0,0,0,0.45)" />
        </g>

        <g data-j="root" transform={INITIAL.root}>
          <Leg side={-1} avatar={avatar} c={c} />
          <Leg side={1} avatar={avatar} c={c} />
          <HipBlock avatar={avatar} c={c} />

          <g data-j="waist" transform={INITIAL.waist}>
            <path d="M -16 1 L 16 1 L 15.5 -32 L -15.5 -32 Z" fill={c.skin} />
            <Waistband avatar={avatar} c={c} />

            <g data-j="chest" transform={INITIAL.chest}>
              <g data-j="hairBack" transform={INITIAL.hairBack}>
                <HairBack style={avatar.hair} c={c} />
              </g>
              <TorsoBack avatar={avatar} c={c} />
              <rect
                x={-5.2}
                y={-60}
                width={10.4}
                height={16}
                rx={4}
                fill={c.skin}
              />
              <path
                d="M -5.2 -52 Q 0 -48.5 5.2 -52 L 5.2 -49 Q 0 -45.5 -5.2 -49 Z"
                fill={c.skinShade}
                opacity={0.7}
              />
              <Torso avatar={avatar} c={c} ids={ids} />
              <NeckAccessory kind={avatar.accessory} c={c} />

              <g data-j="head" transform={INITIAL.head}>
                <Head avatar={avatar} c={c} expression={expression} />
              </g>

              <Arm side={-1} avatar={avatar} c={c} />
              <Arm side={1} avatar={avatar} c={c} />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Static head-and-shoulders portrait for lists and leaderboards. */
export function DancerHead({
  avatar,
  className,
}: {
  avatar: Avatar;
  className?: string;
}) {
  const c = paletteOf(avatar);
  return (
    <svg
      viewBox="-24 -54 48 56"
      className={cn("dancer-head", className)}
      aria-hidden="true"
    >
      <HairBack style={avatar.hair} c={c} />
      <path d="M -24 6 Q -22 -2 -10 -4 L 10 -4 Q 22 -2 24 6 Z" fill={c.top} />
      <Head avatar={avatar} c={c} expression="joy" />
    </svg>
  );
}
