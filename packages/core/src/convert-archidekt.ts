import type { ConvertResult } from './convert-result.js';

const TAG_TO_CARD_TYPE: Record<string, 'land' | 'nonland' | 'commander'> = {
  commander: 'commander',
  land: 'land',
  nonland: 'nonland',
};

type ParsedLine = {
  quantity: number;
  name: string;
  setCode: string;
  collectorNumber: string;
};

function parseQuantityPrefix(line: string): { quantity: number; rest: string } | null {
  let i = 0;
  while (i < line.length && line[i] >= '0' && line[i] <= '9') {
    i++;
  }
  if (i === 0) return null;

  const quantity = Number.parseInt(line.slice(0, i), 10);
  if (!Number.isInteger(quantity) || quantity < 1) return null;

  if (i >= line.length || line[i] !== ' ') return null;
  const rest = line.slice(i).trim();
  if (rest === '') return null;
  return { quantity, rest };
}

function parseNameSetAndTail(rest: string): { name: string; setCode: string; tail: string } | null {
  let openIdx = rest.indexOf('(');
  while (openIdx !== -1) {
    const closeIdx = rest.indexOf(')', openIdx + 1);
    if (closeIdx === -1) break;

    const name = rest.slice(0, openIdx).trim();
    const setCode = rest.slice(openIdx + 1, closeIdx).trim();
    const tail = rest.slice(closeIdx + 1).trim();

    if (name && setCode && !setCode.includes(' ') && tail) {
      return { name, setCode, tail };
    }

    openIdx = rest.indexOf('(', openIdx + 1);
  }

  return null;
}

function parseCollectorNumber(tail: string): string | null {
  const tokens = tail.split(/\s+/);
  const collectorNumber = tokens[0] ?? '';
  if (!collectorNumber) return null;
  return /\d/.test(collectorNumber) ? collectorNumber : null;
}

function extractBracketTags(line: string): string[] {
  const tags: string[] = [];
  let searchFrom = 0;

  while (searchFrom < line.length) {
    const openIdx = line.indexOf('[', searchFrom);
    if (openIdx === -1) break;
    const closeIdx = line.indexOf(']', openIdx + 1);
    if (closeIdx === -1) break;

    const tag = line.slice(openIdx + 1, closeIdx).trim();
    if (tag) tags.push(tag);

    searchFrom = closeIdx + 1;
  }

  return tags;
}

function parseArchidektLine(line: string): ParsedLine | null {
  const quantityPart = parseQuantityPrefix(line);
  if (!quantityPart) return null;

  const parsedNameSet = parseNameSetAndTail(quantityPart.rest);
  if (!parsedNameSet) return null;

  const collectorNumber = parseCollectorNumber(parsedNameSet.tail);
  if (!collectorNumber) return null;

  return {
    quantity: quantityPart.quantity,
    name: parsedNameSet.name,
    setCode: parsedNameSet.setCode.toLowerCase(),
    collectorNumber,
  };
}

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

    const parsedLine = parseArchidektLine(line);
    if (!parsedLine) {
      errors.push(
        `Row ${rowNum}: could not parse Archidekt row (expected "quantity card_name (SET) collector_number [tags]")`,
      );
      continue;
    }

    const { quantity, name, setCode, collectorNumber } = parsedLine;

    const tagMatches = extractBracketTags(line);
    let cardType: 'land' | 'nonland' | 'commander' = 'nonland';

    if (tagMatches.length > 0) {
      const normalizedTags = tagMatches.map((tag) => tag.toLowerCase());
      const matchedTag = normalizedTags.find((tag) => tag in TAG_TO_CARD_TYPE);
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
