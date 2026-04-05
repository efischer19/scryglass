import { describe, it, expect } from 'vitest';
import { createInitialState, dispatch } from './reducer.js';
import type { GameState } from './schemas/state.js';
import type { Card } from './schemas/card.js';
import type { Action } from './schemas/action.js';

function makeCard(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'nonland' };
}

function makeCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => makeCard(`Card ${i + 1}`));
}

describe('createInitialState', () => {
  it('returns a GameState with two players in loading phase', () => {
    const state = createInitialState();
    expect(state.players.A.phase).toBe('loading');
    expect(state.players.B.phase).toBe('loading');
    expect(state.players.A.library).toEqual([]);
    expect(state.players.B.library).toEqual([]);
    expect(state.players.A.mulliganHand).toEqual([]);
    expect(state.players.B.mulliganHand).toEqual([]);
  });
});

describe('dispatch — LOAD_DECK', () => {
  it('replaces the library and sets phase to mulligan', () => {
    const state = createInitialState();
    const cards = makeCards(3);
    const result = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    });

    expect(result.state.players.A.library).toEqual(cards);
    expect(result.state.players.A.phase).toBe('mulligan');
    expect(result.card).toBeNull();
  });

  it('clears an existing library before loading', () => {
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: makeCards(5) },
    }).state;

    const newCards = makeCards(2);
    const result = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: newCards },
    });

    expect(result.state.players.A.library).toEqual(newCards);
    expect(result.state.players.A.library).toHaveLength(2);
  });

  it('does not mutate the input state', () => {
    const state = createInitialState();
    const original = JSON.parse(JSON.stringify(state));
    dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: makeCards(3) },
    });

    expect(state).toEqual(original);
  });

  it('does not affect the other player', () => {
    const state = createInitialState();
    const result = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: makeCards(3) },
    });

    expect(result.state.players.B.library).toEqual([]);
    expect(result.state.players.B.phase).toBe('loading');
  });
});

describe('dispatch — SHUFFLE_LIBRARY', () => {
  it('preserves the same set of cards', () => {
    const cards = makeCards(10);
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    }).state;

    const result = dispatch(state, {
      type: 'SHUFFLE_LIBRARY',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.library.sort((a, b) => a.name.localeCompare(b.name)))
      .toEqual(cards.sort((a, b) => a.name.localeCompare(b.name)));
    expect(result.card).toBeNull();
  });

  it('does not mutate the input state', () => {
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: makeCards(10) },
    }).state;
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'SHUFFLE_LIBRARY',
      payload: { player: 'A' },
    });

    expect(state).toEqual(original);
  });

  it('returns the same length library', () => {
    const cards = makeCards(5);
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    }).state;

    const result = dispatch(state, {
      type: 'SHUFFLE_LIBRARY',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.library).toHaveLength(5);
  });
});

describe('dispatch — DRAW_CARD', () => {
  it('removes and returns the top card (index 0)', () => {
    const cards = makeCards(3);
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    }).state;

    const result = dispatch(state, {
      type: 'DRAW_CARD',
      payload: { player: 'A' },
    });

    expect(result.card).toEqual(cards[0]);
    expect(result.state.players.A.library).toHaveLength(2);
    expect(result.state.players.A.library[0]).toEqual(cards[1]);
  });

  it('throws when library is empty', () => {
    const state = createInitialState();
    expect(() =>
      dispatch(state, {
        type: 'DRAW_CARD',
        payload: { player: 'A' },
      }),
    ).toThrow("Cannot draw: Player A's library is empty (0 cards remaining)");
  });

  it('throws with player B context when B library is empty', () => {
    const state = createInitialState();
    expect(() =>
      dispatch(state, {
        type: 'DRAW_CARD',
        payload: { player: 'B' },
      }),
    ).toThrow("Cannot draw: Player B's library is empty (0 cards remaining)");
  });

  it('does not mutate the input state', () => {
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: makeCards(3) },
    }).state;
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'DRAW_CARD',
      payload: { player: 'A' },
    });

    expect(state).toEqual(original);
  });

  it('draws successive cards from the top', () => {
    const cards = makeCards(3);
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    }).state;

    const r1 = dispatch(state, { type: 'DRAW_CARD', payload: { player: 'A' } });
    expect(r1.card).toEqual(cards[0]);

    const r2 = dispatch(r1.state, { type: 'DRAW_CARD', payload: { player: 'A' } });
    expect(r2.card).toEqual(cards[1]);

    const r3 = dispatch(r2.state, { type: 'DRAW_CARD', payload: { player: 'A' } });
    expect(r3.card).toEqual(cards[2]);

    expect(r3.state.players.A.library).toHaveLength(0);
  });
});

describe('dispatch — RETURN_TO_LIBRARY', () => {
  const returnCard = makeCard('Returned Card');

  it('inserts at the top (index 0) with position "top"', () => {
    const cards = makeCards(3);
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    }).state;

    const result = dispatch(state, {
      type: 'RETURN_TO_LIBRARY',
      payload: { player: 'A', card: returnCard, position: 'top' },
    });

    expect(result.state.players.A.library[0]).toEqual(returnCard);
    expect(result.state.players.A.library).toHaveLength(4);
    expect(result.card).toBeNull();
  });

  it('inserts at the bottom with position "bottom"', () => {
    const cards = makeCards(3);
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    }).state;

    const result = dispatch(state, {
      type: 'RETURN_TO_LIBRARY',
      payload: { player: 'A', card: returnCard, position: 'bottom' },
    });

    const lib = result.state.players.A.library;
    expect(lib[lib.length - 1]).toEqual(returnCard);
    expect(lib).toHaveLength(4);
  });

  it('inserts at a random position with position "random"', () => {
    const cards = makeCards(5);
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards },
    }).state;

    const result = dispatch(state, {
      type: 'RETURN_TO_LIBRARY',
      payload: { player: 'A', card: returnCard, position: 'random' },
    });

    const lib = result.state.players.A.library;
    expect(lib).toHaveLength(6);
    expect(lib).toContainEqual(returnCard);
  });

  it('inserts into an empty library', () => {
    const state = createInitialState();
    const result = dispatch(state, {
      type: 'RETURN_TO_LIBRARY',
      payload: { player: 'A', card: returnCard, position: 'top' },
    });

    expect(result.state.players.A.library).toEqual([returnCard]);
  });

  it('does not mutate the input state', () => {
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: makeCards(3) },
    }).state;
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'RETURN_TO_LIBRARY',
      payload: { player: 'A', card: returnCard, position: 'bottom' },
    });

    expect(state).toEqual(original);
  });
});

describe('dispatch — validation', () => {
  it('rejects an invalid action type', () => {
    const state = createInitialState();
    expect(() =>
      dispatch(state, { type: 'INVALID_ACTION', payload: {} } as unknown as Action),
    ).toThrow();
  });

  it('rejects an action missing required payload fields', () => {
    const state = createInitialState();
    expect(() =>
      dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A' } } as unknown as Action),
    ).toThrow();
  });

  it('rejects an invalid player id', () => {
    const state = createInitialState();
    expect(() =>
      dispatch(state, { type: 'DRAW_CARD', payload: { player: 'C' } } as unknown as Action),
    ).toThrow();
  });
});
