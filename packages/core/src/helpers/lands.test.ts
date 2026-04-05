import { describe, it, expect } from 'vitest';
import { getBasicLandCounts, isBasicLandOfType } from './lands.js';
import type { Card } from '../schemas/card.js';

function makeCard(name: string, cardType: 'land' | 'nonland' = 'nonland'): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType };
}

function makeLand(name: string): Card {
  return makeCard(name, 'land');
}

describe('isBasicLandOfType', () => {
  it('returns true for a plain basic land card', () => {
    expect(isBasicLandOfType(makeLand('Mountain'), 'Mountain')).toBe(true);
  });

  it('returns true for snow-covered basics', () => {
    expect(isBasicLandOfType(makeLand('Snow-Covered Mountain'), 'Mountain')).toBe(true);
  });

  it('returns false for a non-basic land (cardType land but name does not contain subtype)', () => {
    expect(isBasicLandOfType(makeLand('Windswept Heath'), 'Plains')).toBe(false);
  });

  it('returns false for a nonland card', () => {
    expect(isBasicLandOfType(makeCard('Sol Ring'), 'Mountain')).toBe(false);
  });

  it('returns false for a land card of a different type', () => {
    expect(isBasicLandOfType(makeLand('Forest'), 'Mountain')).toBe(false);
  });

  it('returns false for a nonland card whose name happens to contain a land type', () => {
    expect(isBasicLandOfType(makeCard('Mountain Goat'), 'Mountain')).toBe(false);
  });

  it('matches each of the five basic land types by name', () => {
    expect(isBasicLandOfType(makeLand('Plains'), 'Plains')).toBe(true);
    expect(isBasicLandOfType(makeLand('Island'), 'Island')).toBe(true);
    expect(isBasicLandOfType(makeLand('Swamp'), 'Swamp')).toBe(true);
    expect(isBasicLandOfType(makeLand('Mountain'), 'Mountain')).toBe(true);
    expect(isBasicLandOfType(makeLand('Forest'), 'Forest')).toBe(true);
  });
});

describe('getBasicLandCounts', () => {
  it('returns correct counts for a library with all five basic land types', () => {
    const library = [
      makeLand('Mountain'),
      makeLand('Mountain'),
      makeLand('Mountain'),
      makeLand('Island'),
      makeLand('Island'),
      makeLand('Swamp'),
      makeLand('Forest'),
      makeLand('Plains'),
      makeCard('Sol Ring'),
    ];
    const counts = getBasicLandCounts(library);
    expect(counts).toEqual({
      Mountain: 3,
      Island: 2,
      Swamp: 1,
      Forest: 1,
      Plains: 1,
    });
  });

  it('returns an empty record for a library with no basic lands', () => {
    const library = [
      makeCard('Sol Ring'),
      makeLand('Windswept Heath'),
    ];
    expect(getBasicLandCounts(library)).toEqual({});
  });

  it('counts snow-covered basics under the correct land type', () => {
    const library = [
      makeLand('Snow-Covered Mountain'),
      makeLand('Mountain'),
      makeLand('Snow-Covered Forest'),
    ];
    const counts = getBasicLandCounts(library);
    expect(counts['Mountain']).toBe(2);
    expect(counts['Forest']).toBe(1);
  });

  it('returns an empty record for an empty library', () => {
    expect(getBasicLandCounts([])).toEqual({});
  });

  it('only includes land types that are present', () => {
    const library = [makeLand('Island')];
    const counts = getBasicLandCounts(library);
    expect(Object.keys(counts)).toEqual(['Island']);
  });
});
