import { describe, expect, it } from 'vitest';
import { parseDeck } from './csv-parser.js';
import { exportScryglass } from './export-scryglass.js';
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

describe('exportScryglass', () => {
  it('emits scryglass rows with commander first then nonlands and lands', () => {
    expect(exportScryglass(CARDS, [COMMANDER])).toBe(
      [
        'Galadriel, Light of Valinor;ltc;498;commander',
        'Andúril, Flame of the West;ltr;687;nonland',
        'Island;ltr;715;land',
        'Island;ltr;715;land',
      ].join('\n'),
    );
  });

  it('round-trips through parseDeck preserving non-commander cards and warnings', () => {
    const output = exportScryglass(CARDS, [COMMANDER]);
    const parsed = parseDeck(output);

    expect(parsed.errors).toEqual([]);
    expect(parsed.cards).toEqual([
      { name: 'Andúril, Flame of the West', setCode: 'ltr', collectorNumber: '687', cardType: 'nonland' },
      { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
      { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
    ]);
    expect(parsed.warnings).toEqual([
      'Row 1: commander "Galadriel, Light of Valinor" recognized but excluded from shuffleable deck',
    ]);
  });
});
