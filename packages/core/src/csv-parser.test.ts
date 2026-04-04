import { describe, it, expect } from 'vitest';
import { parseCSV, CardSchema, ParseResultSchema } from './csv-parser.js';
import type { Card, ParseResult } from './csv-parser.js';

describe('parseCSV', () => {
  describe('valid input', () => {
    it('parses a single card row', () => {
      const csv = 'Lightning Bolt,m21,Instant,{R}';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0]).toEqual<Card>({
        name: 'Lightning Bolt',
        setCode: 'm21',
        cardType: 'Instant',
        manaCost: '{R}',
      });
    });

    it('parses multiple card rows', () => {
      const csv = [
        'Lightning Bolt,m21,Instant,{R}',
        'Mountain,m21,Basic Land — Mountain,',
        'Counterspell,2ed,Instant,{U}{U}',
      ].join('\n');
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(3);
    });

    it('skips header row starting with card_name', () => {
      const csv = [
        'card_name,set_code,card_type,mana_cost',
        'Lightning Bolt,m21,Instant,{R}',
      ].join('\n');
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Lightning Bolt');
    });

    it('processes correctly when no header row is present', () => {
      const csv = 'Lightning Bolt,m21,Instant,{R}';
      const result = parseCSV(csv);
      expect(result.cards).toHaveLength(1);
    });
  });

  describe('mana_cost optional field', () => {
    it('defaults mana_cost to empty string when missing', () => {
      const csv = 'Mountain,m21,Basic Land — Mountain';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.cards[0].manaCost).toBe('');
    });

    it('defaults mana_cost to empty string when column is empty', () => {
      const csv = 'Mountain,m21,Basic Land — Mountain,';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.cards[0].manaCost).toBe('');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace from all fields', () => {
      const csv = '  Lightning Bolt  ,  m21  ,  Instant  ,  {R}  ';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.cards[0]).toEqual<Card>({
        name: 'Lightning Bolt',
        setCode: 'm21',
        cardType: 'Instant',
        manaCost: '{R}',
      });
    });

    it('skips blank lines', () => {
      const csv = '\nLightning Bolt,m21,Instant,{R}\n\nMountain,m21,Basic Land — Mountain\n';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(2);
    });
  });

  describe('error cases', () => {
    it('reports an error for rows with fewer than 3 columns', () => {
      const csv = 'Lightning Bolt,m21';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.cards).toHaveLength(0);
    });

    it('reports an error for rows with empty card_name', () => {
      const csv = ',m21,Instant,{R}';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.errors[0]).toMatch(/card_name/);
    });

    it('reports an error for rows with empty set_code', () => {
      const csv = 'Lightning Bolt,,Instant,{R}';
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1/);
      expect(result.errors[0]).toMatch(/set_code/);
    });

    it('returns correct row number in error for multi-row CSV', () => {
      const csv = [
        'Lightning Bolt,m21,Instant,{R}',
        ',m21,Instant,{R}',
      ].join('\n');
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 2/);
      expect(result.cards).toHaveLength(1);
    });

    it('collects multiple errors across rows', () => {
      const csv = [
        'Lightning Bolt,m21',
        ',m21,Instant,{R}',
        'Mountain,,Basic Land — Mountain',
      ].join('\n');
      const result = parseCSV(csv);
      expect(result.errors).toHaveLength(3);
      expect(result.cards).toHaveLength(0);
    });
  });

  describe('empty input', () => {
    it('returns empty cards and no errors for empty string', () => {
      const result = parseCSV('');
      expect(result.cards).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns empty cards and no errors for whitespace-only string', () => {
      const result = parseCSV('   \n   \n   ');
      expect(result.cards).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns empty cards when only a header row is present', () => {
      const result = parseCSV('card_name,set_code,card_type,mana_cost');
      expect(result.cards).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('schemas', () => {
    it('CardSchema validates a valid card object', () => {
      const card = { name: 'Lightning Bolt', setCode: 'm21', cardType: 'Instant', manaCost: '{R}' };
      expect(() => CardSchema.parse(card)).not.toThrow();
    });

    it('ParseResultSchema validates a valid parse result', () => {
      const result: ParseResult = {
        cards: [{ name: 'Lightning Bolt', setCode: 'm21', cardType: 'Instant', manaCost: '{R}' }],
        errors: [],
      };
      expect(() => ParseResultSchema.parse(result)).not.toThrow();
    });
  });
});
