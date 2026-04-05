import { describe, expect, it } from 'vitest';
import { parseDeck } from './csv-parser.js';
import { convertMtgoArena } from './convert-mtgo-arena.js';
import { exportMtgoArena } from './export-mtgo-arena.js';
import type { Card } from './schemas/card.js';

const COMMANDER: Card = {
  name: 'Galadriel, Light of Valinor',
  setCode: 'ltc',
  collectorNumber: '498',
  cardType: 'commander',
};

const CARDS: Card[] = [
  { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
  { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
  { name: 'Andúril, Flame of the West', setCode: 'ltr', collectorNumber: '687', cardType: 'nonland' },
];

const ROUNDTRIP_CARDS: Card[] = [
  { name: 'Sol Ring', setCode: 'cmr', collectorNumber: '472', cardType: 'nonland' },
  { name: 'Sol Ring', setCode: 'cmr', collectorNumber: '472', cardType: 'nonland' },
  { name: 'Andúril, Flame of the West', setCode: 'ltr', collectorNumber: '687', cardType: 'nonland' },
];

describe('exportMtgoArena', () => {
  it('collapses duplicates and emits MTGO quantity lines', () => {
    expect(exportMtgoArena(CARDS)).toBe(
      ['1 Andúril, Flame of the West (LTR) 687', '2 Island (LTR) 715'].join('\n'),
    );
  });

  it('includes Commander and Deck sections when commanders are provided', () => {
    expect(exportMtgoArena(CARDS, [COMMANDER])).toBe(
      [
        'Commander',
        '1 Galadriel, Light of Valinor (LTC) 498',
        'Deck',
        '1 Andúril, Flame of the West (LTR) 687',
        '2 Island (LTR) 715',
      ].join('\n'),
    );
  });

  it('round-trips through convertMtgoArena and parseDeck preserving cards', () => {
    const exported = exportMtgoArena(ROUNDTRIP_CARDS, [COMMANDER]);
    const converted = convertMtgoArena(exported);
    const parsed = parseDeck(converted.output);

    expect(converted.errors).toHaveLength(0);
    expect(converted.warnings).toHaveLength(0);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.cards).toEqual(ROUNDTRIP_CARDS);
    expect(parsed.warnings).toEqual([
      'Row 1: commander "Galadriel, Light of Valinor" recognized but excluded from shuffleable deck',
    ]);
  });
});
