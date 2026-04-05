import type { Card } from './schemas/card.js';
import { sortForExport } from './export-utils.js';

export function exportScryglass(cards: Card[], commanders: Card[] = []): string {
  return sortForExport(cards, commanders)
    .map((card) => `${card.name};${card.setCode};${card.collectorNumber};${card.cardType}`)
    .join('\n');
}
