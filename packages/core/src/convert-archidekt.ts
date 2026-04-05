import type { ConvertResult } from './convert-result.js';

const TAG_TO_CARD_TYPE: Record<string, 'land' | 'nonland' | 'commander'> = {
  commander: 'commander',
  land: 'land',
  nonland: 'nonland',
};

/**
 * Converts an Archidekt text export into scryglass semicolon-delimited format.
 *
 * Archidekt line format:
 *   quantity card_name (SET) collector_number [tags]
 *
 * Example:
 *   1 Galadriel, Light of Valinor (LTC) 498 *F* [Commander]
 */
export function convertArchidekt(input: string): ConvertResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const trimmed = input.trim();
  if (trimmed === '') {
    return { output: '', warnings, errors };
  }

  const outputLines: string[] = [];
  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const rowNum = i + 1;

    if (line === '') continue;

    const match = line.match(/^(\d+)\s+(.+?)\s+\(([^)]+)\)\s+([^\s\[\]]+)(?:\s+.*)?$/);
    if (!match) {
      errors.push(
        `Row ${rowNum}: could not parse Archidekt row (expected "quantity card_name (SET) collector_number [tags]")`,
      );
      continue;
    }

    const quantity = Number.parseInt(match[1], 10);
    const name = match[2].trim();
    const setCode = match[3].trim().toLowerCase();
    const collectorNumber = match[4].trim();

    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.push(`Row ${rowNum}: invalid quantity "${match[1]}"`);
      continue;
    }
    if (!name) {
      errors.push(`Row ${rowNum}: empty card_name`);
      continue;
    }
    if (!setCode) {
      errors.push(`Row ${rowNum}: empty set_code`);
      continue;
    }
    if (!collectorNumber) {
      errors.push(`Row ${rowNum}: empty collector_number`);
      continue;
    }

    const tagMatches = [...line.matchAll(/\[([^\]]+)\]/g)];
    let cardType: 'land' | 'nonland' | 'commander' = 'nonland';

    if (tagMatches.length > 0) {
      const normalizedTags = tagMatches.map((m) => m[1].trim().toLowerCase());
      const matchedTag = normalizedTags.find((tag) => TAG_TO_CARD_TYPE[tag] !== undefined);
      if (matchedTag) {
        cardType = TAG_TO_CARD_TYPE[matchedTag];
      } else {
        cardType = 'nonland';
      }
    } else {
      warnings.push(
        `Row ${rowNum}: missing category tag for "${name}" — defaulting to nonland (card_type may need manual resolution)`,
      );
    }

    const outputLine = `${name};${setCode};${collectorNumber};${cardType}`;
    for (let copy = 0; copy < quantity; copy++) {
      outputLines.push(outputLine);
    }
  }

  return { output: outputLines.join('\n'), warnings, errors };
}
