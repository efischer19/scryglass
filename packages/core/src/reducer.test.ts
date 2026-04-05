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
    expect(state.players.A.mulliganCount).toBe(0);
    expect(state.players.B.mulliganCount).toBe(0);
    expect(state.settings.allowMulliganWith2or5Lands).toBe(false);
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

/** Helper: load a deck for a player and return updated state in mulligan phase */
function loadDeckForPlayer(player: 'A' | 'B', count: number): GameState {
  return dispatch(createInitialState(), {
    type: 'LOAD_DECK',
    payload: { player, cards: makeCards(count) },
  }).state;
}

describe('dispatch — DEAL_OPENING_HAND', () => {
  it('moves exactly 7 cards from library to mulliganHand', () => {
    const state = loadDeckForPlayer('A', 20);
    const result = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.mulliganHand).toHaveLength(7);
    expect(result.state.players.A.library).toHaveLength(13);
    expect(result.card).toBeNull();
  });

  it('moves the top 7 cards (first 7 in order)', () => {
    const state = loadDeckForPlayer('A', 20);
    const originalLibrary = state.players.A.library;
    const result = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.mulliganHand).toEqual(originalLibrary.slice(0, 7));
    expect(result.state.players.A.library).toEqual(originalLibrary.slice(7));
  });

  it('moves all available cards when library has fewer than 7', () => {
    const state = loadDeckForPlayer('A', 3);
    const result = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.mulliganHand).toHaveLength(3);
    expect(result.state.players.A.library).toHaveLength(0);
  });

  it('moves zero cards when library is empty', () => {
    const state = loadDeckForPlayer('A', 0);
    const result = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.mulliganHand).toHaveLength(0);
    expect(result.state.players.A.library).toHaveLength(0);
  });

  it('does not mutate the input state', () => {
    const state = loadDeckForPlayer('A', 20);
    const original = JSON.parse(JSON.stringify(state));
    dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    });

    expect(state).toEqual(original);
  });

  it('does not affect the other player', () => {
    const state = loadDeckForPlayer('A', 20);
    const result = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.B).toEqual(state.players.B);
  });

  it('throws when player is not in mulligan phase', () => {
    const state = createInitialState(); // phase is 'loading'
    expect(() =>
      dispatch(state, {
        type: 'DEAL_OPENING_HAND',
        payload: { player: 'A' },
      }),
    ).toThrow("Cannot DEAL_OPENING_HAND: Player A is in 'loading' phase, but must be in 'mulligan' phase");
  });

  it('throws when player is in playing phase', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;
    state = dispatch(state, {
      type: 'KEEP_HAND',
      payload: { player: 'A' },
    }).state;

    expect(() =>
      dispatch(state, {
        type: 'DEAL_OPENING_HAND',
        payload: { player: 'A' },
      }),
    ).toThrow("Cannot DEAL_OPENING_HAND: Player A is in 'playing' phase, but must be in 'mulligan' phase");
  });
});

describe('dispatch — MULLIGAN', () => {
  it('returns cards to library, shuffles, and re-deals 7', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    const result = dispatch(state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.mulliganHand).toHaveLength(7);
    expect(result.state.players.A.library).toHaveLength(13);
    expect(result.card).toBeNull();
  });

  it('preserves the total number of cards', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    const totalBefore = state.players.A.mulliganHand.length + state.players.A.library.length;
    const result = dispatch(state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });
    const totalAfter = result.state.players.A.mulliganHand.length + result.state.players.A.library.length;

    expect(totalAfter).toBe(totalBefore);
  });

  it('preserves the same set of cards (by name)', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    const allCardsBefore = [...state.players.A.mulliganHand, ...state.players.A.library]
      .map(c => c.name).sort();

    const result = dispatch(state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });
    const allCardsAfter = [...result.state.players.A.mulliganHand, ...result.state.players.A.library]
      .map(c => c.name).sort();

    expect(allCardsAfter).toEqual(allCardsBefore);
  });

  it('increments the mulliganCount', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    expect(state.players.A.mulliganCount).toBe(0);

    const r1 = dispatch(state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });
    expect(r1.state.players.A.mulliganCount).toBe(1);

    const r2 = dispatch(r1.state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });
    expect(r2.state.players.A.mulliganCount).toBe(2);
  });

  it('allows unlimited mulligans (casual rules)', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    for (let i = 0; i < 10; i++) {
      state = dispatch(state, {
        type: 'MULLIGAN',
        payload: { player: 'A' },
      }).state;
    }

    expect(state.players.A.mulliganCount).toBe(10);
    expect(state.players.A.mulliganHand).toHaveLength(7);
    expect(state.players.A.library).toHaveLength(13);
  });

  it('does not mutate the input state', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });

    expect(state).toEqual(original);
  });

  it('does not affect the other player', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    const result = dispatch(state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });

    expect(result.state.players.B).toEqual(state.players.B);
  });

  it('throws when player is not in mulligan phase', () => {
    const state = createInitialState(); // phase is 'loading'
    expect(() =>
      dispatch(state, {
        type: 'MULLIGAN',
        payload: { player: 'A' },
      }),
    ).toThrow("Cannot MULLIGAN: Player A is in 'loading' phase, but must be in 'mulligan' phase");
  });
});

describe('dispatch — KEEP_HAND', () => {
  it('clears mulliganHand and transitions phase to playing', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    const result = dispatch(state, {
      type: 'KEEP_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.mulliganHand).toEqual([]);
    expect(result.state.players.A.phase).toBe('playing');
    expect(result.card).toBeNull();
  });

  it('preserves the library unchanged', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;
    const libraryBefore = [...state.players.A.library];

    const result = dispatch(state, {
      type: 'KEEP_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.library).toEqual(libraryBefore);
  });

  it('preserves mulliganCount after keeping', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;
    state = dispatch(state, {
      type: 'MULLIGAN',
      payload: { player: 'A' },
    }).state;

    const result = dispatch(state, {
      type: 'KEEP_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.A.mulliganCount).toBe(1);
  });

  it('does not mutate the input state', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'KEEP_HAND',
      payload: { player: 'A' },
    });

    expect(state).toEqual(original);
  });

  it('does not affect the other player', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;

    const result = dispatch(state, {
      type: 'KEEP_HAND',
      payload: { player: 'A' },
    });

    expect(result.state.players.B).toEqual(state.players.B);
  });

  it('throws when player is not in mulligan phase', () => {
    const state = createInitialState(); // phase is 'loading'
    expect(() =>
      dispatch(state, {
        type: 'KEEP_HAND',
        payload: { player: 'B' },
      }),
    ).toThrow("Cannot KEEP_HAND: Player B is in 'loading' phase, but must be in 'mulligan' phase");
  });

  it('throws when player is already in playing phase', () => {
    let state = loadDeckForPlayer('A', 20);
    state = dispatch(state, {
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    }).state;
    state = dispatch(state, {
      type: 'KEEP_HAND',
      payload: { player: 'A' },
    }).state;

    expect(() =>
      dispatch(state, {
        type: 'KEEP_HAND',
        payload: { player: 'A' },
      }),
    ).toThrow("Cannot KEEP_HAND: Player A is in 'playing' phase, but must be in 'mulligan' phase");
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

function makeBasicLand(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'land' };
}

describe('dispatch — FETCH_BASIC_LAND', () => {
  it('removes the correct basic land from the library', () => {
    const mountain = makeBasicLand('Mountain');
    const island = makeBasicLand('Island');
    const sol = makeCard('Sol Ring');
    const cards = [sol, mountain, island];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    const result = dispatch(state, {
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });

    expect(result.card).toEqual(mountain);
    expect(result.state.players.A.library).toHaveLength(2);
    expect(result.state.players.A.library).not.toContainEqual(mountain);
  });

  it('reduces library size by 1', () => {
    const mountain = makeBasicLand('Mountain');
    const cards = [mountain, makeCard('Card 1'), makeCard('Card 2')];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    const result = dispatch(state, {
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });

    expect(result.state.players.A.library).toHaveLength(2);
  });

  it('shuffles the library after fetching', () => {
    // Use a large library so the odds of no shuffle occurring are negligible
    const mountain = makeBasicLand('Mountain');
    const others = Array.from({ length: 20 }, (_, i) => makeCard(`Card ${i + 1}`));
    const cards = [mountain, ...others];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    const result = dispatch(state, {
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });

    // Library length decreases by 1 (the fetched mountain is gone)
    expect(result.state.players.A.library).toHaveLength(20);
    // The remaining cards should be the same set as the others array
    const resultNames = result.state.players.A.library.map(c => c.name).sort();
    const expectedNames = others.map(c => c.name).sort();
    expect(resultNames).toEqual(expectedNames);
  });

  it('fetches the first matching basic land (by index)', () => {
    const mountain1 = { ...makeBasicLand('Mountain'), collectorNumber: '1' };
    const mountain2 = { ...makeBasicLand('Mountain'), collectorNumber: '2' };
    const cards = [mountain1, mountain2];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    const result = dispatch(state, {
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });

    expect(result.card).toEqual(mountain1);
    expect(result.state.players.A.library).toHaveLength(1);
  });

  it('matches snow-covered basics', () => {
    const snowCard = makeBasicLand('Snow-Covered Mountain');
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards: [snowCard] } }).state;

    const result = dispatch(state, {
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });

    expect(result.card).toEqual(snowCard);
  });

  it('throws a descriptive error when the land type is not in the library', () => {
    const cards = [makeBasicLand('Island'), makeCard('Sol Ring')];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    expect(() =>
      dispatch(state, {
        type: 'FETCH_BASIC_LAND',
        payload: { player: 'A', landType: 'Mountain' },
      }),
    ).toThrow("Cannot fetch: no Mountain found in Player A's library");
  });

  it('throws with player B context when applicable', () => {
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'B', cards: [] } }).state;

    expect(() =>
      dispatch(state, {
        type: 'FETCH_BASIC_LAND',
        payload: { player: 'B', landType: 'Forest' },
      }),
    ).toThrow("Cannot fetch: no Forest found in Player B's library");
  });

  it('does not mutate the input state', () => {
    const mountain = makeBasicLand('Mountain');
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards: [mountain] } }).state;
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });

    expect(state).toEqual(original);
  });

  it('does not affect the other player', () => {
    const mountain = makeBasicLand('Mountain');
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards: [mountain] } }).state;
    const playerBBefore = state.players.B;

    const result = dispatch(state, {
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });

    expect(result.state.players.B).toEqual(playerBBefore);
  });
});

describe('dispatch — TUTOR_CARD', () => {
  it('removes the correct card by name and reduces library size by 1', () => {
    const sol = makeCard('Sol Ring');
    const counterspell = makeCard('Counterspell');
    const cards = [sol, counterspell, makeCard('Lightning Bolt')];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    const result = dispatch(state, {
      type: 'TUTOR_CARD',
      payload: { player: 'A', cardName: 'Sol Ring' },
    });

    expect(result.card).toEqual(sol);
    expect(result.state.players.A.library).toHaveLength(cards.length - 1);
    expect(result.state.players.A.library.find(c => c.name === 'Sol Ring')).toBeUndefined();
  });

  it('finds the card case-insensitively', () => {
    const sol = makeCard('Sol Ring');
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards: [sol] } }).state;

    const result = dispatch(state, {
      type: 'TUTOR_CARD',
      payload: { player: 'A', cardName: 'sol ring' },
    });

    expect(result.card).toEqual(sol);
  });

  it('removes only the first matching card', () => {
    const sol1 = makeCard('Sol Ring');
    const sol2 = makeCard('Sol Ring');
    const counterspell = makeCard('Counterspell');
    let state = createInitialState();
    state = dispatch(state, {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: [sol1, counterspell, sol2] },
    }).state;

    const result = dispatch(state, {
      type: 'TUTOR_CARD',
      payload: { player: 'A', cardName: 'Sol Ring' },
    });

    expect(result.card).toEqual(sol1);
    expect(result.state.players.A.library).toHaveLength(2);
    expect(result.state.players.A.library.filter(c => c.name === 'Sol Ring')).toHaveLength(1);
  });

  it('shuffles the library after tutor', () => {
    const cards = makeCards(20);
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    const result = dispatch(state, {
      type: 'TUTOR_CARD',
      payload: { player: 'A', cardName: 'Card 10' },
    });

    // The remaining 19 cards should contain all originals except Card 10
    const remainingNames = result.state.players.A.library.map(c => c.name).sort();
    const expectedNames = cards.filter(c => c.name !== 'Card 10').map(c => c.name).sort();
    expect(remainingNames).toEqual(expectedNames);
    expect(result.state.players.A.library).toHaveLength(19);
  });

  it('throws a descriptive error when the card is not in the library', () => {
    const cards = [makeCard('Counterspell'), makeCard('Lightning Bolt')];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;

    expect(() =>
      dispatch(state, {
        type: 'TUTOR_CARD',
        payload: { player: 'A', cardName: 'Sol Ring' },
      }),
    ).toThrow("Cannot tutor: 'Sol Ring' not found in Player A's library");
  });

  it('throws with player B context when applicable', () => {
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'B', cards: [] } }).state;

    expect(() =>
      dispatch(state, {
        type: 'TUTOR_CARD',
        payload: { player: 'B', cardName: 'Sol Ring' },
      }),
    ).toThrow("Cannot tutor: 'Sol Ring' not found in Player B's library");
  });

  it('does not mutate the input state', () => {
    const cards = [makeCard('Sol Ring'), makeCard('Counterspell')];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;
    const original = JSON.parse(JSON.stringify(state));

    dispatch(state, {
      type: 'TUTOR_CARD',
      payload: { player: 'A', cardName: 'Sol Ring' },
    });

    expect(state).toEqual(original);
  });

  it('does not affect the other player', () => {
    const cards = [makeCard('Sol Ring')];
    let state = createInitialState();
    state = dispatch(state, { type: 'LOAD_DECK', payload: { player: 'A', cards } }).state;
    const playerBBefore = state.players.B;

    const result = dispatch(state, {
      type: 'TUTOR_CARD',
      payload: { player: 'A', cardName: 'Sol Ring' },
    });

    expect(result.state.players.B).toEqual(playerBBefore);
  });
});
