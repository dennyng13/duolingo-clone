// Choreography for the rigged dancers (components/dance/dancer.tsx).
//
// A dancer is a 2D skeleton driven by forward kinematics. A Pose is a set of
// joint angles (degrees, clockwise) plus a few body offsets. Dancers always
// "groove" to the beat; a judged word triggers a 4-beat move that is blended
// on top of the groove and then hands back to it.
//
// Angle conventions (front view, "L" = the limb on the left of the screen):
//   arms/legs hang straight down at 0; positive L / negative R = outward/up
//   (shL 90 = left arm horizontal, shL 180 = straight up)
//   spine/neck: positive tilts the top towards the right of the screen.

import { hashString } from "./random";
import type { Rating } from "./types";

export const RIG = {
  rootX: 100,
  groundY: 392,
  hipHalf: 11,
  thigh: 86,
  shin: 82,
  foot: 10,
  waistY: -10,
  chestY: -30,
  neckY: -52,
  shoulderY: -45,
  shoulderHalf: 23,
  upperArm: 54,
  forearm: 50,
} as const;

export const POSE_KEYS = [
  "x",
  "air",
  "rot",
  "flip",
  "waist",
  "chest",
  "neck",
  "liftL",
  "liftR",
  "shL",
  "elL",
  "wrL",
  "shR",
  "elR",
  "wrR",
  "hipL",
  "knL",
  "anL",
  "hipR",
  "knR",
  "anR",
  "thL",
  "thR",
  "snL",
  "snR",
] as const;

export type PoseKey = (typeof POSE_KEYS)[number];
export type Pose = Record<PoseKey, number>;
type P = Partial<Pose>;

export const BASE: Pose = {
  x: 0,
  air: 0,
  rot: 0,
  flip: 1,
  waist: 0,
  chest: 0,
  neck: 0,
  liftL: 0,
  liftR: 0,
  shL: 9,
  elL: -10,
  wrL: 0,
  shR: -9,
  elR: 10,
  wrR: 0,
  hipL: 4,
  knL: -2,
  anL: -4,
  hipR: -4,
  knR: 2,
  anR: 4,
  thL: 1,
  thR: 1,
  snL: 1,
  snR: 1,
};

const SWAP: Partial<Record<PoseKey, PoseKey>> = {
  liftL: "liftR",
  liftR: "liftL",
  shL: "shR",
  shR: "shL",
  elL: "elR",
  elR: "elL",
  wrL: "wrR",
  wrR: "wrL",
  hipL: "hipR",
  hipR: "hipL",
  knL: "knR",
  knR: "knL",
  anL: "anR",
  anR: "anL",
  thL: "thR",
  thR: "thL",
  snL: "snR",
  snR: "snL",
};
const NOT_NEGATED = new Set<PoseKey>([
  "air",
  "flip",
  "liftL",
  "liftR",
  "thL",
  "thR",
  "snL",
  "snR",
]);

/** The same pose seen in a mirror (left and right swapped). */
export function mirror(p: P): P {
  const out: P = {};
  for (const key of Object.keys(p) as PoseKey[]) {
    const value = p[key]!;
    out[SWAP[key] ?? key] = NOT_NEGATED.has(key) ? value : -value;
  }
  return out;
}

/** Knees bending (front view: thighs foreshorten, knees open outwards). */
const bend = (amount: number): P => ({
  thL: 1 - 0.1 * amount,
  thR: 1 - 0.1 * amount,
  snL: 1 - 0.02 * amount,
  snR: 1 - 0.02 * amount,
  hipL: 5 + 6 * amount,
  knL: -4 - 9 * amount,
  hipR: -5 - 6 * amount,
  knR: 4 + 9 * amount,
});

// ---------------------------------------------------------------------------
// Moves

type Ease = "inout" | "out" | "in" | "snap" | "linear";
type Key = { t: number; p: P; e?: Ease };
export type MoveDef = { beats: number; keys: Key[]; loop?: boolean };

const k = (t: number, p: P = {}, e?: Ease): Key => ({ t, p, e });

const HANDS_ON_HIPS: P = { shL: 32, elL: -100, shR: -32, elR: 100 };
const POINT_UP: P = {
  ...bend(0.6),
  shR: -158,
  elR: -6,
  shL: 32,
  elL: -100,
  x: -6,
  rot: -3,
  chest: 5,
  neck: -8,
};
const POINT_DOWN: P = {
  ...bend(1),
  shR: 28,
  elR: 10,
  shL: 32,
  elL: -100,
  x: 6,
  rot: 3,
  chest: -5,
  neck: 8,
};
const CLAP_UP: P = { shL: 172, elL: -16, shR: -172, elR: 16 };
const OPEN_UP: P = { shL: 118, elL: 0, shR: -118, elR: 0 };
const CROUCH: P = {
  thL: 0.78,
  thR: 0.78,
  snL: 0.95,
  snR: 0.95,
  hipL: 12,
  hipR: -12,
  knL: -14,
  knR: 14,
  shL: -22,
  elL: -18,
  shR: 22,
  elR: 18,
};
const STAR: P = {
  air: 44,
  shL: 142,
  elL: 0,
  shR: -142,
  elR: 0,
  hipL: 26,
  hipR: -26,
  knL: 0,
  knR: 0,
};
const FREEZE: P = {
  hipL: 32,
  knL: -58,
  anL: 18,
  thL: 0.92,
  hipR: -12,
  knR: 4,
  x: -18,
  rot: -4,
  shR: -166,
  elR: -10,
  shL: 76,
  elL: -72,
  chest: 6,
  neck: 14,
};
const ARMS_CROSSED: P = { shL: -8, elL: -84, shR: 8, elR: 84 };
const SPIN_FINISH: P = {
  shR: -172,
  elR: -6,
  shL: 34,
  elL: -98,
  hipL: 18,
  knL: -28,
  anL: 10,
  x: -8,
  neck: -10,
  chest: 6,
  rot: -3,
};
const VOGUE_A: P = {
  shL: 150,
  elL: 76,
  shR: -32,
  elR: 98,
  x: -5,
  rot: -3,
  neck: -10,
  hipL: 9,
  knL: -15,
};
const VOGUE_L: P = {
  shL: 90,
  elL: 90,
  shR: -90,
  elR: 90,
  chest: -6,
  neck: -14,
};
const STEP_TOUCH: P = {
  x: -10,
  hipR: -8,
  knR: 18,
  thR: 0.8,
  shL: 52,
  elL: 58,
  wrL: 20,
  shR: -18,
  elR: 22,
  chest: -4,
  neck: -6,
  rot: -3,
};

export const MOVES = {
  point: {
    beats: 4,
    keys: [
      k(0, bend(0.5)),
      k(0.5, POINT_UP, "out"),
      k(1, POINT_DOWN),
      k(1.5, POINT_UP, "out"),
      k(2, POINT_DOWN),
      k(2.5, mirror(POINT_UP), "out"),
      k(3, mirror(POINT_DOWN)),
      k(3.5, mirror(POINT_UP), "out"),
      k(4, bend(1)),
    ],
  },
  wave: {
    beats: 4,
    keys: [
      k(0, bend(0.5)),
      k(0.5, { shL: 95, elL: 32, wrL: 30, shR: -90, chest: -4, ...bend(0.4) }),
      k(1, { shL: 85, elL: -22, wrL: -12, shR: -86, liftL: 5, ...bend(1) }),
      k(1.5, { shL: 90, liftR: 5, shR: -95, chest: 4, ...bend(0.4) }),
      k(2, { shL: 90, shR: -96, elR: -32, wrR: -30, ...bend(1) }),
      k(2.5, { shL: 92, shR: -85, elR: 22, wrR: 12, ...bend(0.4) }),
      k(3, { shL: 88, elL: 22, liftL: 4, shR: -90, chest: -3, ...bend(1) }),
      k(3.5, { shL: 96, elL: 32, wrL: 24, shR: -92, ...bend(0.4) }),
      k(4, bend(1)),
    ],
  },
  bodyroll: {
    beats: 4,
    keys: [
      k(0, bend(0.4)),
      k(0.5, {
        waist: 8,
        chest: -10,
        neck: 10,
        x: -5,
        liftL: 3,
        shL: 18,
        elL: -40,
        shR: -18,
        elR: 40,
        ...bend(0.3),
      }),
      k(1, {
        waist: -6,
        chest: 6,
        neck: -6,
        x: 4,
        shL: 18,
        elL: -40,
        shR: -18,
        elR: 40,
        ...bend(1),
      }),
      k(1.5, {
        waist: -8,
        chest: 10,
        neck: -10,
        x: 5,
        liftR: 3,
        shL: 18,
        elL: -40,
        shR: -18,
        elR: 40,
        ...bend(0.3),
      }),
      k(2, {
        waist: 6,
        chest: -6,
        neck: 6,
        x: -4,
        shL: 18,
        elL: -40,
        shR: -18,
        elR: 40,
        ...bend(1),
      }),
      k(2.5, {
        shR: -120,
        elR: -40,
        chest: 8,
        neck: -12,
        shL: 20,
        elL: -60,
        ...bend(0.5),
      }),
      k(3, {
        shR: -175,
        elR: -10,
        shL: 22,
        elL: -85,
        chest: -4,
        neck: 6,
        ...bend(0.2),
      }),
      k(3.5, { shR: -60, elR: 12, chest: 0, ...bend(1) }),
      k(4, {}),
    ],
  },
  kick: {
    beats: 4,
    keys: [
      k(0, bend(0.6)),
      k(
        0.4,
        {
          hipR: -48,
          knR: 6,
          anR: -14,
          shL: 70,
          elL: 50,
          shR: -30,
          elR: 20,
          chest: -6,
          rot: 3,
          x: -4,
        },
        "out"
      ),
      k(0.9, bend(1)),
      k(
        1.4,
        mirror({
          hipR: -48,
          knR: 6,
          anR: -14,
          shL: 70,
          elL: 50,
          shR: -30,
          elR: 20,
          chest: -6,
          rot: 3,
          x: -4,
        }),
        "out"
      ),
      k(1.9, bend(1)),
      k(
        2.4,
        {
          hipR: -48,
          knR: 6,
          anR: -14,
          shL: 160,
          elL: 10,
          shR: -160,
          elR: -10,
          chest: -4,
        },
        "out"
      ),
      k(2.9, bend(1)),
      k(
        3.3,
        { air: 18, hipL: 14, hipR: -14, knL: -10, knR: 10, ...OPEN_UP },
        "out"
      ),
      k(3.7, { ...bend(1.2), ...HANDS_ON_HIPS }),
      k(4, {}),
    ],
  },
  spin: {
    beats: 4,
    keys: [
      k(0, bend(0.5)),
      k(0.25, { ...ARMS_CROSSED, ...bend(0.5) }),
      k(0.75, { ...ARMS_CROSSED, flip: -1, air: 4 }, "linear"),
      k(1.25, { ...ARMS_CROSSED, flip: 1, air: 4 }, "linear"),
      k(1.75, { ...ARMS_CROSSED, flip: -1, air: 4 }, "linear"),
      k(2.2, { ...OPEN_UP, flip: 1, air: 8 }, "out"),
      k(2.8, SPIN_FINISH, "out"),
      k(3.6, { ...SPIN_FINISH, chest: 8 }),
      k(4, {}),
    ],
  },
  jump: {
    beats: 4,
    keys: [
      k(0, bend(0.5)),
      k(0.35, CROUCH),
      k(0.8, STAR, "out"),
      k(1.25, CROUCH, "in"),
      k(1.7, STAR, "out"),
      k(2.15, CROUCH, "in"),
      k(2.6, FREEZE, "snap"),
      k(3.6, { ...FREEZE, chest: 9, neck: 10 }),
      k(4, {}),
    ],
  },
  vogue: {
    beats: 4,
    keys: [
      k(0, bend(0.4)),
      k(0.5, VOGUE_A, "snap"),
      k(1, mirror(VOGUE_A), "snap"),
      k(1.5, { shL: 160, elL: 70, shR: -160, elR: -70, ...bend(0.6) }, "snap"),
      k(2, VOGUE_L, "snap"),
      k(2.5, mirror(VOGUE_L), "snap"),
      k(
        3,
        {
          shL: 100,
          elL: 118,
          neck: 16,
          chest: -6,
          shR: -26,
          elR: 96,
          hipR: -10,
          knR: 16,
          x: 6,
        },
        "snap"
      ),
      k(3.6, {
        shL: 100,
        elL: 118,
        neck: 18,
        chest: -8,
        shR: -26,
        elR: 96,
        hipR: -10,
        knR: 16,
        x: 6,
      }),
      k(4, {}),
    ],
  },
  slide: {
    beats: 4,
    keys: [
      k(0, bend(0.5)),
      k(0.5, { x: -20, hipL: 12, knL: -6, hipR: -2, ...CLAP_UP }, "out"),
      k(1, { x: -20, ...OPEN_UP, ...bend(1) }),
      k(1.5, { x: -20, hipL: 12, knL: -6, hipR: -2, ...CLAP_UP }, "out"),
      k(2, { x: 0, ...bend(1) }),
      k(
        2.5,
        mirror({ x: -20, hipL: 12, knL: -6, hipR: -2, ...CLAP_UP }),
        "out"
      ),
      k(3, { x: 20, ...OPEN_UP, ...bend(1) }),
      k(
        3.5,
        mirror({ x: -20, hipL: 12, knL: -6, hipR: -2, ...CLAP_UP }),
        "out"
      ),
      k(4, {}),
    ],
  },
  robot: {
    beats: 4,
    keys: [
      k(0, {}),
      k(0.5, { shL: 90, elL: -90, shR: -90, elR: 90, neck: 12 }, "snap"),
      k(
        1,
        {
          shL: 90,
          elL: 90,
          shR: -90,
          elR: -90,
          neck: -12,
          chest: 4,
          ...bend(0.6),
        },
        "snap"
      ),
      k(
        1.5,
        { shL: 90, elL: 0, wrL: 80, shR: -90, elR: 0, wrR: -80, x: -6 },
        "snap"
      ),
      k(
        2,
        {
          shL: 12,
          elL: -80,
          shR: -135,
          elR: 45,
          x: 6,
          chest: -6,
          ...bend(0.6),
        },
        "snap"
      ),
      k(
        2.5,
        { shL: 135, elL: -45, shR: -12, elR: 80, x: -6, chest: 6 },
        "snap"
      ),
      k(
        3,
        { shL: 90, elL: 90, shR: -90, elR: 90, neck: 10, ...bend(0.6) },
        "snap"
      ),
      k(3.5, { shL: 90, elL: -90, shR: -90, elR: -90, neck: -10 }, "snap"),
      k(4, {}, "snap"),
    ],
  },
  shoulder: {
    beats: 4,
    keys: [
      k(0, { shL: 12, elL: -25, shR: -12, elR: 25 }),
      ...[0, 1, 2].flatMap((b) => [
        k(
          b + 0.25,
          {
            liftL: 7,
            chest: 4,
            neck: -5,
            x: -3,
            shL: 12,
            elL: -25,
            shR: -12,
            elR: 25,
            ...bend(0.5),
          },
          "out"
        ),
        k(b + 0.5, { shL: 12, elL: -25, shR: -12, elR: 25, ...bend(1) }),
        k(
          b + 0.75,
          {
            liftR: 7,
            chest: -4,
            neck: 5,
            x: 3,
            shL: 12,
            elL: -25,
            shR: -12,
            elR: 25,
            ...bend(0.5),
          },
          "out"
        ),
        k(b + 1, { shL: 12, elL: -25, shR: -12, elR: 25, ...bend(1) }),
      ]),
      k(
        3.5,
        { liftL: 6, liftR: 6, shL: 14, elL: -25, shR: -14, elR: 25 },
        "out"
      ),
      k(4, {}),
    ],
  },
  step: {
    beats: 4,
    keys: [
      k(0, bend(0.5)),
      k(0.5, STEP_TOUCH, "out"),
      k(1, bend(1)),
      k(1.5, mirror(STEP_TOUCH), "out"),
      k(2, bend(1)),
      k(2.5, STEP_TOUCH, "out"),
      k(3, bend(1)),
      k(3.5, mirror(STEP_TOUCH), "out"),
      k(4, bend(1)),
    ],
  },
  fail: {
    beats: 2,
    keys: [
      k(0, {}),
      k(
        0.25,
        {
          rot: 12,
          x: 10,
          shL: 125,
          elL: 40,
          shR: -40,
          elR: 30,
          neck: 14,
          thR: 0.85,
        },
        "out"
      ),
      k(0.6, {
        rot: -10,
        x: -10,
        shR: -135,
        elR: -40,
        shL: 40,
        elL: 20,
        neck: -14,
        thL: 0.85,
      }),
      k(1, {
        rot: 5,
        x: 4,
        shL: 20,
        elL: -40,
        shR: -20,
        elR: 40,
        neck: 10,
        ...bend(1.4),
      }),
      k(1.5, { neck: 6, ...bend(0.6) }),
      k(2, {}),
    ],
  },
  victory: {
    beats: 2,
    loop: true,
    keys: [
      k(0, { shR: -160, elR: -20, shL: 32, elL: -100, neck: -6, ...bend(0.3) }),
      k(
        0.5,
        { shR: -150, elR: -72, shL: 32, elL: -100, air: 6, neck: -8 },
        "out"
      ),
      k(1, { shR: -172, elR: -5, shL: 32, elL: -100, neck: -4, ...bend(1) }),
      k(
        1.5,
        { shR: -150, elR: -72, shL: 32, elL: -100, air: 6, neck: -8 },
        "out"
      ),
      k(2, { shR: -160, elR: -20, shL: 32, elL: -100, neck: -6, ...bend(0.3) }),
    ],
  },
} satisfies Record<string, MoveDef>;

export type MoveName = keyof typeof MOVES;

export const SHOWCASE_MOVES: MoveName[] = [
  "point",
  "wave",
  "vogue",
  "spin",
  "robot",
  "slide",
  "bodyroll",
  "jump",
  "shoulder",
  "kick",
];

const MOVES_BY_RATING: Record<Rating, MoveName[]> = {
  perfect: ["jump", "spin", "vogue", "wave"],
  great: ["point", "slide", "robot", "kick"],
  cool: ["shoulder", "bodyroll", "step", "point"],
  bad: ["step"],
  miss: ["fail"],
};

/** Same move for the same player + word on every screen. */
export function pickMove(
  playerId: string,
  round: number,
  rating: Rating,
  combo: number
): MoveName {
  if (rating === "perfect" && combo >= 5) return combo % 2 ? "jump" : "spin";
  const pool = MOVES_BY_RATING[rating];
  return pool[hashString(`${playerId}:${round}`) % pool.length];
}

// ---------------------------------------------------------------------------
// Sampling

const EASE: Record<Ease, (u: number) => number> = {
  linear: (u) => u,
  inout: (u) => (1 - Math.cos(Math.PI * u)) / 2,
  out: (u) => 1 - (1 - u) * (1 - u),
  in: (u) => u * u,
  snap: (u) => (u < 0.4 ? 1 - Math.pow(1 - u / 0.4, 3) : 1),
};

const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return u * u * (3 - 2 * u);
};

function full(p: P): Pose {
  return { ...BASE, ...p };
}

const cache = new WeakMap<MoveDef, Pose[]>();

function sampleMove(def: MoveDef, t: number): Pose {
  let poses = cache.get(def);
  if (!poses) {
    poses = def.keys.map((key) => full(key.p));
    cache.set(def, poses);
  }
  const keys = def.keys;
  if (t <= keys[0].t) return poses[0];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const span = keys[i].t - keys[i - 1].t || 1;
      const u = EASE[keys[i].e ?? "inout"]((t - keys[i - 1].t) / span);
      const a = poses[i - 1];
      const b = poses[i];
      const out = {} as Pose;
      for (const key of POSE_KEYS) out[key] = a[key] + (b[key] - a[key]) * u;
      return out;
    }
  }
  return poses[poses.length - 1];
}

export const GROOVE_STYLES = 3;

/** Continuous dancing on the beat. `beat` is the absolute song beat. */
export function groove(beat: number, style: number): Pose {
  const down = 0.5 + 0.5 * Math.cos(2 * Math.PI * beat); // 1 on the beat
  const sway = Math.sin(Math.PI * beat); // ±1 every two beats
  const pose = full(bend(down * 0.9));
  switch (style % GROOVE_STYLES) {
    case 0: // classic bounce
      Object.assign(pose, {
        x: 4 * sway,
        rot: 2 * sway,
        waist: -2 * sway,
        chest: 3 * sway,
        neck: -3 * sway + 2 * down,
        shL: 11 + 5 * sway,
        elL: -14 - 10 * down,
        shR: -11 + 5 * sway,
        elR: 14 + 10 * down,
        liftL: 2.5 * Math.max(0, sway),
        liftR: 2.5 * Math.max(0, -sway),
      });
      break;
    case 1: {
      // step touch with snapping arms
      const left = Math.max(0, sway);
      const right = Math.max(0, -sway);
      Object.assign(pose, {
        x: 9 * sway,
        rot: 3 * sway,
        chest: -4 * sway,
        neck: 5 * sway,
        hipL: 6 + 8 * left,
        knL: -4 - 20 * left,
        thL: 1 - 0.18 * left - 0.05 * down,
        hipR: -6 - 8 * right,
        knR: 4 + 20 * right,
        thR: 1 - 0.18 * right - 0.05 * down,
        shL: 18 + 10 * sway,
        elL: -62 - 8 * down,
        shR: -18 + 10 * sway,
        elR: 62 + 8 * down,
      });
      break;
    }
    default: {
      // smooth R&B rock
      const c = Math.sin(Math.PI * beat + Math.PI / 2);
      Object.assign(pose, {
        waist: 5 * sway,
        chest: -7 * sway,
        neck: 6 * sway,
        x: 5 * c,
        rot: 2 * sway,
        shL: 10 + 6 * c,
        elL: -22 + 10 * sway,
        shR: -10 + 6 * c,
        elR: 22 + 10 * sway,
        thL: 1 - 0.08 * Math.max(0, sway) - 0.03 * down,
        thR: 1 - 0.08 * Math.max(0, -sway) - 0.03 * down,
      });
    }
  }
  return pose;
}

export type MoveState = { move: MoveName | null; start: number; loop: boolean };

/** Final pose: groove plus the active move, blended in and out smoothly. */
export function poseAt(
  beat: number,
  style: number,
  state: MoveState
): { pose: Pose; active: boolean } {
  const base = groove(beat, style);
  if (!state.move) return { pose: base, active: false };
  const def: MoveDef = MOVES[state.move];
  const t = beat - state.start;
  const loop = state.loop || def.loop;
  if (t < 0 || (!loop && t >= def.beats)) return { pose: base, active: false };
  const local = loop ? t % def.beats : t;
  const move = sampleMove(def, local);
  const w = loop
    ? smooth(0, 0.35, t)
    : smooth(0, 0.3, t) * (1 - smooth(def.beats - 0.55, def.beats, t));
  const pose = {} as Pose;
  for (const key of POSE_KEYS)
    pose[key] = base[key] + (move[key] - base[key]) * w;
  return { pose, active: true };
}

/** Root height that keeps the lowest foot on the floor (unless jumping). */
export function rootY(p: Pose) {
  const rad = Math.PI / 180;
  const legBottom = (
    side: -1 | 1,
    hip: number,
    knee: number,
    th: number,
    sn: number
  ) => {
    const r = p.rot * rad;
    const hx = side * RIG.hipHalf;
    let y = hx * Math.sin(r);
    const a1 = (p.rot + hip) * rad;
    y += Math.cos(a1) * RIG.thigh * th;
    const a2 = a1 + knee * rad;
    y += Math.cos(a2) * RIG.shin * sn;
    return y;
  };
  const lowest = Math.max(
    legBottom(-1, p.hipL, p.knL, p.thL, p.snL),
    legBottom(1, p.hipR, p.knR, p.thR, p.snR)
  );
  return RIG.groundY - RIG.foot - lowest - p.air;
}

export const MOVE_LABELS: Record<MoveName, string> = {
  point: "Disco Point",
  wave: "Arm Wave",
  bodyroll: "Body Roll",
  kick: "Kick Ball Change",
  spin: "Spin",
  jump: "Jump Freeze",
  vogue: "Vogue",
  slide: "Slide & Clap",
  robot: "Pop & Lock",
  shoulder: "Shoulder Bounce",
  step: "Step Touch",
  fail: "Stumble",
  victory: "Victory",
};
