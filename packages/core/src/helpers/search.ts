import type { Card, HiddenCard } from '../schemas/card.js';
import { isCard } from '../schemas/card.js';

/**
 * Search the library for cards whose name contains the query string
 * (case-insensitive partial match via String.includes).
 * Returns all matching cards, or the full library if query is empty.
 * Hashed cards (from remote mode) are excluded from results.
 */
export function searchLibrary(library: HiddenCard[], query: string): Card[] {
  // Filter to only actual cards, not hashes
  const cards = library.filter(isCard);
  if (!query) return [...cards];
  const lowerQuery = query.toLowerCase();
  return cards.filter(card => card.name.toLowerCase().includes(lowerQuery));
}
