// Mulberry32 — small, deterministic PRNG. Pure function.

export function rng_from_seed(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rng_int(rng: () => number, min: number, max_exclusive: number): number {
  return min + Math.floor(rng() * (max_exclusive - min));
}

export function rng_pick<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length)];
}
