// ─────────────────────────────────────────────────────────────────────────────
// A seeded pseudo-random source for the synthetic dataset (BL-102).
//
// mulberry32: 32-bit state, fast, and good enough for sample data. It exists so
// the same seed always yields the same dataset — no `Math.random` anywhere in
// the generator, and nothing at module level.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Rng
 * @property {() => number} next -  Uniform in [0, 1).
 * @property {(min: number, max: number) => number} range -  Uniform in [min, max).
 * @property {(min: number, max: number) => number} int -  Integer uniform in [min, max] (inclusive).
 * @property {(p: number) => boolean} chance -  True with probability `p`.
 * @property {<T>(items: readonly T[]) => T} pick -  One element of a non-empty list.
 * @property {() => number} normal -  Approximately normal (mean 0, sd 1) — sum of uniforms.
 * @property {<T>(items: readonly T[]) => T[]} shuffle -  A shuffled copy (Fisher–Yates).
 */

/**
 * @param {number} seed
 * @returns {Rng}
 */
export function createRng(seed) {
  let a = seed >>> 0;
  /** @returns {number} */
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** @type {Rng} */
  const rng = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    normal: () => {
      let s = 0;
      for (let i = 0; i < 6; i += 1) s += next();
      // Six uniforms: mean 3, standard deviation √0.5.
      return (s - 3) / Math.SQRT1_2;
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
  };
  return rng;
}
