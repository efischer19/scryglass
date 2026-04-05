import type { Card } from '../schemas/card.js';

export const BASIC_LAND_TYPES = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'] as const;
export type BasicLandType = typeof BASIC_LAND_TYPES[number];

/**
 * Returns true if the card is a basic land of the specified subtype.
 *
 * A basic land is identified by `cardType === 'land'` and a name that
 * contains the land subtype (case-sensitive match on subtype).
 * This handles standard basics ("Mountain"), snow-covered variants
 * ("Snow-Covered Mountain"), and any other land whose name contains
 * the requested subtype.
 */
export function isBasicLandOfType(card: Card, landType: string): boolean {
  return card.cardType === 'land' && card.name.includes(landType);
}

/**
 * Returns a count of each basic land type present in the given library.
 * Uses the same matching logic as the FETCH_BASIC_LAND reducer action.
 *
 * @returns A record mapping each land type to the number of matching cards.
 *   Only land types with at least one copy present are included.
 */
export function getBasicLandCounts(library: Card[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const landType of BASIC_LAND_TYPES) {
    const count = library.filter(card => isBasicLandOfType(card, landType)).length;
    if (count > 0) {
      counts[landType] = count;
    }
  }
  return counts;
}
