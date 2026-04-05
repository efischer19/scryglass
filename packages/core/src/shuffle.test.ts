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
});
