import { parseCsvRows } from './csv-rfc4180.js';
import type { ConvertResult, UnresolvedCard } from './convert-result.js';

/** Known Moxfield Board values that map to scryglass card_type. */
const BOARD_TO_CARD_TYPE: Record<string, string> = {
  mainboard: 'nonland',
  sideboard: 'nonland',
  commanders: 'commander',
  commander: 'commander',
  companions: 'nonland',
  companion: 'nonland',
  maybeboard: 'nonland',
};

/**
 * Converts a Moxfield CSV export string into scryglass
 * semicolon-delimited format.
 *
 * Handles:
 * - RFC 4180 CSV quoting (card names with commas)
 * - Column lookup by header name (resilient to Moxfield adding columns)
 * - Count expansion (one scryglass row per card copy)
 * - Optional `Board` column for card_type inference
 * - Missing collector numbers (produces a warning, flags for resolution)
 */
export function convertMoxfield(input: string): ConvertResult {
  const needsResolution: UnresolvedCard[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const trimmed = input.trim();
  if (trimmed === '') {
    return { output: '', needsResolution, warnings, errors };
  }

  const rows = parseCsvRows(trimmed);
  if (rows.length === 0) {
    return { output: '', needsResolution, warnings, errors };
  }

  // --- Locate columns by header name ---
  const headerRow = rows[0];
  const headerMap = new Map<string, number>();
  for (let c = 0; c < headerRow.length; c++) {
    headerMap.set(headerRow[c].trim().toLowerCase(), c);
  }

  // Required columns
  const nameIdx = headerMap.get('name');
  const editionIdx = headerMap.get('edition');
  const countIdx = headerMap.get('count');
  const collectorIdx = headerMap.get('collector number');

  if (nameIdx === undefined) {
    errors.push('Missing required CSV header: "Name"');
    return { output: '', needsResolution, warnings, errors };
  }
  if (editionIdx === undefined) {
    errors.push('Missing required CSV header: "Edition"');
    return { output: '', needsResolution, warnings, errors };
  }

  // Optional columns
  const boardIdx = headerMap.get('board');

  const outputLines: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 1; // 1-indexed, accounting for header

    const name = (row[nameIdx] ?? '').trim();
    if (!name) {
      errors.push(`Row ${rowNum}: empty Name field`);
      continue;
    }

    const edition = (row[editionIdx] ?? '').trim().toLowerCase();
    if (!edition) {
      errors.push(`Row ${rowNum}: empty Edition field`);
      continue;
    }

    // Count defaults to 1 when column is absent
    let count = 1;
    if (countIdx !== undefined) {
      const rawCount = (row[countIdx] ?? '').trim();
      if (rawCount !== '') {
        const parsed = parseInt(rawCount, 10);
        if (isNaN(parsed) || parsed < 1) {
          errors.push(`Row ${rowNum}: invalid Count "${rawCount}"`);
          continue;
        }
        count = parsed;
      }
    }

    // Collector number — warn if missing but still produce output
    let collectorNumber = '';
    if (collectorIdx !== undefined) {
      collectorNumber = (row[collectorIdx] ?? '').trim();
    }
    if (!collectorNumber) {
      warnings.push(
        `Row ${rowNum}: missing Collector Number for "${name}" — card will need manual resolution`,
      );
      needsResolution.push({
        name,
        setCode: edition,
        cardType: 'nonland',
        quantity: count,
        sourceLine: rowNum,
      });
    }

    // Determine card_type
    let cardType = 'nonland';
    if (boardIdx !== undefined) {
      const board = (row[boardIdx] ?? '').trim().toLowerCase();
      if (board && BOARD_TO_CARD_TYPE[board] !== undefined) {
        cardType = BOARD_TO_CARD_TYPE[board];
      } else if (board) {
        warnings.push(
          `Row ${rowNum}: unrecognized Board value "${(row[boardIdx] ?? '').trim()}" — defaulting to nonland`,
        );
      }
    }

    // Expand Count to produce one scryglass row per copy
    const line = `${name};${edition};${collectorNumber};${cardType}`;
    for (let i = 0; i < count; i++) {
      outputLines.push(line);
    }
  }

  return { output: outputLines.join('\n'), needsResolution, warnings, errors };
}
