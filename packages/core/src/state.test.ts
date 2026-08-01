import { describe, it, expect } from 'vitest';
import { createInitialState, dispatch, GameStateSchema, PlayerStateSchema } from './state.js';
import type { GameState, Action } from './state.js';
import type { Card } from './schemas/card.js';

function makeCard(name: string, cardType: 'land' | 'nonland' = 'nonland'): Card {
  return { name, setCode: 'test', collectorNumber: '1', cardType, tapped: false, faceDown: false };
}

describe('createInitialState', () => {
  it('returns state with both players in loading phase', () => {
    const state = createInitialState();
    expect(state.players.A.phase).toBe('loading');
    expect(state.players.B.phase).toBe('loading');
  });

  it('returns state with empty libraries', () => {
    const state = createInitialState();
    expect(state.players.A.library).toEqual([]);
    expect(state.players.B.library).toEqual([]);
  });

  it('returns state with empty playmat zones', () => {
    const state = createInitialState();
    for (const player of [state.players.A, state.players.B]) {
      expect(player.hand).toEqual([]);
      expect(player.battlefield).toEqual([]);
      expect(player.graveyard).toEqual([]);
      expect(player.exile).toEqual([]);
      expect(player.commandZone).toEqual([]);
    }
  });

  it('returns state with null mulliganHand', () => {
    const state = createInitialState();
    expect(state.players.A.mulliganHand).toBeNull();
    expect(state.players.B.mulliganHand).toBeNull();
  });

  it('validates the initial player and game state schemas', () => {
    const state = createInitialState();
    expect(PlayerStateSchema.parse(state.players.A)).toEqual(state.players.A);
    expect(PlayerStateSchema.parse(state.players.B)).toEqual(state.players.B);
    expect(GameStateSchema.parse(state)).toEqual(state);
  });

  it('round-trips the game state through JSON serialization', () => {
    const state = createInitialState();
    const roundTripped = JSON.parse(JSON.stringify(state));
    expect(GameStateSchema.parse(roundTripped)).toEqual(state);
  });
});

describe('dispatch', () => {
  describe('LOAD_DECK', () => {
    it('sets the library and changes phase to playing', () => {
      const state = createInitialState();
      const cards = [makeCard('Sol Ring'), makeCard('Forest', 'land')];
      const result = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      });
      expect(result.state.players.A.library).toEqual(cards);
      expect(result.state.players.A.phase).toBe('playing');
      expect(result.state.players.B.phase).toBe('loading');
    });
  });

  describe('DRAW_CARD', () => {
    it('removes the top card and returns it', () => {
      let state = createInitialState();
      const cards = [makeCard('Card1'), makeCard('Card2'), makeCard('Card3')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      const result = dispatch(state, {
        type: 'DRAW_CARD',
        payload: { player: 'A' },
      });
      expect(result.drawnCards).toEqual([makeCard('Card1')]);
      expect(result.state.players.A.library).toHaveLength(2);
    });

    it('throws when library is empty', () => {
      const state = createInitialState();
      const loaded = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards: [] },
      }).state;

      expect(() =>
        dispatch(loaded, { type: 'DRAW_CARD', payload: { player: 'A' } }),
      ).toThrow("Cannot draw: Player A's library is empty");
    });
  });

  describe('SHUFFLE_LIBRARY', () => {
    it('preserves all cards after shuffle', () => {
      let state = createInitialState();
      const cards = [makeCard('A'), makeCard('B'), makeCard('C')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      const result = dispatch(state, {
        type: 'SHUFFLE_LIBRARY',
        payload: { player: 'A' },
      });
      expect(result.state.players.A.library).toHaveLength(3);
    });
  });

  describe('TUTOR_CARD', () => {
    it('removes the named card from the library', () => {
      let state = createInitialState();
      const cards = [makeCard('Sol Ring'), makeCard('Forest', 'land')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      const result = dispatch(state, {
        type: 'TUTOR_CARD',
        payload: { player: 'A', cardName: 'Sol Ring' },
      });
      expect(result.drawnCards).toEqual([makeCard('Sol Ring')]);
      expect(result.state.players.A.library).toHaveLength(1);
    });

    it('throws when card not found', () => {
      let state = createInitialState();
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards: [makeCard('Forest', 'land')] },
      }).state;

      expect(() =>
        dispatch(state, {
          type: 'TUTOR_CARD',
          payload: { player: 'A', cardName: 'Missing Card' },
        }),
      ).toThrow('Cannot tutor: "Missing Card" not found');
    });
  });

  describe('FETCH_BASIC_LAND', () => {
    it('removes the named land from the library', () => {
      let state = createInitialState();
      const cards = [makeCard('Sol Ring'), makeCard('Mountain', 'land')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      const result = dispatch(state, {
        type: 'FETCH_BASIC_LAND',
        payload: { player: 'A', landType: 'Mountain' },
      });
      expect(result.drawnCards).toEqual([makeCard('Mountain', 'land')]);
      expect(result.state.players.A.library).toHaveLength(1);
    });
  });

  describe('MOVE_CARD', () => {
    it('moves a card from one zone to another', () => {
      let state = createInitialState();
      const cards = [makeCard('Sol Ring'), makeCard('Forest', 'land')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      const result = dispatch(state, {
        type: 'MOVE_CARD',
        payload: {
          player: 'A',
          cardName: 'Sol Ring',
          fromZone: 'library',
          toZone: 'hand',
        },
      });

      expect(result.state.players.A.library).toHaveLength(1);
      expect(result.state.players.A.hand).toHaveLength(1);
      expect(result.state.players.A.hand[0].name).toBe('Sol Ring');
    });

    it('throws when card is not found in source zone', () => {
      let state = createInitialState();
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards: [makeCard('Forest', 'land')] },
      }).state;

      expect(() =>
        dispatch(state, {
          type: 'MOVE_CARD',
          payload: {
            player: 'A',
            cardName: 'Missing Card',
            fromZone: 'library',
            toZone: 'hand',
          },
        }),
      ).toThrow('Cannot move card: "Missing Card" not found');
    });
  });

  describe('CHANGE_CARD_STATE', () => {
    it('sets tapped flag on a card', () => {
      let state = createInitialState();
      const cards = [makeCard('Sol Ring')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      state = dispatch(state, {
        type: 'MOVE_CARD',
        payload: {
          player: 'A',
          cardName: 'Sol Ring',
          fromZone: 'library',
          toZone: 'battlefield',
        },
      }).state;

      const result = dispatch(state, {
        type: 'CHANGE_CARD_STATE',
        payload: {
          player: 'A',
          cardName: 'Sol Ring',
          zone: 'battlefield',
          tapped: true,
        },
      });

      expect(result.state.players.A.battlefield[0].tapped).toBe(true);
    });

    it('sets faceDown flag on a card', () => {
      let state = createInitialState();
      const cards = [makeCard('Forest', 'land')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      state = dispatch(state, {
        type: 'MOVE_CARD',
        payload: {
          player: 'A',
          cardName: 'Forest',
          fromZone: 'library',
          toZone: 'hand',
        },
      }).state;

      const result = dispatch(state, {
        type: 'CHANGE_CARD_STATE',
        payload: {
          player: 'A',
          cardName: 'Forest',
          zone: 'hand',
          faceDown: true,
        },
      });

      expect(result.state.players.A.hand[0].faceDown).toBe(true);
    });

    it('sets both tapped and faceDown flags', () => {
      let state = createInitialState();
      const cards = [makeCard('Sol Ring')];
      state = dispatch(state, {
        type: 'LOAD_DECK',
        payload: { player: 'A', cards },
      }).state;

      state = dispatch(state, {
        type: 'MOVE_CARD',
        payload: {
          player: 'A',
          cardName: 'Sol Ring',
          fromZone: 'library',
          toZone: 'hand',
        },
      }).state;

      const result = dispatch(state, {
        type: 'CHANGE_CARD_STATE',
        payload: {
          player: 'A',
          cardName: 'Sol Ring',
          zone: 'hand',
          tapped: true,
          faceDown: true,
        },
      });

      expect(result.state.players.A.hand[0].tapped).toBe(true);
      expect(result.state.players.A.hand[0].faceDown).toBe(true);
    });

    it('throws when card is not found in zone', () => {
      const state = createInitialState();

      expect(() =>
        dispatch(state, {
          type: 'CHANGE_CARD_STATE',
          payload: {
            player: 'A',
            cardName: 'Missing Card',
            zone: 'hand',
            tapped: true,
          },
        }),
      ).toThrow('Cannot change card state: "Missing Card" not found');
    });
  });

  it('rejects invalid action shapes', () => {
    const state = createInitialState();
    expect(() =>
      dispatch(state, { type: 'INVALID' } as unknown as Action),
    ).toThrow();
  });
});
