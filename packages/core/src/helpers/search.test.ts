import { describe, it, expect } from 'vitest';
import { searchLibrary } from './search.js';
import type { Card } from '../schemas/card.js';

function makeCard(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'nonland' };
}

const library: Card[] = [
  makeCard('Lightning Bolt'),
  makeCard('Sol Ring'),
  makeCard('Counterspell'),
  makeCard('Bolt of Thunder'),
  makeCard('LIGHTNING BOLT'),
];

describe('searchLibrary', () => {
  it('returns all cards when query is empty string', () => {
    const result = searchLibrary(library, '');
    expect(result).toHaveLength(library.length);
    expect(result).toEqual(library);
  });

  it('returns an empty array when no cards match', () => {
    const result = searchLibrary(library, 'Demonic Tutor');
    expect(result).toEqual([]);
  });

  it('matches cards by partial name (case-insensitive)', () => {
    const result = searchLibrary(library, 'bolt');
    expect(result).toHaveLength(3);
    expect(result.map(c => c.name)).toContain('Lightning Bolt');
    expect(result.map(c => c.name)).toContain('Bolt of Thunder');
    expect(result.map(c => c.name)).toContain('LIGHTNING BOLT');
  });

  it('is case-insensitive for both query and card name', () => {
    const result = searchLibrary(library, 'SOL RING');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sol Ring');
  });

  it('returns exact match when query equals card name', () => {
    const result = searchLibrary(library, 'Counterspell');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Counterspell');
  });

  it('does not mutate the original library', () => {
    const original = [...library];
    searchLibrary(library, 'bolt');
    expect(library).toEqual(original);
  });

  it('returns a new array (does not return the same reference) when query is empty', () => {
    const result = searchLibrary(library, '');
    expect(result).not.toBe(library);
  });

  it('works on an empty library', () => {
    expect(searchLibrary([], 'Sol Ring')).toEqual([]);
    expect(searchLibrary([], '')).toEqual([]);
  });
});
