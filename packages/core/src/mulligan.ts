import type { Card } from './schemas/card.js';
import type { MulliganVerdict } from './schemas/mulligan.js';

export function countLands(hand: Card[]): number {
  return hand.filter((card) => card.cardType.toLowerCase().includes('land')).length;
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
