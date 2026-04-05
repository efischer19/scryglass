import type { Card } from './schemas/card.js';

export type CardGroup = {
  card: Card;
  quantity: number;
};

function cardKey(card: Card): string {
  return `${card.name}\u0000${card.setCode}\u0000${card.collectorNumber}\u0000${card.cardType}`;
}

export function collapseCards(cards: Card[]): CardGroup[] {
  const groups: CardGroup[] = [];
  const byKey = new Map<string, CardGroup>();

  for (const card of cards) {
    const key = cardKey(card);
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += 1;
      continue;
    }

    const group: CardGroup = { card, quantity: 1 };
    byKey.set(key, group);
    groups.push(group);
  }

  return groups;
}

export function sortForExport(cards: Card[], commanders: Card[] = []): Card[] {
  return [
    ...commanders.map((card) => ({ ...card, cardType: 'commander' as const })),
    ...cards.filter((card) => card.cardType === 'nonland'),
    ...cards.filter((card) => card.cardType === 'land'),
  ];
}
