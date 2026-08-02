import type { Card, HiddenCard } from '../schemas/card.js';
import { isCard } from '../schemas/card.js';

export const BASIC_LAND_TYPES = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'] as const;
export type BasicLandType = typeof BASIC_LAND_TYPES[number];

/**
 * Returns true if the card is a basic land of the specified subtype.
 *
 * A basic land is identified by `cardType === 'land'` and a name that
 * contains the land subtype as a complete word (using word boundaries).
 * This handles standard basics ("Mountain"), snow-covered variants
 * ("Snow-Covered Mountain"), and any other land whose name contains
 * the requested subtype as a distinct word.
 */
export function isBasicLandOfType(card: Card, landType: string): boolean {
  if (card.cardType !== 'land') return false;
  const wordBoundaryRegex = new RegExp(`\\b${landType}\\b`);
  return wordBoundaryRegex.test(card.name);
}

/**
 * Returns a count of each basic land type present in the given library.
 * Uses the same matching logic as the FETCH_BASIC_LAND reducer action.
 *
 * @returns A record mapping each land type to the number of matching cards.
 *   Only land types with at least one copy present are included.
 */
export function getBasicLandCounts(library: HiddenCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  // Filter to only actual cards, not hashes
  const cards = library.filter(isCard);
  for (const landType of BASIC_LAND_TYPES) {
    const count = cards.filter(card => isBasicLandOfType(card, landType)).length;
    if (count > 0) {
      counts[landType] = count;
    }
  }
  return counts;
}
