/**
 * Cryptographic shuffle engine using Fisher-Yates algorithm
 * with Web Crypto API for unbiased randomness.
 *
 * @see ADR-004: Fisher-Yates Shuffle with Web Crypto API
 */

/**
 * Generate an unbiased random integer in [0, max) using
 * `globalThis.crypto.getRandomValues()` with rejection sampling
 * to eliminate modulo bias.
 *
 * @param max - Upper bound (exclusive). Must be a positive integer.
 * @returns A uniformly distributed random integer in [0, max).
 */
export function cryptoRandomInt(max: number): number {
  if (max <= 0 || !Number.isInteger(max)) {
    throw new RangeError(`max must be a positive integer, got ${max}`);
  }
  if (max === 1) return 0;

  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);

  // Rejection sampling: discard values that would introduce modulo bias
  // eslint-disable-next-line no-constant-condition
  while (true) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      return buf[0] % max;
    }
  }
}

/**
 * Return a new array containing the same elements as `array`, in a
 * uniformly random order produced by the Fisher-Yates (Knuth) shuffle.
 *
 * The input array is **not** mutated.
 *
 * @param array - Source array (treated as immutable).
 * @returns A new shuffled copy of the input.
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const result = [...array];

  // Fisher-Yates: iterate from last to first, swap with random index ≤ i
  for (let i = result.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}
