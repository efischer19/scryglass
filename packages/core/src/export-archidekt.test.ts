import { describe, expect, it } from 'vitest';
import { parseDeck } from './csv-parser.js';
import { convertArchidekt } from './convert-archidekt.js';
import { exportArchidekt } from './export-archidekt.js';
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
  { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
  { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
  { name: 'Aragorn, the Uniter', setCode: 'ltr', collectorNumber: '193', cardType: 'nonland' },
];

describe('exportArchidekt', () => {
  it('collapses duplicates and includes category tags', () => {
    expect(exportArchidekt(CARDS)).toBe(
      [
        '1 Andúril, Flame of the West (LTR) 687 [Nonland]',
        '2 Island (LTR) 715 [Land]',
      ].join('\n'),
    );
  });

  it('includes commanders as [Commander]', () => {
    expect(exportArchidekt(CARDS, [COMMANDER])).toContain(
      '1 Galadriel, Light of Valinor (LTC) 498 [Commander]',
    );
  });

  it('round-trips through convertArchidekt and parseDeck preserving cards', () => {
    const exported = exportArchidekt(ROUNDTRIP_CARDS, [COMMANDER]);
    const converted = convertArchidekt(exported);
    const parsed = parseDeck(converted.output);

    expect(converted.errors).toHaveLength(0);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.cards).toEqual([
      { name: 'Aragorn, the Uniter', setCode: 'ltr', collectorNumber: '193', cardType: 'nonland' },
      { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
      { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
    ]);
    expect(parsed.warnings).toEqual([
      'Row 1: commander "Galadriel, Light of Valinor" recognized but excluded from shuffleable deck',
    ]);
  });
});
