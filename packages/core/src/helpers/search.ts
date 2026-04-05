import type { Card } from '../schemas/card.js';

/**
 * Search the library for cards whose name contains the query string
 * (case-insensitive partial match via String.includes).
 * Returns all matching cards, or the full library if query is empty.
 */
export function searchLibrary(library: Card[], query: string): Card[] {
  if (!query) return [...library];
  const lowerQuery = query.toLowerCase();
  return library.filter(card => card.name.toLowerCase().includes(lowerQuery));
}
