import { describe, it, expect } from 'vitest';
import { createInitialState, dispatch } from './state.js';
import type { GameState, Action } from './state.js';
import type { Card } from './schemas/card.js';

function makeCard(name: string, cardType: 'land' | 'nonland' = 'nonland'): Card {
  return { name, setCode: 'test', collectorNumber: '1', cardType };
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

  it('returns state with null mulliganHand', () => {
    const state = createInitialState();
    expect(state.players.A.mulliganHand).toBeNull();
    expect(state.players.B.mulliganHand).toBeNull();
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

  it('rejects invalid action shapes', () => {
    const state = createInitialState();
    expect(() =>
      dispatch(state, { type: 'INVALID' } as unknown as Action),
    ).toThrow();
  });
});
