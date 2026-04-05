import type { Card } from './schemas/card.js';
import { collapseCards, sortForExport } from './export-utils.js';

function formatLine(quantity: number, card: Card): string {
  return `${quantity} ${card.name} (${card.setCode.toUpperCase()}) ${card.collectorNumber}`;
}

export function exportMtgoArena(cards: Card[], commanders: Card[] = []): string {
  const commanderGroups = collapseCards(
    commanders.map((card) => ({ ...card, cardType: 'commander' as const })),
  );
  const deckGroups = collapseCards(sortForExport(cards));

  const lines: string[] = [];

  if (commanderGroups.length > 0) {
    lines.push('Commander');
    for (const group of commanderGroups) {
      lines.push(formatLine(group.quantity, group.card));
    }
    lines.push('Deck');
  }

  for (const group of deckGroups) {
    lines.push(formatLine(group.quantity, group.card));
  }

  return lines.join('\n');
}
