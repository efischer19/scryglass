import { describe, it, expect } from 'vitest';
import { convertArchidekt } from './convert-archidekt.js';
import { parseDeck } from './csv-parser.js';
import { ConvertResultSchema } from './convert-result.js';

describe('convertArchidekt', () => {
  describe('basic parsing', () => {
    it('converts a simple Archidekt text row', () => {
      const input = '1 Lightning Bolt (M21) 219 [Nonland]';
      const result = convertArchidekt(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('converts multiple rows', () => {
      const input = [
        '1 Lightning Bolt (M21) 219 [Nonland]',
        '1 Island (LTR) 715 [Land]',
      ].join('\n');
      const result = convertArchidekt(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output.split('\n')).toEqual([
        'Lightning Bolt;m21;219;nonland',
        'Island;ltr;715;land',
      ]);
    });
  });

  describe('category tag mapping', () => {
    it('maps [Commander] to commander', () => {
      const result = convertArchidekt('1 Galadriel, Light of Valinor (LTC) 498 [Commander]');
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Galadriel, Light of Valinor;ltc;498;commander');
    });

    it('maps [Land] to land', () => {
      const result = convertArchidekt('1 Island (LTR) 715 [Land]');
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Island;ltr;715;land');
    });

    it('maps [Nonland] to nonland', () => {
      const result = convertArchidekt('1 Andúril, Flame of the West (LTR) 687 [Nonland]');
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Andúril, Flame of the West;ltr;687;nonland');
    });

    it('defaults unknown tags to nonland', () => {
      const result = convertArchidekt('1 Sol Ring (CMR) 472 [Artifact]');
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Sol Ring;cmr;472;nonland');
    });
  });

  describe('foil markers and inline metadata', () => {
    it('ignores *F* foil marker between collector number and tags', () => {
      const result = convertArchidekt('1 Galadriel, Light of Valinor (LTC) 498 *F* [Commander]');
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Galadriel, Light of Valinor;ltc;498;commander');
    });

    it('ignores *Foil* metadata marker', () => {
      const result = convertArchidekt('1 Island (LTR) 715 *Foil* [Land]');
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Island;ltr;715;land');
    });
  });

  describe('card names with commas', () => {
    it('parses card names containing commas correctly', () => {
      const result = convertArchidekt('1 Galadriel, Light of Valinor (LTC) 498 [Commander]');
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Galadriel, Light of Valinor;ltc;498;commander');
    });
  });

  describe('missing category tags', () => {
    it('flags missing tags with warning and defaults to nonland', () => {
      const result = convertArchidekt('1 Sol Ring (CMR) 472');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/Row 1: missing category tag/);
      expect(result.needsResolution).toEqual([
        {
          name: 'Sol Ring',
          setCode: 'cmr',
          collectorNumber: '472',
          cardType: 'nonland',
          quantity: 1,
          sourceLine: 1,
        },
      ]);
      expect(result.output).toBe('Sol Ring;cmr;472;nonland');
    });
  });

  describe('quantity expansion', () => {
    it('expands quantity into one output row per copy', () => {
      const result = convertArchidekt('4 Island (LTR) 715 [Land]');
      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines.every((line) => line === 'Island;ltr;715;land')).toBe(true);
    });
  });

  describe('empty input', () => {
    it('returns empty output and no diagnostics for empty string', () => {
      const result = convertArchidekt('');
      expect(result).toEqual({ output: '', needsResolution: [], warnings: [], errors: [] });
    });

    it('returns empty output and no diagnostics for whitespace-only input', () => {
      const result = convertArchidekt('   \n   ');
      expect(result).toEqual({ output: '', needsResolution: [], warnings: [], errors: [] });
    });
  });

  describe('malformed lines', () => {
    it('reports malformed rows with row number', () => {
      const input = [
        '1 Lightning Bolt M21 219 [Nonland]',
        '1 Island (LTR) 715 [Land]',
      ].join('\n');
      const result = convertArchidekt(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 1: could not parse Archidekt row/);
      expect(result.output).toBe('Island;ltr;715;land');
    });

    it('continues processing after malformed rows', () => {
      const input = [
        'not a valid line',
        '1 Lightning Bolt (M21) 219 [Nonland]',
      ].join('\n');
      const result = convertArchidekt(input);
      expect(result.errors).toHaveLength(1);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });
  });

  describe('integration with parseDeck', () => {
    it('produces output parseDeck accepts with zero errors for fully resolved cards', () => {
      const input = [
        '4 Island (LTR) 715 [Land]',
        '2 Andúril, Flame of the West (LTR) 687 [Nonland]',
        '1 Galadriel, Light of Valinor (LTC) 498 [Commander]',
      ].join('\n');
      const convertResult = convertArchidekt(input);
      expect(convertResult.errors).toHaveLength(0);

      const parseResult = parseDeck(convertResult.output);
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.cards).toHaveLength(6); // parseDeck excludes commander: 6 non-commander cards from 7 converted rows
      expect(parseResult.warnings).toHaveLength(1); // commander warning
    });
  });

  describe('ConvertResult schema', () => {
    it('result conforms to ConvertResultSchema', () => {
      const result = convertArchidekt('1 Lightning Bolt (M21) 219 [Nonland]');
      expect(() => ConvertResultSchema.parse(result)).not.toThrow();
    });
  });
});
