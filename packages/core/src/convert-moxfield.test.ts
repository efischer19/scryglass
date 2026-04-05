import { describe, it, expect } from 'vitest';
import { convertMoxfield } from './convert-moxfield.js';
import { parseDeck } from './csv-parser.js';
import { ConvertResultSchema } from './convert-result.js';

describe('convertMoxfield', () => {
  describe('basic parsing', () => {
    it('converts a simple Moxfield CSV row', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,Lightning Bolt,M21,Near Mint,en,,,,219,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('converts multiple rows', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,Lightning Bolt,M21,Near Mint,en,,,,219,false,false,',
        '1,0,Island,LTR,Near Mint,en,,,,715,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('Lightning Bolt;m21;219;nonland');
      expect(lines[1]).toBe('Island;ltr;715;nonland');
    });
  });

  describe('CSV quoting with commas', () => {
    it('handles double-quoted card names containing commas', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,"Galadriel, Light of Valinor",LTC,Near Mint,en,,,,498,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Galadriel, Light of Valinor;ltc;498;nonland');
    });

    it('handles multiple quoted card names', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,"Galadriel, Light of Valinor",LTC,Near Mint,en,,,,498,false,false,',
        '1,0,"Andúril, Flame of the West",LTR,Near Mint,en,,,,687,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('Galadriel, Light of Valinor');
      expect(lines[1]).toContain('Andúril, Flame of the West');
    });

    it('handles card names with escaped double-quotes', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,"Some ""Quoted"" Card",TST,Near Mint,en,,,,1,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Some "Quoted" Card;tst;1;nonland');
    });
  });

  describe('Count expansion', () => {
    it('expands Count to produce one row per card copy', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '4,0,Island,LTR,Near Mint,en,,,,715,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(4);
      for (const line of lines) {
        expect(line).toBe('Island;ltr;715;nonland');
      }
    });

    it('handles different counts for different cards', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '4,0,Island,LTR,Near Mint,en,,,,715,false,false,',
        '2,0,Mountain,LTR,Near Mint,en,,,,718,false,false,',
        '1,0,Lightning Bolt,M21,Near Mint,en,,,,219,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(7); // 4 + 2 + 1
    });

    it('defaults Count to 1 when column is missing', () => {
      const input = [
        'Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '0,Lightning Bolt,M21,Near Mint,en,,,,219,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(1);
    });
  });

  describe('missing collector numbers', () => {
    it('produces a warning for missing Collector Number', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,Unknown Card,TST,Near Mint,en,,,,,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/missing Collector Number/);
      expect(result.warnings[0]).toMatch(/Unknown Card/);
      // Still produces output line
      expect(result.output).toBe('Unknown Card;tst;;nonland');
    });

    it('produces a warning when Collector Number column is absent', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified',
        '1,0,Lightning Bolt,M21,Near Mint,en,,,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/missing Collector Number/);
    });
  });

  describe('header column reordering', () => {
    it('locates columns by name regardless of position', () => {
      const input = [
        'Edition,Name,Collector Number,Count,Foil',
        'M21,Lightning Bolt,219,1,false',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('handles extra unknown columns gracefully', () => {
      const input = [
        'Count,Name,Edition,Collector Number,FutureColumn1,FutureColumn2',
        '1,Lightning Bolt,M21,219,value1,value2',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });
  });

  describe('empty input', () => {
    it('returns empty result for empty string', () => {
      const result = convertMoxfield('');
      expect(result.output).toBe('');
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns empty result for whitespace-only string', () => {
      const result = convertMoxfield('   \n   \n   ');
      expect(result.output).toBe('');
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns empty result for header-only input', () => {
      const input =
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price';
      const result = convertMoxfield(input);
      expect(result.output).toBe('');
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('malformed rows', () => {
    it('reports error for missing Name header', () => {
      const input = [
        'Count,Edition,Collector Number',
        '1,M21,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Missing required CSV header.*Name/);
    });

    it('reports error for missing Edition header', () => {
      const input = [
        'Count,Name,Collector Number',
        '1,Lightning Bolt,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Missing required CSV header.*Edition/);
    });

    it('reports error for empty Name field in a row', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        '1,,M21,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/empty Name/);
    });

    it('reports error for empty Edition field in a row', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        '1,Lightning Bolt,,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/empty Edition/);
    });

    it('reports error for invalid Count value', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        'abc,Lightning Bolt,M21,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/invalid Count/);
    });

    it('reports error for zero Count', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        '0,Lightning Bolt,M21,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/invalid Count/);
    });

    it('continues processing after malformed rows', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        '1,,M21,219',
        '1,Lightning Bolt,M21,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(1);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });
  });

  describe('Board column handling', () => {
    it('maps mainboard to nonland', () => {
      const input = [
        'Count,Name,Edition,Collector Number,Board',
        '1,Lightning Bolt,M21,219,mainboard',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('maps commanders to commander card_type', () => {
      const input = [
        'Count,Name,Edition,Collector Number,Board',
        '1,Galadriel,LTC,498,commanders',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Galadriel;ltc;498;commander');
    });

    it('maps sideboard to nonland', () => {
      const input = [
        'Count,Name,Edition,Collector Number,Board',
        '1,Lightning Bolt,M21,219,sideboard',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('warns on unrecognized board value and defaults to nonland', () => {
      const input = [
        'Count,Name,Edition,Collector Number,Board',
        '1,Lightning Bolt,M21,219,unknown_board',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/unrecognized Board/);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('defaults to nonland when no Board column exists', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        '1,Lightning Bolt,M21,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('handles Board column case-insensitively', () => {
      const input = [
        'Count,Name,Edition,Collector Number,Board',
        '1,Galadriel,LTC,498,Commanders',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Galadriel;ltc;498;commander');
    });
  });

  describe('foil and alternate printing handling', () => {
    it('ignores Foil column — foil cards are converted normally', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,Lightning Bolt,M21,Near Mint,en,foil,,,219,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Lightning Bolt;m21;219;nonland');
    });

    it('handles alternate collector numbers (art variants)', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        '1,Island,LTR,715a',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toBe('Island;ltr;715a;nonland');
    });
  });

  describe('Windows line endings', () => {
    it('handles CRLF line endings', () => {
      const input =
        'Count,Name,Edition,Collector Number\r\n1,Lightning Bolt,M21,219\r\n1,Island,LTR,715';
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(2);
    });
  });

  describe('integration with parseDeck', () => {
    it('output passes parseDeck with zero errors for fully resolved cards', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '4,0,Island,LTR,Near Mint,en,,,,715,false,false,',
        '1,0,"Galadriel, Light of Valinor",LTC,Near Mint,en,,,,498,false,false,',
        '2,0,"Andúril, Flame of the West",LTR,Near Mint,en,,,,687,false,false,',
      ].join('\n');
      const convertResult = convertMoxfield(input);
      expect(convertResult.errors).toHaveLength(0);

      const parseResult = parseDeck(convertResult.output);
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.cards).toHaveLength(7); // 4 + 1 + 2
    });

    it('output with Board column passes parseDeck correctly', () => {
      const input = [
        'Count,Name,Edition,Collector Number,Board',
        '1,Galadriel,LTC,498,commanders',
        '4,Island,LTR,715,mainboard',
        '1,Lightning Bolt,M21,219,sideboard',
      ].join('\n');
      const convertResult = convertMoxfield(input);
      expect(convertResult.errors).toHaveLength(0);

      const parseResult = parseDeck(convertResult.output);
      // Commander rows are parsed but excluded with a warning by parseDeck
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.cards).toHaveLength(5); // 4 Islands + 1 Bolt (commander excluded)
      expect(parseResult.warnings).toHaveLength(1); // commander warning
    });
  });

  describe('ConvertResult schema', () => {
    it('output conforms to ConvertResultSchema', () => {
      const input = [
        'Count,Name,Edition,Collector Number',
        '1,Lightning Bolt,M21,219',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(() => ConvertResultSchema.parse(result)).not.toThrow();
    });

    it('error result conforms to ConvertResultSchema', () => {
      const result = convertMoxfield('');
      expect(() => ConvertResultSchema.parse(result)).not.toThrow();
    });
  });

  describe('realistic Moxfield export', () => {
    it('converts a realistic multi-card Moxfield CSV export', () => {
      const input = [
        'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price',
        '1,0,"Galadriel, Light of Valinor",LTC,Near Mint,en,,,,498,false,false,',
        '4,0,Island,LTR,Near Mint,en,,,,715,false,false,',
        '4,0,Mountain,LTR,Near Mint,en,,,,718,false,false,',
        '2,0,"Andúril, Flame of the West",LTR,Near Mint,en,,,,687,false,false,',
        '1,0,Sol Ring,CMR,Near Mint,en,,,,472,false,false,',
      ].join('\n');
      const result = convertMoxfield(input);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      const lines = result.output.split('\n');
      expect(lines).toHaveLength(12); // 1 + 4 + 4 + 2 + 1

      // Verify the output roundtrips through parseDeck
      const parseResult = parseDeck(result.output);
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.cards).toHaveLength(12);
    });
  });
});
