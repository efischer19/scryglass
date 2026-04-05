import type { CardType } from './schemas/card.js';
import type { ConvertResult, UnresolvedCard } from './convert-result.js';

const HEADER_TO_CARD_TYPE: Record<string, CardType> = {
  commander: 'commander',
  companion: 'nonland',
  deck: 'nonland',
  sideboard: 'nonland',
};

function parseQuantityLine(rawLine: string): {
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
} | null {
  const qtyMatch = rawLine.match(/^(\d+)\s+(.+)$/);
  if (!qtyMatch) {
    return null;
  }

  const quantity = parseInt(qtyMatch[1], 10);
  if (isNaN(quantity) || quantity < 1) {
    return null;
  }

  const remainder = qtyMatch[2].trim();

  const withSetAndCollector = remainder.match(/^(.*)\s+\(([^)]+)\)\s+([^\s]+)\s*$/);
  if (withSetAndCollector) {
    return {
      quantity,
      name: withSetAndCollector[1].trim(),
      setCode: withSetAndCollector[2].trim().toLowerCase(),
      collectorNumber: withSetAndCollector[3].trim(),
    };
  }

  const withSetOnly = remainder.match(/^(.*)\s+\(([^)]+)\)\s*$/);
  if (withSetOnly) {
    return {
      quantity,
      name: withSetOnly[1].trim(),
      setCode: withSetOnly[2].trim().toLowerCase(),
    };
  }

  return {
    quantity,
    name: remainder,
  };
}

export function convertMtgoArena(input: string): ConvertResult {
  const needsResolution: UnresolvedCard[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const trimmed = input.trim();
  if (trimmed === '') {
    return { output: '', needsResolution, warnings, errors };
  }

  const lines = trimmed.split(/\r?\n/);
  const outputLines: string[] = [];
  let currentCardType: CardType = 'nonland';
  let seenSectionHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const rowNum = i + 1;

    if (line === '') continue;

    const lower = line.toLowerCase();
    if (HEADER_TO_CARD_TYPE[lower] !== undefined) {
      currentCardType = HEADER_TO_CARD_TYPE[lower];
      seenSectionHeader = true;
      continue;
    }

    const parsed = parseQuantityLine(line);
    if (parsed === null || parsed.name === '') {
      errors.push(`Row ${rowNum}: could not parse line "${line}"`);
      continue;
    }

    const missingSet = !parsed.setCode;
    const missingCollector = !parsed.collectorNumber;
    const needsCardTypeReview = !seenSectionHeader;

    if (missingSet || missingCollector || needsCardTypeReview) {
      needsResolution.push({
        name: parsed.name,
        setCode: parsed.setCode,
        collectorNumber: parsed.collectorNumber,
        cardType: currentCardType,
        quantity: parsed.quantity,
        sourceLine: rowNum,
      });
    }

    if (missingSet || missingCollector) {
      warnings.push(
        `Row ${rowNum}: "${parsed.name}" is missing ${
          missingSet && missingCollector
            ? 'set code and collector number'
            : missingSet
              ? 'set code'
              : 'collector number'
        } and needs resolution`,
      );
      continue;
    }

    if (needsCardTypeReview) {
      warnings.push(
        `Row ${rowNum}: "${parsed.name}" has no section header; defaulted card_type to nonland and flagged for review`,
      );
      continue;
    }

    const lineOut = `${parsed.name};${parsed.setCode};${parsed.collectorNumber};${currentCardType}`;
    for (let copy = 0; copy < parsed.quantity; copy++) {
      outputLines.push(lineOut);
    }
  }

  return { output: outputLines.join('\n'), needsResolution, warnings, errors };
}
