import { z } from 'zod';
import { CardSchema, CardTypeEnum } from './schemas/card.js';
import type { CardType } from './schemas/card.js';

export { CardSchema, CardTypeEnum } from './schemas/card.js';
export type { Card, CardType } from './schemas/card.js';

export const ParseResultSchema = z.object({
  cards: z.array(CardSchema),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

export type ParseResult = z.infer<typeof ParseResultSchema>;

const VALID_CARD_TYPES = new Set<string>(CardTypeEnum.options);

export function parseDeck(input: string): ParseResult {
  const cards: z.infer<typeof CardSchema>[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const lines = input.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const rowNum = i + 1;

    // Skip empty lines
    if (line === '') continue;

    const columns = line.split(';');

    // Skip header row (starts with 'card_name', case-insensitive)
    if (columns[0].trim().toLowerCase() === 'card_name') continue;

    // Reject rows with fewer than 4 columns
    if (columns.length < 4) {
      errors.push(`Row ${rowNum}: expected 4 semicolon-separated columns, found ${columns.length}`);
      continue;
    }

    const name = columns[0].trim();
    const setCode = columns[1].trim().toLowerCase();
    const collectorNumber = columns[2].trim();
    const rawCardType = columns[3].trim().toLowerCase();

    // Validate required fields
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

    // Validate card_type enum
    if (!VALID_CARD_TYPES.has(rawCardType)) {
      errors.push(`Row ${rowNum}: invalid card_type "${columns[3].trim()}" (must be land, nonland, or commander)`);
      continue;
    }

    const cardType = rawCardType as CardType;

    // Commander cards are recognized but excluded from shuffleable deck
    if (cardType === 'commander') {
      warnings.push(`Row ${rowNum}: commander "${name}" recognized but excluded from shuffleable deck`);
      continue;
    }

    cards.push({ name, setCode, collectorNumber, cardType });
  }

  return { cards, warnings, errors };
}
