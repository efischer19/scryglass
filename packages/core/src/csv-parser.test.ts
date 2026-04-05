import { describe, it, expect } from 'vitest';
import { parseDeck, CardSchema, CardTypeEnum, ParseResultSchema } from './csv-parser.js';
import type { Card, ParseResult } from './csv-parser.js';

describe('parseDeck', () => {
  describe('valid input', () => {
    it('parses a single nonland row', () => {
      const input = 'Lightning Bolt;m21;219;nonland';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0]).toEqual<Card>({
        name: 'Lightning Bolt',
        setCode: 'm21',
        collectorNumber: '219',
        cardType: 'nonland',
      });
    });

    it('parses a single land row', () => {
      const input = 'Island;LTR;715;land';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0]).toEqual<Card>({
        name: 'Island',
        setCode: 'ltr',
        collectorNumber: '715',
        cardType: 'land',
      });
    });

    it('parses multiple rows', () => {
      const input = [
        'Island;LTR;715;land',
        'Mountain;LTR;718;land',
        'Andúril, Flame of the West;LTR;687;nonland',
      ].join('\n');
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.cards).toHaveLength(3);
    });

    it('handles card names containing commas', () => {
      const input = 'Galadriel, Light of Valinor;LTC;498;nonland';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Galadriel, Light of Valinor');
    });
  });

  describe('header row handling', () => {
    it('skips header row starting with card_name', () => {
      const input = [
        'card_name;set_code;collector_number;card_type',
        'Island;LTR;715;land',
      ].join('\n');
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Island');
    });

    it('skips header row case-insensitively', () => {
      const input = [
        'Card_Name;Set_Code;Collector_Number;Card_Type',
        'Island;LTR;715;land',
      ].join('\n');
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
    });

    it('processes correctly when no header row is present', () => {
      const input = 'Island;LTR;715;land';
      const result = parseDeck(input);
      expect(result.cards).toHaveLength(1);
    });
  });

  describe('case insensitivity', () => {
    it('normalizes set_code to lowercase', () => {
      const input = 'Island;LTR;715;land';
      const result = parseDeck(input);
      expect(result.cards[0].setCode).toBe('ltr');
    });

    it('normalizes card_type to lowercase', () => {
      const input = 'Island;ltr;715;LAND';
      const result = parseDeck(input);
      expect(result.cards[0].cardType).toBe('land');
    });

    it('accepts mixed-case card_type values', () => {
      const input = [
        'Island;ltr;715;Land',
        'Forest;ltr;720;LAND',
        'Lightning Bolt;m21;219;Nonland',
        'Counterspell;2ed;55;NonLand',
      ].join('\n');
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(4);
    });

    it('preserves card_name as-is (no case normalization)', () => {
      const input = 'Galadriel, Light of Valinor;LTC;498;nonland';
      const result = parseDeck(input);
      expect(result.cards[0].name).toBe('Galadriel, Light of Valinor');
    });
  });

  describe('commander handling', () => {
    it('excludes commander cards from the deck with a warning', () => {
      const input = 'Galadriel, Light of Valinor;LTC;498;commander';
      const result = parseDeck(input);
      expect(result.cards).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/Row 1/);
      expect(result.warnings[0]).toMatch(/commander/);
      expect(result.warnings[0]).toMatch(/Galadriel, Light of Valinor/);
    });

    it('handles commander alongside regular cards', () => {
      const input = [
        'Galadriel, Light of Valinor;LTC;498;commander',
        'Island;LTR;715;land',
        'Andúril, Flame of the West;LTR;687;nonland',
      ].join('\n');
      const result = parseDeck(input);
      expect(result.cards).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts Commander in any casing', () => {
      const input = 'Galadriel, Light of Valinor;LTC;498;COMMANDER';
      const result = parseDeck(input);
      expect(result.cards).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace from all fields', () => {
      const input = '  Island  ;  LTR  ;  715  ;  land  ';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards[0]).toEqual<Card>({
        name: 'Island',
        setCode: 'ltr',
        collectorNumber: '715',
        cardType: 'land',
      });
    });

    it('skips blank lines', () => {
      const input = '\nIsland;LTR;715;land\n\nMountain;LTR;718;land\n';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(2);
    });
  });

  describe('error cases', () => {
    it('reports an error for rows with fewer than 4 columns', () => {
      const input = 'Island;LTR;715';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.errors[0]).toMatch(/4/);
      expect(result.cards).toHaveLength(0);
    });

    it('reports an error for rows with empty card_name', () => {
      const input = ';LTR;715;land';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.errors[0]).toMatch(/card_name/);
    });

    it('reports an error for rows with empty set_code', () => {
      const input = 'Island;;715;land';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.errors[0]).toMatch(/set_code/);
    });

    it('reports an error for rows with empty collector_number', () => {
      const input = 'Island;LTR;;land';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.errors[0]).toMatch(/collector_number/);
    });

    it('reports a hard error for invalid card_type values', () => {
      const input = 'Lightning Bolt;m21;219;instant';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.errors[0]).toMatch(/invalid card_type/);
      expect(result.errors[0]).toMatch(/instant/);
      expect(result.cards).toHaveLength(0);
    });

    it('returns correct row number in error for multi-row input', () => {
      const input = [
        'Island;LTR;715;land',
        ';LTR;715;land',
      ].join('\n');
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 2/);
      expect(result.cards).toHaveLength(1);
    });

    it('collects multiple errors across rows', () => {
      const input = [
        'Island;LTR;715',
        ';LTR;715;land',
        'Mountain;;718;land',
        'Forest;LTR;;land',
        'Bolt;m21;219;sorcery',
      ].join('\n');
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(5);
      expect(result.cards).toHaveLength(0);
    });
  });

  describe('empty input', () => {
    it('returns empty results for empty string', () => {
      const result = parseDeck('');
      expect(result.cards).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns empty results for whitespace-only string', () => {
      const result = parseDeck('   \n   \n   ');
      expect(result.cards).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns empty results when only a header row is present', () => {
      const result = parseDeck('card_name;set_code;collector_number;card_type');
      expect(result.cards).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('schemas', () => {
    it('CardTypeEnum validates valid card types', () => {
      expect(CardTypeEnum.parse('land')).toBe('land');
      expect(CardTypeEnum.parse('nonland')).toBe('nonland');
      expect(CardTypeEnum.parse('commander')).toBe('commander');
    });

    it('CardTypeEnum rejects invalid card types', () => {
      expect(() => CardTypeEnum.parse('instant')).toThrow();
      expect(() => CardTypeEnum.parse('creature')).toThrow();
    });

    it('CardSchema validates a valid card object', () => {
      const card: Card = {
        name: 'Island',
        setCode: 'ltr',
        collectorNumber: '715',
        cardType: 'land',
      };
      expect(() => CardSchema.parse(card)).not.toThrow();
    });

    it('ParseResultSchema validates a valid parse result', () => {
      const result: ParseResult = {
        cards: [{ name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' }],
        warnings: [],
        errors: [],
      };
      expect(() => ParseResultSchema.parse(result)).not.toThrow();
    });
  });

  describe('Windows line endings', () => {
    it('handles \\r\\n line endings', () => {
      const input = 'Island;LTR;715;land\r\nMountain;LTR;718;land';
      const result = parseDeck(input);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(2);
    });
  });
});
