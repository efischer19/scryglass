/**
 * Shuffle engine using Fisher-Yates with unbiased range selection.
 *
 * Unseeded shuffles use `globalThis.crypto.getRandomValues()` for local play,
 * while seeded shuffles use a deterministic PRNG so multiple peers can derive
 * the same order independently.
 *
 * @see ADR-013: Deterministic Seeded PRNG for Shared Shuffling
 */

export type ShuffleSeed = number | string;

function randomIntFromSource(max: number, nextUint32: () => number): number {
  if (max <= 0 || !Number.isInteger(max)) {
    throw new RangeError(`max must be a positive integer, got ${max}`);
  }
  if (max === 1) return 0;

  const limit = Math.floor(0x1_0000_0000 / max) * max;

  // Rejection sampling: discard values that would introduce modulo bias
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const value = nextUint32();
    if (value < limit) {
      return value % max;
    }
  }
}

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;

  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);

  return (hash ^ (hash >>> 16)) >>> 0;
}

function normalizeSeed(seed: ShuffleSeed): number {
  if (typeof seed === 'number') {
    if (!Number.isInteger(seed)) {
      throw new RangeError(`seed must be an integer, got ${seed}`);
    }
    return seed >>> 0;
  }

  return hashSeed(seed);
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), state | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return (result ^ (result >>> 14)) >>> 0;
  };
}

function createSeededRandomInt(seed: ShuffleSeed): (max: number) => number {
  const nextUint32 = createMulberry32(normalizeSeed(seed));

  return (max: number) => randomIntFromSource(max, nextUint32);
}

/**
 * Generate an unbiased random integer in [0, max) using
 * `globalThis.crypto.getRandomValues()` with rejection sampling
 * to eliminate modulo bias.
 *
 * @param max - Upper bound (exclusive). Must be a positive integer.
 * @returns A uniformly distributed random integer in [0, max).
 */
export function cryptoRandomInt(max: number): number {
  const buf = new Uint32Array(1);
  return randomIntFromSource(max, () => {
    globalThis.crypto.getRandomValues(buf);
    return buf[0];
  });
}

/**
 * Return a new array containing the same elements as `array`, in a
 * uniformly random order produced by the Fisher-Yates (Knuth) shuffle.
 *
 * The input array is **not** mutated.
 *
 * @param array - Source array (treated as immutable).
 * @param seed - Optional deterministic seed used to reproduce the same order.
 * @returns A new shuffled copy of the input.
 */
export function shuffle<T>(array: readonly T[], seed?: ShuffleSeed): T[] {
  const result = [...array];
  const randomInt = seed === undefined ? cryptoRandomInt : createSeededRandomInt(seed);

  // Fisher-Yates: iterate from last to first, swap with random index ≤ i
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}
