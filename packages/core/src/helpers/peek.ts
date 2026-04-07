import type { GameState, PlayerId } from '../schemas/state.js';
import type { Card } from '../schemas/card.js';

/**
 * Return the top N cards from a player's library without mutating state.
 *
 * Clamps `n` to `[0, library.length]` — returns an empty array when the
 * library is empty or `n` is zero/negative.
 */
export function peekTop(state: GameState, player: PlayerId, n: number): Card[] {
  const library = state.players[player].library;
  const clamped = Math.max(0, Math.min(n, library.length));
  return library.slice(0, clamped);
}
