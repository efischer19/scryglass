/**
 * Regression test suite: import/export round-trip fidelity
 *
 * Validates that every supported converter/exporter preserves card data
 * through a full export→re-import cycle for each example deck.
 *
 * Test matrix: 2 decks (deck_A.txt, deck_B.txt) × 4 formats = 8 round-trip scenarios
 *
 * Known lossy formats (documented below):
 *   - MTGO/Arena: land cardType becomes nonland (no Land section in MTGO format)
 *   - Moxfield:   land cardType becomes nonland (Board column maps land → mainboard → nonland)
 *   Archidekt and Scryglass formats preserve land/nonland/commander exactly.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { parseDeck } from './csv-parser.js';
import { convertMtgoArena } from './convert-mtgo-arena.js';
import { convertMoxfield } from './convert-moxfield.js';
import { convertArchidekt } from './convert-archidekt.js';
import { exportMtgoArena } from './export-mtgo-arena.js';
import { exportMoxfield } from './export-moxfield.js';
import { exportArchidekt } from './export-archidekt.js';
import { exportScryglass } from './export-scryglass.js';
import type { Card, ParseResult } from './csv-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DECKLISTS_DIR = resolve(__dirname, '../../../examples/decklists');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract commander cards directly from a raw scryglass-format deck string.
 * parseDeck() excludes commanders from `cards`, so we re-scan the raw text to
 * obtain full Card objects (name, setCode, collectorNumber) for exporters.
 */
function extractCommanders(rawText: string): Card[] {
  const commanders: Card[] = [];
  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(';');
    if (parts.length >= 4 && parts[3].trim().toLowerCase() === 'commander') {
      commanders.push({
        name: parts[0].trim(),
        setCode: parts[1].trim().toLowerCase(),
        collectorNumber: parts[2].trim(),
        cardType: 'commander',
      });
    }
  }
  return commanders;
}

/**
 * Sort cards for deterministic, diff-friendly comparison:
 * primary key = name, secondary = setCode, tertiary = collectorNumber (numeric).
 */
function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const nameDiff = a.name.localeCompare(b.name);
    if (nameDiff !== 0) return nameDiff;
    const setDiff = a.setCode.localeCompare(b.setCode);
    if (setDiff !== 0) return setDiff;
    return a.collectorNumber.localeCompare(b.collectorNumber, undefined, { numeric: true });
  });
}

/**
 * Extract commander names from parseDeck() warning messages.
 * Warning format: `Row N: commander "NAME" recognized but excluded from shuffleable deck`
 */
function extractCommanderNames(warnings: string[]): string[] {
  return warnings
    .map((w) => {
      const match = w.match(/commander "(.+)" recognized/);
      return match ? match[1] : null;
    })
    .filter((name): name is string => name !== null)
    .sort();
}

type NormalizedCard = { name: string; setCode: string; collectorNumber: string };

/**
 * Strip cardType from a card array and sort — used when comparing round-trips
 * through lossy formats that do not preserve the land/nonland distinction.
 */
function stripCardType(cards: Card[]): NormalizedCard[] {
  return sortCards(cards).map(({ name, setCode, collectorNumber }) => ({
    name,
    setCode,
    collectorNumber,
  }));
}

// ---------------------------------------------------------------------------
// Round-trip test matrix
// ---------------------------------------------------------------------------

describe('regression: import/export round-trips', () => {
  const DECK_FILES = ['good.txt', 'evil.txt'];

  for (const deckFile of DECK_FILES) {
    describe(`deck: ${deckFile}`, () => {
      const raw = readFileSync(resolve(DECKLISTS_DIR, deckFile), 'utf-8');
      const original: ParseResult = parseDeck(raw);
      const commanders: Card[] = extractCommanders(raw);

      it('parses without errors', () => {
        expect(original.errors).toEqual([]);
      });

      it('has at least one commander', () => {
        expect(commanders.length).toBeGreaterThanOrEqual(1);
        // parseDeck emits one warning per commander
        expect(extractCommanderNames(original.warnings).length).toBe(commanders.length);
      });

      // -----------------------------------------------------------------------
      // Scryglass: exact round-trip (all fields preserved)
      // -----------------------------------------------------------------------
      describe('scryglass round-trip (exact — all fields preserved)', () => {
        it('exports and re-parses with identical cards', () => {
          const exported = exportScryglass(original.cards, commanders);
          const reimported = parseDeck(exported);

          expect(reimported.errors).toEqual([]);
          expect(sortCards(reimported.cards)).toEqual(sortCards(original.cards));
        });

        it('preserves commander cards as warnings on re-parse', () => {
          const exported = exportScryglass(original.cards, commanders);
          const reimported = parseDeck(exported);

          expect(extractCommanderNames(reimported.warnings)).toEqual(
            extractCommanderNames(original.warnings),
          );
        });
      });

      // -----------------------------------------------------------------------
      // MTGO/Arena: lossy for cardType (all Deck cards become nonland)
      // -----------------------------------------------------------------------
      describe('MTGO/Arena round-trip (lossy: land cardType becomes nonland)', () => {
        it('exports and re-imports with identical card identities (name, set, collector number)', () => {
          const exported = exportMtgoArena(original.cards, commanders);
          const converted = convertMtgoArena(exported);
          const reimported = parseDeck(converted.output);

          expect(converted.errors).toEqual([]);
          expect(reimported.errors).toEqual([]);
          // cardType is lossy for lands — compare only identity fields
          expect(stripCardType(reimported.cards)).toEqual(stripCardType(original.cards));
        });

        it('preserves commander cards', () => {
          const exported = exportMtgoArena(original.cards, commanders);
          const converted = convertMtgoArena(exported);
          const reimported = parseDeck(converted.output);

          expect(extractCommanderNames(reimported.warnings)).toEqual(
            extractCommanderNames(original.warnings),
          );
        });

        it('produces the correct total card count', () => {
          const exported = exportMtgoArena(original.cards, commanders);
          const converted = convertMtgoArena(exported);
          const reimported = parseDeck(converted.output);

          expect(reimported.cards).toHaveLength(original.cards.length);
        });
      });

      // -----------------------------------------------------------------------
      // Moxfield: lossy for cardType (Board column has no 'land' value)
      // -----------------------------------------------------------------------
      describe('Moxfield round-trip (lossy: land cardType becomes nonland)', () => {
        it('exports and re-imports with identical card identities (name, set, collector number)', () => {
          const exported = exportMoxfield(original.cards, commanders);
          const converted = convertMoxfield(exported);
          const reimported = parseDeck(converted.output);

          expect(converted.errors).toEqual([]);
          expect(reimported.errors).toEqual([]);
          // cardType is lossy for lands — Board maps both land/nonland to mainboard → nonland
          expect(stripCardType(reimported.cards)).toEqual(stripCardType(original.cards));
        });

        it('preserves commander cards', () => {
          const exported = exportMoxfield(original.cards, commanders);
          const converted = convertMoxfield(exported);
          const reimported = parseDeck(converted.output);

          expect(extractCommanderNames(reimported.warnings)).toEqual(
            extractCommanderNames(original.warnings),
          );
        });

        it('produces the correct total card count', () => {
          const exported = exportMoxfield(original.cards, commanders);
          const converted = convertMoxfield(exported);
          const reimported = parseDeck(converted.output);

          expect(reimported.cards).toHaveLength(original.cards.length);
        });
      });

      // -----------------------------------------------------------------------
      // Archidekt: exact round-trip ([Land]/[Nonland]/[Commander] tags)
      // -----------------------------------------------------------------------
      describe('Archidekt round-trip (exact — all fields preserved)', () => {
        it('exports and re-imports with identical cards', () => {
          const exported = exportArchidekt(original.cards, commanders);
          const converted = convertArchidekt(exported);
          const reimported = parseDeck(converted.output);

          expect(converted.errors).toEqual([]);
          expect(reimported.errors).toEqual([]);
          expect(sortCards(reimported.cards)).toEqual(sortCards(original.cards));
        });

        it('preserves commander cards', () => {
          const exported = exportArchidekt(original.cards, commanders);
          const converted = convertArchidekt(exported);
          const reimported = parseDeck(converted.output);

          expect(extractCommanderNames(reimported.warnings)).toEqual(
            extractCommanderNames(original.warnings),
          );
        });

        it('produces the correct total card count', () => {
          const exported = exportArchidekt(original.cards, commanders);
          const converted = convertArchidekt(exported);
          const reimported = parseDeck(converted.output);

          expect(reimported.cards).toHaveLength(original.cards.length);
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Quantity collapsing / expanding
  // ---------------------------------------------------------------------------
  describe('quantity collapsing/expanding (lossless)', () => {
    it('4 Islands of the same printing collapse to "4 Island (LTR) 716" and re-expand to 4 Islands', () => {
      const islands: Card[] = Array.from({ length: 4 }, () => ({
        name: 'Island',
        setCode: 'ltr',
        collectorNumber: '716',
        cardType: 'land' as const,
      }));

      // MTGO/Arena round-trip
      const mtgoText = exportMtgoArena(islands);
      expect(mtgoText).toBe('4 Island (LTR) 716');

      const converted = convertMtgoArena(mtgoText);
      expect(converted.errors).toEqual([]);

      const reimported = parseDeck(converted.output);
      expect(reimported.errors).toEqual([]);
      expect(reimported.cards).toHaveLength(4);
      for (const card of reimported.cards) {
        expect(card.name).toBe('Island');
        expect(card.setCode).toBe('ltr');
        expect(card.collectorNumber).toBe('716');
      }
    });

    it('Islands across two different printings each collapse independently', () => {
      const islands: Card[] = [
        ...Array.from({ length: 4 }, () => ({
          name: 'Island',
          setCode: 'ltr',
          collectorNumber: '715',
          cardType: 'land' as const,
        })),
        ...Array.from({ length: 5 }, () => ({
          name: 'Island',
          setCode: 'ltr',
          collectorNumber: '716',
          cardType: 'land' as const,
        })),
      ];

      const mtgoText = exportMtgoArena(islands);
      // Both printings appear as separate collapsed lines
      expect(mtgoText).toContain('4 Island (LTR) 715');
      expect(mtgoText).toContain('5 Island (LTR) 716');

      const converted = convertMtgoArena(mtgoText);
      const reimported = parseDeck(converted.output);
      expect(reimported.cards).toHaveLength(9);

      const count715 = reimported.cards.filter((c) => c.collectorNumber === '715').length;
      const count716 = reimported.cards.filter((c) => c.collectorNumber === '716').length;
      expect(count715).toBe(4);
      expect(count716).toBe(5);
    });

    it('multiple printings of the same-named card (Nazgûl) round-trip independently via Archidekt', () => {
      const raw = readFileSync(resolve(DECKLISTS_DIR, 'evil.txt'), 'utf-8');
      const original = parseDeck(raw);
      const commanders = extractCommanders(raw);

      const nazgulCards = original.cards.filter((c) => c.name === 'Nazgûl');
      // deck_B has exactly 9 Nazgûl entries across 9 different collector numbers (551, 723–730)
      expect(nazgulCards).toHaveLength(9);

      const exported = exportArchidekt(original.cards, commanders);
      const converted = convertArchidekt(exported);
      const reimported = parseDeck(converted.output);

      const reimportedNazgul = reimported.cards.filter((c) => c.name === 'Nazgûl');
      expect(reimportedNazgul).toHaveLength(nazgulCards.length);
      // Each distinct collector-number group must be individually preserved
      expect(sortCards(reimportedNazgul)).toEqual(sortCards(nazgulCards));
    });
  });
});
