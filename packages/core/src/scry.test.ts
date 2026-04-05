import { describe, it, expect } from 'vitest';
import { peekTop } from './helpers/peek.js';
import { createInitialState, dispatch } from './reducer.js';
import type { GameState } from './schemas/state.js';
import type { Card } from './schemas/card.js';
import { ScryDecisionSchema } from './schemas/action.js';

function makeCard(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'nonland' };
}

function makeCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => makeCard(`Card ${i + 1}`));
}

/** Load deck, deal hand, keep hand → playing phase with known library */
function playingStateWithLibrary(player: 'A' | 'B', cards: Card[]): GameState {
  let state = createInitialState();
  state = dispatch(state, { type: 'LOAD_DECK', payload: { player, cards } }).state;
  state = dispatch(state, { type: 'DEAL_OPENING_HAND', payload: { player } }).state;
  state = dispatch(state, { type: 'KEEP_HAND', payload: { player } }).state;
  return state;
}

// ---------------------------------------------------------------------------
// peekTop
// ---------------------------------------------------------------------------
describe('peekTop', () => {
  it('returns the top N cards without mutating state', () => {
    const cards = makeCards(10);
    const state = playingStateWithLibrary('A', cards);
    const original = JSON.parse(JSON.stringify(state));

    const peeked = peekTop(state, 'A', 3);
    expect(peeked).toHaveLength(3);
    expect(peeked).toEqual(state.players.A.library.slice(0, 3));
    expect(state).toEqual(original);
  });

  it('returns the full library when N > library.length', () => {
    const cards = makeCards(5);
    const state = playingStateWithLibrary('A', cards);
    const library = state.players.A.library;

    const peeked = peekTop(state, 'A', 100);
    expect(peeked).toHaveLength(library.length);
    expect(peeked).toEqual(library);
  });

  it('returns an empty array when the library is empty', () => {
    const state = playingStateWithLibrary('A', []);
    expect(peekTop(state, 'A', 5)).toEqual([]);
  });

  it('returns an empty array when n is 0', () => {
    const cards = makeCards(5);
    const state = playingStateWithLibrary('A', cards);
    expect(peekTop(state, 'A', 0)).toEqual([]);
  });

  it('clamps negative n to 0', () => {
    const cards = makeCards(5);
    const state = playingStateWithLibrary('A', cards);
    expect(peekTop(state, 'A', -3)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ScryDecisionSchema validation
// ---------------------------------------------------------------------------
describe('ScryDecisionSchema', () => {
  it('validates a correct decision object', () => {
    const result = ScryDecisionSchema.safeParse({ cardIndex: 0, destination: 'top' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid destination', () => {
    const result = ScryDecisionSchema.safeParse({ cardIndex: 0, destination: 'nowhere' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing cardIndex', () => {
    const result = ScryDecisionSchema.safeParse({ destination: 'top' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric cardIndex', () => {
    const result = ScryDecisionSchema.safeParse({ cardIndex: 'abc', destination: 'top' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SCRY_RESOLVE
// ---------------------------------------------------------------------------
describe('dispatch — SCRY_RESOLVE', () => {
  it('keeps "top" cards at the top of the library in specified order', () => {
    const cards = makeCards(10);
    const state = playingStateWithLibrary('A', cards);
    // Library after dealing 7 = cards[7], cards[8], cards[9]
    const library = state.players.A.library;
    expect(library).toHaveLength(3);

    const result = dispatch(state, {
      type: 'SCRY_RESOLVE',
      payload: {
        player: 'A',
        decisions: [
          { cardIndex: 1, destination: 'top' },
          { cardIndex: 0, destination: 'top' },
        ],
      },
    });

    // Top cards should be in decisions order: [1] then [0], then remaining
    const newLib = result.state.players.A.library;
    expect(newLib[0]).toEqual(library[1]);
    expect(newLib[1]).toEqual(library[0]);
    expect(newLib[2]).toEqual(library[2]); // unaffected card stays
    expect(result.card).toBeNull();
  });

  it('moves "bottom" cards to the end in original relative order', () => {
    const cards = makeCards(15);
    const state = playingStateWithLibrary('A', cards);
    const library = state.players.A.library;
    // library[0..7] — 8 cards after dealing 7

    const result = dispatch(state, {
      type: 'SCRY_RESOLVE',
      payload: {
        player: 'A',
        decisions: [
          { cardIndex: 2, destination: 'bottom' },
          { cardIndex: 0, destination: 'bottom' },
        ],
      },
    });

    const newLib = result.state.players.A.library;
    // Bottom cards should be in original index order: [0] then [2]
    expect(newLib[newLib.length - 2]).toEqual(library[0]);
    expect(newLib[newLib.length - 1]).toEqual(library[2]);
    // Library size should not change (no removes)
    expect(newLib).toHaveLength(library.length);
    expect(result.card).toBeNull();
  });

  it('removes cards from the library and returns them', () => {
    const cards = makeCards(15);
    const state = playingStateWithLibrary('A', cards);
    const library = state.players.A.library;

    const result = dispatch(state, {
      type: 'SCRY_RESOLVE',
      payload: {
        player: 'A',
        decisions: [
          { cardIndex: 0, destination: 'remove' },
          { cardIndex: 1, destination: 'remove' },
        ],
      },
    });

    // Library should be smaller by 2
    expect(result.state.players.A.library).toHaveLength(library.length - 2);
    // cards field returns removed cards
    expect(result.cards).toHaveLength(2);
    expect(result.cards![0]).toEqual(library[0]);
    expect(result.cards![1]).toEqual(library[1]);
    // card returns first removed card for backward compat
    expect(result.card).toEqual(library[0]);
  });

  it('handles mixed decisions (top + bottom + remove) in one operation', () => {
    const cards = makeCards(15);
    const state = playingStateWithLibrary('A', cards);
    const library = state.players.A.library;

    const result = dispatch(state, {
      type: 'SCRY_RESOLVE',
      payload: {
        player: 'A',
        decisions: [
          { cardIndex: 0, destination: 'top' },
          { cardIndex: 1, destination: 'bottom' },
          { cardIndex: 2, destination: 'remove' },
        ],
      },
    });

    const newLib = result.state.players.A.library;
    // Library should be 1 smaller (1 removed)
    expect(newLib).toHaveLength(library.length - 1);
    // First card should be the "top" card
    expect(newLib[0]).toEqual(library[0]);
    // Last card should be the "bottom" card
    expect(newLib[newLib.length - 1]).toEqual(library[1]);
    // Removed card should be in cards
    expect(result.cards).toEqual([library[2]]);
    expect(result.card).toEqual(library[2]);
  });

  it('throws when decisions is empty', () => {
    const cards = makeCards(15);
    const state = playingStateWithLibrary('A', cards);

    expect(() =>
      dispatch(state, {
        type: 'SCRY_RESOLVE',
        payload: { player: 'A', decisions: [] },
      }),
    ).toThrow('SCRY_RESOLVE: decisions array must not be empty');
  });

  it('throws when decisions contain duplicate cardIndex values', () => {
    const cards = makeCards(15);
    const state = playingStateWithLibrary('A', cards);

    expect(() =>
      dispatch(state, {
        type: 'SCRY_RESOLVE',
        payload: {
          player: 'A',
          decisions: [
            { cardIndex: 0, destination: 'top' },
            { cardIndex: 0, destination: 'bottom' },
          ],
        },
      }),
    ).toThrow('SCRY_RESOLVE: decisions contain duplicate cardIndex values');
  });

  it('throws when cardIndex is out of range', () => {
    const cards = makeCards(10);
    const state = playingStateWithLibrary('A', cards);
    const libraryLen = state.players.A.library.length;

    expect(() =>
      dispatch(state, {
        type: 'SCRY_RESOLVE',
        payload: {
          player: 'A',
          decisions: [{ cardIndex: libraryLen + 5, destination: 'top' }],
        },
      }),
    ).toThrow(/SCRY_RESOLVE: cardIndex .+ is out of range/);
  });

  it('throws with negative cardIndex', () => {
    const cards = makeCards(15);
    const state = playingStateWithLibrary('A', cards);

    expect(() =>
      dispatch(state, {
        type: 'SCRY_RESOLVE',
        payload: {
          player: 'A',
          decisions: [{ cardIndex: -1, destination: 'top' }],
        },
      }),
    ).toThrow(/SCRY_RESOLVE: cardIndex .+ is out of range/);
  });

  it('does not mutate the input state', () => {
    const cards = makeCards(15);
    const state = playingStateWithLibrary('A', cards);
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'SCRY_RESOLVE',
      payload: {
        player: 'A',
        decisions: [
          { cardIndex: 0, destination: 'remove' },
          { cardIndex: 1, destination: 'top' },
        ],
      },
    });

    expect(state).toEqual(original);
  });
});
