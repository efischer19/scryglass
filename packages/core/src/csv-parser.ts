import { z } from 'zod';
import { CardSchema } from './schemas/card.js';

export { CardSchema } from './schemas/card.js';
export type { Card } from './schemas/card.js';

export const ParseResultSchema = z.object({
  cards: z.array(CardSchema),
  errors: z.array(z.string()),
});

export type ParseResult = z.infer<typeof ParseResultSchema>;

export function parseCSV(csvString: string): ParseResult {
  const cards: z.infer<typeof CardSchema>[] = [];
  const errors: string[] = [];

  const lines = csvString.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line === '') continue;

    const columns = line.split(',');
    const rowNum = i + 1;

    // Skip header row (starts with 'card_name')
    if (columns[0].trim() === 'card_name') continue;

    // Reject rows with fewer than 3 columns
    if (columns.length < 3) {
      errors.push(`Row ${rowNum}: fewer than 3 columns`);
      continue;
    }

    const name = columns[0].trim();
    const setCode = columns[1].trim();
    const cardType = columns[2].trim();
    const manaCost = columns[3]?.trim() ?? '';

    // Validate required fields
    if (!name) {
      errors.push(`Row ${rowNum}: empty card_name`);
      continue;
    }

    if (!setCode) {
      errors.push(`Row ${rowNum}: empty set_code`);
      continue;
    }

    cards.push({ name, setCode, cardType, manaCost });
  }

  return { cards, errors };
}
