import { createInitialState, dispatch, type Action, type Card } from '@scrymat/core';
import { describe, expect, it, vi } from 'vitest';
import {
  createActionSyncMiddleware,
  parseRemoteActionEnvelope,
} from '../actionSync.js';

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

function createMiddlewareHarness(now = () => 1_000) {
  let state = createInitialState();
  const broadcast = vi.fn();
  const middleware = createActionSyncMiddleware({
    dispatch,
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    },
    broadcast,
    now,
  });

  return {
    middleware,
    broadcast,
    getState: () => state,
    setState: (nextState: typeof state) => {
      state = nextState;
    },
  };
}

describe('createActionSyncMiddleware', () => {
  it('applies local actions optimistically and broadcasts an action envelope', () => {
    const harness = createMiddlewareHarness(() => 4_242);
    const card = makeCard('Sol Ring');
    harness.setState({
      ...harness.getState(),
      players: {
        ...harness.getState().players,
        A: {
          ...harness.getState().players.A,
          library: [card],
          phase: 'playing',
        },
      },
    });

    const result = harness.middleware.dispatchLocal({
      type: 'DRAW_CARD',
      payload: { player: 'A' },
    });

    expect(result.card).toEqual(card);
    expect(harness.getState().players.A.library).toHaveLength(0);
    expect(harness.broadcast).toHaveBeenCalledTimes(1);
    expect(parseRemoteActionEnvelope(harness.broadcast.mock.calls[0][0])).toEqual({
      kind: 'action',
      action: { type: 'DRAW_CARD', payload: { player: 'A' } },
      sentAt: 4_242,
      sequence: 0,
    });
  });

  it('applies incoming remote actions to the local reducer without rebroadcasting them', () => {
    const harness = createMiddlewareHarness();
    const card = makeCard('Arcane Signet');
    harness.setState({
      ...harness.getState(),
      players: {
        ...harness.getState().players,
        A: {
          ...harness.getState().players.A,
          battlefield: [card],
          phase: 'playing',
        },
      },
    });

    const result = harness.middleware.handleIncomingMessage(JSON.stringify({
      kind: 'action',
      action: {
        type: 'MOVE_CARD',
        payload: {
          player: 'A',
          cardName: 'Arcane Signet',
          fromZone: 'battlefield',
          toZone: 'graveyard',
        },
      } satisfies Action,
      sentAt: 1_100,
      sequence: 3,
    }));

    expect(result?.card).toEqual(card);
    expect(harness.getState().players.A.battlefield).toHaveLength(0);
    expect(harness.getState().players.A.graveyard).toEqual([card]);
    expect(harness.broadcast).not.toHaveBeenCalled();
  });

  it('broadcasts sync snapshots without mutating local state first', () => {
    const harness = createMiddlewareHarness(() => 9_001);
    const beforeState = harness.getState();

    harness.middleware.broadcast({
      type: 'SYNC_STATE',
      payload: beforeState,
    });

    expect(harness.getState()).toEqual(beforeState);
    expect(harness.broadcast).toHaveBeenCalledTimes(1);
    expect(parseRemoteActionEnvelope(harness.broadcast.mock.calls[0][0])).toEqual({
      kind: 'action',
      action: { type: 'SYNC_STATE', payload: beforeState },
      sentAt: 9_001,
      sequence: 0,
    });
  });

  it('ignores older remote collisions for the same card', () => {
    const harness = createMiddlewareHarness(() => 2_000);
    const card = makeCard('Lightning Greaves');
    harness.setState({
      ...harness.getState(),
      players: {
        ...harness.getState().players,
        A: {
          ...harness.getState().players.A,
          battlefield: [card],
          phase: 'playing',
        },
      },
    });

    harness.middleware.dispatchLocal({
      type: 'MOVE_CARD',
      payload: {
        player: 'A',
        cardName: 'Lightning Greaves',
        fromZone: 'battlefield',
        toZone: 'graveyard',
      },
    });

    const staleResult = harness.middleware.handleIncomingMessage(JSON.stringify({
      kind: 'action',
      action: {
        type: 'MOVE_CARD',
        payload: {
          player: 'A',
          cardName: 'Lightning Greaves',
          fromZone: 'battlefield',
          toZone: 'exile',
        },
      } satisfies Action,
      sentAt: 1_999,
      sequence: 1,
    }));

    expect(staleResult).toBeNull();
    expect(harness.getState().players.A.graveyard).toEqual([card]);
    expect(harness.getState().players.A.exile).toEqual([]);
  });

  it('lets equal-timestamp remote collisions win on arrival order', () => {
    const harness = createMiddlewareHarness(() => 2_500);
    const card = makeCard('Mind Stone');
    harness.setState({
      ...harness.getState(),
      players: {
        ...harness.getState().players,
        A: {
          ...harness.getState().players.A,
          battlefield: [card],
          phase: 'playing',
        },
      },
    });

    harness.middleware.dispatchLocal({
      type: 'MOVE_CARD',
      payload: {
        player: 'A',
        cardName: 'Mind Stone',
        fromZone: 'battlefield',
        toZone: 'graveyard',
      },
    });

    harness.setState({
      ...harness.getState(),
      players: {
        ...harness.getState().players,
        A: {
          ...harness.getState().players.A,
          graveyard: [],
          exile: [],
          battlefield: [card],
        },
      },
    });

    const remoteResult = harness.middleware.handleIncomingMessage(JSON.stringify({
      kind: 'action',
      action: {
        type: 'MOVE_CARD',
        payload: {
          player: 'A',
          cardName: 'Mind Stone',
          fromZone: 'battlefield',
          toZone: 'exile',
        },
      } satisfies Action,
      sentAt: 2_500,
      sequence: 7,
    }));

    expect(remoteResult?.card).toEqual(card);
    expect(harness.getState().players.A.battlefield).toEqual([]);
    expect(harness.getState().players.A.exile).toEqual([card]);
  });

  it('replaces the current state when a remote sync snapshot arrives', () => {
    const harness = createMiddlewareHarness();
    const snapshot = dispatch(createInitialState(), {
      type: 'LOAD_DECK',
      payload: { player: 'B', cards: [makeCard('Rhystic Study')] },
    }).state;

    const result = harness.middleware.handleIncomingMessage(JSON.stringify({
      kind: 'action',
      action: {
        type: 'SYNC_STATE',
        payload: snapshot,
      } satisfies Action,
      sentAt: 1_500,
      sequence: 4,
    }));

    expect(result?.state).toEqual(snapshot);
    expect(harness.getState()).toEqual(snapshot);
    expect(harness.broadcast).not.toHaveBeenCalled();
  });
});
