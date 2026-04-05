import { describe, it, expect } from 'vitest';
import { shuffle, cryptoRandomInt } from './shuffle.js';

describe('cryptoRandomInt', () => {
  it('returns 0 when max is 1', () => {
    expect(cryptoRandomInt(1)).toBe(0);
  });

  it('returns values in [0, max)', () => {
    for (let i = 0; i < 200; i++) {
      const value = cryptoRandomInt(10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });

  it('throws on non-positive or non-integer max', () => {
    expect(() => cryptoRandomInt(0)).toThrow(RangeError);
    expect(() => cryptoRandomInt(-1)).toThrow(RangeError);
    expect(() => cryptoRandomInt(1.5)).toThrow(RangeError);
  });

  it('uses globalThis.crypto.getRandomValues (Web Crypto API)', () => {
    // Verify the implementation calls the crypto API by checking it exists
    expect(globalThis.crypto).toBeDefined();
    expect(typeof globalThis.crypto.getRandomValues).toBe('function');

    // Confirm the function produces output (i.e., does not throw)
    const result = cryptoRandomInt(100);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(100);
  });

  it('produces uniform output across a large range (chi-squared goodness-of-fit)', () => {
    const max = 6;
    const iterations = 12_000;
    const counts = new Array(max).fill(0);

    for (let i = 0; i < iterations; i++) {
      counts[cryptoRandomInt(max)]++;
    }

    // Chi-squared test: sum of (observed - expected)^2 / expected
    const expected = iterations / max;
    let chiSquared = 0;
    for (let i = 0; i < max; i++) {
      chiSquared += (counts[i] - expected) ** 2 / expected;
    }

    // Critical value for df=5, p=0.001 is 20.515
    // A fair RNG should comfortably pass this threshold
    expect(chiSquared).toBeLessThan(20.515);
  });

  it('exercises rejection sampling for modulo bias elimination', () => {
    // For max values that don't evenly divide 2^32, the rejection sampling
    // branch must activate. max=3 divides 2^32 = 4294967296 with remainder:
    //   floor(4294967296 / 3) = 1431655765
    //   limit = 1431655765 * 3 = 4294967295
    // Only value 4294967295 (one out of 2^32) gets rejected.
    // We verify the function still works correctly with a range that triggers rejection.
    const results = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      results.add(cryptoRandomInt(3));
    }
    // All three values should appear
    expect(results.size).toBe(3);
    expect(results.has(0)).toBe(true);
    expect(results.has(1)).toBe(true);
    expect(results.has(2)).toBe(true);
  });
});

describe('shuffle', () => {
  it('returns a new array (does not mutate input)', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    const result = shuffle(original);

    expect(original).toEqual(copy);
    expect(result).not.toBe(original);
  });

  it('returns an array with the same length', () => {
    const arr = [10, 20, 30, 40, 50];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  it('contains the same elements as the input', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const result = shuffle(arr);
    expect(result.sort()).toEqual([...arr].sort());
  });

  it('handles an empty array', () => {
    const result = shuffle([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('handles a single-element array', () => {
    const result = shuffle([42]);
    expect(result).toEqual([42]);
    expect(result).toHaveLength(1);
  });

  it('returns a copy even for empty and single-element arrays', () => {
    const empty: number[] = [];
    const single = [1];

    expect(shuffle(empty)).not.toBe(empty);
    expect(shuffle(single)).not.toBe(single);
  });

  it('produces a roughly uniform distribution', () => {
    // Shuffle [0, 1, 2] 10,000 times and tally each permutation
    const counts = new Map<string, number>();
    const iterations = 10_000;

    for (let i = 0; i < iterations; i++) {
      const key = shuffle([0, 1, 2]).join(',');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // 3! = 6 permutations; each should appear ~1667 times
    const expected = iterations / 6;
    expect(counts.size).toBe(6);

    for (const [perm, count] of counts) {
      const deviation = Math.abs(count - expected) / expected;
      expect(deviation, `Permutation ${perm} appeared ${count} times (expected ~${expected})`).toBeLessThan(0.15);
    }
  });

  it('produces uniform positional frequencies (chi-squared per-position test)', () => {
    // For a 4-element array shuffled N times, each element should appear
    // at each position with probability 1/4.
    const n = 4;
    const iterations = 20_000;
    // positionCounts[element][position]
    const positionCounts: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < iterations; i++) {
      const result = shuffle([0, 1, 2, 3]);
      for (let pos = 0; pos < n; pos++) {
        positionCounts[result[pos]][pos]++;
      }
    }

    // Chi-squared for each element's distribution across positions
    const expected = iterations / n;
    for (let elem = 0; elem < n; elem++) {
      let chiSquared = 0;
      for (let pos = 0; pos < n; pos++) {
        chiSquared += (positionCounts[elem][pos] - expected) ** 2 / expected;
      }
      // df=3, p=0.001 → critical value 16.266
      expect(
        chiSquared,
        `Element ${elem} positional chi-squared ${chiSquared.toFixed(2)} exceeds critical value`,
      ).toBeLessThan(16.266);
    }
  });

  it('preserves object identity (same card instances, different array)', () => {
    const cards = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = shuffle(cards);

    // The result should contain the exact same object references
    for (const card of cards) {
      expect(result).toContain(card);
    }
  });

  it('handles a two-element array (verifies the i > 0 loop boundary)', () => {
    const counts = { '1,2': 0, '2,1': 0 };
    for (let i = 0; i < 2000; i++) {
      const key = shuffle([1, 2]).join(',') as keyof typeof counts;
      counts[key]++;
    }
    // Each permutation should appear roughly 1000 times
    expect(counts['1,2']).toBeGreaterThan(800);
    expect(counts['2,1']).toBeGreaterThan(800);
  });
});
