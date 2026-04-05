import type { CardType } from './schemas/card.js';
import type { ConvertResult, UnresolvedCard } from './convert-result.js';

/** MTGO/Arena section headers mapped to scryglass card_type values. */
const HEADER_TO_CARD_TYPE: Record<string, CardType> = {
  commander: 'commander',
  companion: 'nonland',
  deck: 'nonland',
  sideboard: 'nonland',
};

/**
 * Parses an MTGO/Arena quantity line:
 * `quantity name (SET) collector_number`
 * with optional `(SET)` and collector number suffixes.
 * Returns null when quantity or name cannot be parsed.
 */
function parseQuantityLine(rawLine: string): {
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
} | null {
  const line = rawLine.trim();
  let splitIndex = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ' ' || line[i] === '\t') {
      splitIndex = i;
      break;
    }
  }

  if (splitIndex <= 0) {
    return null;
  }

  const quantityToken = line.slice(0, splitIndex);
  for (const ch of quantityToken) {
    if (ch < '0' || ch > '9') {
      return null;
    }
  }

  const quantity = parseInt(quantityToken, 10);
  if (quantity < 1) {
    return null;
  }

  const remainder = line.slice(splitIndex + 1).trim();
  if (remainder === '') {
    return null;
  }

  const closeParen = remainder.lastIndexOf(')');
  if (closeParen !== -1) {
    const openParen = remainder.lastIndexOf('(', closeParen);
    if (openParen !== -1 && openParen < closeParen) {
      const name = remainder.slice(0, openParen).trim();
      const setCode = remainder.slice(openParen + 1, closeParen).trim().toLowerCase();
      const collectorNumber = remainder.slice(closeParen + 1).trim();

      if (name && setCode) {
        if (collectorNumber) {
          return {
            quantity,
            name,
            setCode,
            collectorNumber,
          };
        }

        return {
          quantity,
          name,
          setCode,
        };
      }
    }
  }

  return {
    quantity,
    name: remainder,
  };
}

/**
 * Converts MTGO/Arena plain-text deck lists into scryglass semicolon format.
 * Fully resolved rows are emitted to `output`; incomplete or review-needed rows
 * are added to `needsResolution`, with non-fatal details in `warnings`.
 */
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

    const setCode = parsed.setCode;
    const collectorNumber = parsed.collectorNumber;
    if (!setCode || !collectorNumber) {
      continue;
    }

    if (needsCardTypeReview) {
      warnings.push(
        `Row ${rowNum}: "${parsed.name}" has no section header; defaulted card_type to nonland and flagged for review`,
      );
    }

    const lineOut = `${parsed.name};${setCode};${collectorNumber};${currentCardType}`;
    for (let copy = 0; copy < parsed.quantity; copy++) {
      outputLines.push(lineOut);
    }
  }

  return { output: outputLines.join('\n'), needsResolution, warnings, errors };
}
