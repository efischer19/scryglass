import { createInitialState, type Card, dispatch } from '@scrymat/core';
import { describe, expect, it } from 'vitest';
import { dispatchLocalAgentMessage } from '../localAgentSync.js';

function makeCard(name: string): Card {
  return {
    name,
    setCode: 'TST',
    collectorNumber: '1',
    cardType: 'nonland',
    tapped: false,
    faceDown: false,
  };
}

describe('dispatchLocalAgentMessage', () => {
  it('parses a JSON action payload and feeds it into the core reducer', () => {
    const initialState = dispatch(createInitialState(), {
      type: 'LOAD_DECK',
      payload: { player: 'A', cards: [makeCard('Sol Ring')] },
    }).state;

    const result = dispatchLocalAgentMessage(initialState, JSON.stringify({
      type: 'DRAW_CARD',
      payload: { player: 'A' },
    }));

    expect(result?.card).toEqual(makeCard('Sol Ring'));
    expect(result?.state.players.A.library).toEqual([]);
  });
});
