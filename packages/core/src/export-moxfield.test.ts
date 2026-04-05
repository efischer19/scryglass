import { describe, expect, it } from 'vitest';
import { parseDeck } from './csv-parser.js';
import { convertMoxfield } from './convert-moxfield.js';
import { exportMoxfield } from './export-moxfield.js';
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

describe('exportMoxfield', () => {
  it('emits CSV with standard headers and collapsed quantities', () => {
    expect(exportMoxfield(CARDS)).toBe(
      [
        'Count,Name,Edition,Collector Number,Board',
        '1,"Andúril, Flame of the West",LTR,687,mainboard',
        '2,Island,LTR,715,mainboard',
      ].join('\n'),
    );
  });

  it('properly quotes names with commas and exports commanders in Board column', () => {
    expect(exportMoxfield(CARDS, [COMMANDER])).toContain(
      '1,"Galadriel, Light of Valinor",LTC,498,commanders',
    );
  });

  it('round-trips through convertMoxfield and parseDeck preserving cards', () => {
    const exported = exportMoxfield(ROUNDTRIP_CARDS, [COMMANDER]);
    const converted = convertMoxfield(exported);
    const parsed = parseDeck(converted.output);

    expect(converted.errors).toHaveLength(0);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.cards).toEqual(ROUNDTRIP_CARDS);
    expect(parsed.warnings).toEqual([
      'Row 1: commander "Galadriel, Light of Valinor" recognized but excluded from shuffleable deck',
    ]);
  });
});
