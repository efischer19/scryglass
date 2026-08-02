import type { Card, HiddenCard } from './schemas/card.js';
import { isCard } from './schemas/card.js';
import type { MulliganVerdict } from './schemas/mulligan.js';

export function countLands(hand: HiddenCard[]): number {
  // Filter to only actual cards, not hashes
  const cards = hand.filter(isCard);
  return cards.filter((card) => /\bland\b/i.test(card.cardType)).length;
}

export function getMulliganVerdict(
  landCount: number,
  settings: { allowMulliganWith2or5Lands: boolean },
): MulliganVerdict {
  if (landCount === 0 || landCount === 1 || landCount === 6 || landCount === 7) {
    return 'must_mulligan';
  }

  if (landCount === 2 || landCount === 5) {
    return settings.allowMulliganWith2or5Lands ? 'user_choice' : 'must_keep';
  }

  return 'must_keep';
}
