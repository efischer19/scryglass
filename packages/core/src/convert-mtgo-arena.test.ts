import { describe, expect, it } from 'vitest';
import { parseDeck } from './csv-parser.js';
import { convertMtgoArena } from './convert-mtgo-arena.js';
import { ConvertResultSchema } from './convert-result.js';

describe('convertMtgoArena', () => {
  describe('basic parsing', () => {
    it('parses MTGO/Arena quantity lines with set and collector number', () => {
      const input = '1 Lightning Bolt (M21) 219';
      const result = convertMtgoArena(input);

      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
      expect(result.needsResolution).toEqual([
        {
          name: 'Lightning Bolt',
          setCode: 'm21',
          collectorNumber: '219',
          cardType: 'nonland',
          quantity: 1,
          sourceLine: 1,
        },
      ]);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('section headers', () => {
    it('maps Commander section to commander card_type and Deck to nonland', () => {
      const input = [
        'Commander',
        '1 Galadriel, Light of Valinor (LTC) 498',
        '',
        'Deck',
        '4 Island (LTR) 715',
        '1 Andúril, Flame of the West (LTR) 687',
      ].join('\n');

      const result = convertMtgoArena(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.needsResolution).toHaveLength(0);

      const lines = result.output.split('\n');
      expect(lines).toHaveLength(6);
      expect(lines[0]).toBe('Galadriel, Light of Valinor;ltc;498;commander');
      expect(lines[1]).toBe('Island;ltr;715;nonland');
      expect(lines[2]).toBe('Island;ltr;715;nonland');
      expect(lines[3]).toBe('Island;ltr;715;nonland');
      expect(lines[4]).toBe('Island;ltr;715;nonland');
      expect(lines[5]).toBe('Andúril, Flame of the West;ltr;687;nonland');
    });

    it('handles Companion and Sideboard headers as nonland', () => {
      const input = [
        'Companion',
        '1 Lutri, the Spellchaser (IKO) 227',
        'Sideboard',
        '1 Negate (M21) 59',
      ].join('\n');

      const result = convertMtgoArena(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.output).toBe(
        [
          'Lutri, the Spellchaser;iko;227;nonland',
          'Negate;m21;59;nonland',
        ].join('\n'),
      );
    });
  });

  describe('quantity expansion', () => {
    it('expands quantity to one output row per card copy', () => {
      const input = ['Deck', '4 Island (LTR) 715'].join('\n');
      const result = convertMtgoArena(input);

      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(4);
      for (const line of lines) {
        expect(line).toBe('Island;ltr;715;nonland');
      }
    });
  });

  describe('missing set and collector data', () => {
    it('moves unresolved cards to needsResolution and omits them from output', () => {
      const input = ['Deck', '1 Lightning Bolt', '2 Island (LTR)'].join('\n');
      const result = convertMtgoArena(input);

      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('');
      expect(result.needsResolution).toEqual([
        {
          name: 'Lightning Bolt',
          cardType: 'nonland',
          quantity: 1,
          sourceLine: 2,
        },
        {
          name: 'Island',
          setCode: 'ltr',
          cardType: 'nonland',
          quantity: 2,
          sourceLine: 3,
        },
      ]);
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('handles split cards, double-faced cards, and extra whitespace', () => {
      const input = [
        ' Deck ',
        '1   Fire // Ice   (MH2)   200  ',
        '1 Valakut Awakening // Valakut Stoneforge (ZNR) 174',
      ].join('\n');

      const result = convertMtgoArena(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.output).toBe(
        [
          'Fire // Ice;mh2;200;nonland',
          'Valakut Awakening // Valakut Stoneforge;znr;174;nonland',
        ].join('\n'),
      );
    });
  });

  describe('empty input', () => {
    it('returns an empty ConvertResult for empty text', () => {
      const result = convertMtgoArena('   \n  ');
      expect(result).toEqual({
        output: '',
        needsResolution: [],
        warnings: [],
        errors: [],
      });
    });
  });

  describe('malformed lines', () => {
    it('reports malformed lines as errors and continues parsing', () => {
      const input = ['Deck', 'bad line', '1 Island (LTR) 715'].join('\n');
      const result = convertMtgoArena(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/could not parse line/);
      expect(result.output).toBe('Island;ltr;715;nonland');
    });
  });

  describe('integration with parseDeck', () => {
    it('produces output parseDeck accepts with zero errors for fully resolved cards', () => {
      const input = [
        'Commander',
        '1 Galadriel, Light of Valinor (LTC) 498',
        '',
        'Deck',
        '4 Island (LTR) 715',
        '1 Andúril, Flame of the West (LTR) 687',
      ].join('\n');

      const converted = convertMtgoArena(input);
      const parsed = parseDeck(converted.output);

      expect(converted.errors).toHaveLength(0);
      expect(converted.warnings).toHaveLength(0);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.cards).toHaveLength(5);
    });
  });

  describe('ConvertResult schema', () => {
    it('conforms to ConvertResultSchema', () => {
      const result = convertMtgoArena('Deck\n1 Island (LTR) 715');
      expect(() => ConvertResultSchema.parse(result)).not.toThrow();
    });
  });
});
