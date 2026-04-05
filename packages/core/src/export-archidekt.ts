import type { Card } from './schemas/card.js';
import { collapseCards, sortForExport } from './export-utils.js';

function categoryFor(cardType: Card['cardType']): string {
  if (cardType === 'commander') return 'Commander';
  if (cardType === 'land') return 'Land';
  return 'Nonland';
}

export function exportArchidekt(cards: Card[], commanders: Card[] = []): string {
  const all = sortForExport(cards, commanders);
  const groups = collapseCards(all);

  return groups
    .map(
      ({ card, quantity }) =>
        `${quantity} ${card.name} (${card.setCode.toUpperCase()}) ${card.collectorNumber} [${categoryFor(card.cardType)}]`,
    )
    .join('\n');
}
