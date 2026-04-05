import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countLands, getMulliganVerdict } from './mulligan.js';
import { parseDeck } from './csv-parser.js';
import type { Card } from './schemas/card.js';

function makeCard(cardType: string): Card {
  return {
    name: 'Test Card',
    setCode: 'TST',
    collectorNumber: '1',
    cardType: cardType as Card['cardType'],
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DECKLISTS_DIR = resolve(__dirname, '../../../examples/decklists');

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

  it('returns 0 for an empty hand', () => {
    expect(countLands([])).toBe(0);
  });

  it('returns 0 when hand has no lands', () => {
    const hand = [
      makeCard('Creature'),
      makeCard('Artifact'),
      makeCard('Enchantment'),
      makeCard('Instant'),
      makeCard('Sorcery'),
      makeCard('Planeswalker'),
      makeCard('nonland'),
    ];
    expect(countLands(hand)).toBe(0);
  });

  it('returns full count when all cards are lands', () => {
    const hand = Array.from({ length: 7 }, () => makeCard('land'));
    expect(countLands(hand)).toBe(7);
  });

  it('handles the "land" card type from CSV parsing (lowercase)', () => {
    // The CSV parser normalizes card types to lowercase 'land' | 'nonland' | 'commander'
    const hand = [makeCard('land'), makeCard('nonland'), makeCard('land')];
    expect(countLands(hand)).toBe(2);
  });

  it('does not count "nonland" as a land', () => {
    const hand = [makeCard('nonland'), makeCard('nonland')];
    expect(countLands(hand)).toBe(0);
  });

  it('does not count "commander" as a land', () => {
    const hand = [makeCard('commander')];
    expect(countLands(hand)).toBe(0);
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

  // Explicit individual land count tests for clarity (acceptance criteria)
  it('auto-mulligans on 0 lands', () => {
    expect(getMulliganVerdict(0, { allowMulliganWith2or5Lands: false })).toBe('must_mulligan');
    expect(getMulliganVerdict(0, { allowMulliganWith2or5Lands: true })).toBe('must_mulligan');
  });

  it('auto-mulligans on 1 land', () => {
    expect(getMulliganVerdict(1, { allowMulliganWith2or5Lands: false })).toBe('must_mulligan');
    expect(getMulliganVerdict(1, { allowMulliganWith2or5Lands: true })).toBe('must_mulligan');
  });

  it('hard-locks keep on 3 lands', () => {
    expect(getMulliganVerdict(3, { allowMulliganWith2or5Lands: false })).toBe('must_keep');
    expect(getMulliganVerdict(3, { allowMulliganWith2or5Lands: true })).toBe('must_keep');
  });

  it('hard-locks keep on 4 lands', () => {
    expect(getMulliganVerdict(4, { allowMulliganWith2or5Lands: false })).toBe('must_keep');
    expect(getMulliganVerdict(4, { allowMulliganWith2or5Lands: true })).toBe('must_keep');
  });

  it('auto-mulligans on 6 lands', () => {
    expect(getMulliganVerdict(6, { allowMulliganWith2or5Lands: false })).toBe('must_mulligan');
    expect(getMulliganVerdict(6, { allowMulliganWith2or5Lands: true })).toBe('must_mulligan');
  });

  it('auto-mulligans on 7 lands', () => {
    expect(getMulliganVerdict(7, { allowMulliganWith2or5Lands: false })).toBe('must_mulligan');
    expect(getMulliganVerdict(7, { allowMulliganWith2or5Lands: true })).toBe('must_mulligan');
  });

  it('gives user choice on 2 lands (when enabled)', () => {
    expect(getMulliganVerdict(2, { allowMulliganWith2or5Lands: true })).toBe('user_choice');
  });

  it('forces keep on 2 lands (when disabled)', () => {
    expect(getMulliganVerdict(2, { allowMulliganWith2or5Lands: false })).toBe('must_keep');
  });

  it('gives user choice on 5 lands (when enabled)', () => {
    expect(getMulliganVerdict(5, { allowMulliganWith2or5Lands: true })).toBe('user_choice');
  });

  it('forces keep on 5 lands (when disabled)', () => {
    expect(getMulliganVerdict(5, { allowMulliganWith2or5Lands: false })).toBe('must_keep');
  });
});

describe('mulligan integration with CSV parsing', () => {
  it('correctly counts lands from a parsed sample deck', () => {
    const raw = readFileSync(resolve(DECKLISTS_DIR, 'good.txt'), 'utf-8');
    const parsed = parseDeck(raw);

    // The parsed deck should have some lands
    const allLands = parsed.cards.filter(c => c.cardType === 'land');
    expect(allLands.length).toBeGreaterThan(0);

    // countLands should agree with direct cardType filtering for CSV-parsed cards
    expect(countLands(parsed.cards)).toBe(allLands.length);
  });

  it('produces a valid mulligan verdict for a 7-card hand from a parsed deck', () => {
    const raw = readFileSync(resolve(DECKLISTS_DIR, 'good.txt'), 'utf-8');
    const parsed = parseDeck(raw);

    // Take the first 7 cards as a hypothetical hand
    const hand = parsed.cards.slice(0, 7);
    const landCount = countLands(hand);
    const verdict = getMulliganVerdict(landCount, { allowMulliganWith2or5Lands: false });

    // Verdict must be one of the valid enum values
    expect(['must_mulligan', 'must_keep', 'user_choice']).toContain(verdict);
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
