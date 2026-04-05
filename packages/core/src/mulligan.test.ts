import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { countLands, getMulliganVerdict } from './mulligan.js';
import type { Card } from './schemas/card.js';

function makeCard(cardType: string): Card {
  return {
    name: 'Test Card',
    setCode: 'TST',
    collectorNumber: '1',
    cardType: cardType as Card['cardType'],
  };
}

describe('countLands', () => {
  it('counts types containing "Land" (case-insensitive)', () => {
    const hand = [
      makeCard('Basic Land — Mountain'),
      makeCard("Land — Urza's"),
      makeCard('Legendary Land'),
      makeCard('Creature'),
      makeCard('Artifact'),
    ];

    expect(countLands(hand)).toBe(3);
  });
});

describe('getMulliganVerdict', () => {
  it('returns expected verdicts for land counts 0-7 when 2/5 mulligans are disabled', () => {
    const verdicts = Array.from({ length: 8 }, (_, landCount) =>
      getMulliganVerdict(landCount, { allowMulliganWith2or5Lands: false }),
    );

    expect(verdicts).toEqual([
      'must_mulligan',
      'must_mulligan',
      'must_keep',
      'must_keep',
      'must_keep',
      'must_keep',
      'must_mulligan',
      'must_mulligan',
    ]);
  });

  it('returns expected verdicts for land counts 0-7 when 2/5 mulligans are enabled', () => {
    const verdicts = Array.from({ length: 8 }, (_, landCount) =>
      getMulliganVerdict(landCount, { allowMulliganWith2or5Lands: true }),
    );

    expect(verdicts).toEqual([
      'must_mulligan',
      'must_mulligan',
      'user_choice',
      'must_keep',
      'must_keep',
      'user_choice',
      'must_mulligan',
      'must_mulligan',
    ]);
  });
});

describe('mulligan module environment', () => {
  it('has no browser globals dependency in source', () => {
    const source = readFileSync(fileURLToPath(new URL('./mulligan.ts', import.meta.url)), 'utf8');

    expect(source).not.toContain('window');
    expect(source).not.toContain('document');
    expect(source).not.toContain('fetch');
  });

  it('executes in node test environment', () => {
    expect(() => countLands([])).not.toThrow();
    expect(getMulliganVerdict(3, { allowMulliganWith2or5Lands: false })).toBe('must_keep');
  });
});
