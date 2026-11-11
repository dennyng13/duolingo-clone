/** Small deterministic PRNG so every client generates the same melody. */
export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(items: readonly T[], rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function randomInt(maxExclusive: number, rng = Math.random) {
  return Math.floor(rng() * maxExclusive);
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
// No 0/O or 1/I so codes are easy to read aloud and type.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomId(length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) out += pick(ID_ALPHABET.split(""));
  return out;
}

export function randomRoomCode(length = 4) {
  let out = "";
  for (let i = 0; i < length; i++) out += pick(CODE_ALPHABET.split(""));
  return out;
}
