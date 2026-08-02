import { describe, expect, it } from 'vitest';
import type { Card } from '@scryglass/core';
import {
  createPlaymatCardId,
  createMoveCardAction,
  createToggleTappedAction,
  getBattlefieldDropPosition,
} from '../playmat-dnd.js';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: 'Sol Ring',
    setCode: 'c21',
    collectorNumber: '263',
    cardType: 'nonland',
    instanceId: 'card-1',
    ...overrides,
  };
}

describe('playmat-dnd helpers', () => {
  it('builds MOVE_CARD actions with card ids and battlefield positions', () => {
    const action = createMoveCardAction({
      player: 'A',
      card: makeCard(),
      cardId: 'hand:c21:263:Sol Ring:0',
      fromZone: 'hand',
      toZone: 'battlefield',
      position: { x: 48, y: 72 },
    });

    expect(action).toEqual({
      type: 'MOVE_CARD',
      payload: {
        player: 'A',
        cardName: 'Sol Ring',
        cardId: 'hand:c21:263:Sol Ring:0',
        fromZone: 'hand',
        toZone: 'battlefield',
        position: { x: 48, y: 72 },
      },
    });
  });

  it('toggles tapped state with CHANGE_CARD_STATE', () => {
    const action = createToggleTappedAction('A', 'battlefield', makeCard({ tapped: true }), 'battlefield:c21:263:Sol Ring:0');

    expect(action).toEqual({
      type: 'CHANGE_CARD_STATE',
      payload: {
        player: 'A',
        cardName: 'Sol Ring',
        cardId: 'battlefield:c21:263:Sol Ring:0',
        zone: 'battlefield',
        tapped: false,
      },
    });
  });

  it('clamps battlefield drops inside the playmat bounds', () => {
    const position = getBattlefieldDropPosition({
      card: makeCard(),
      fromZone: 'hand',
      containerRect: {
        left: 100,
        top: 200,
        width: 320,
        height: 240,
      },
      delta: { x: 0, y: 0 },
      translatedRect: {
        left: 600,
        top: 500,
      },
    });

    expect(position).toEqual({ x: 216, y: 98 });
  });

  it('moves battlefield cards relative to their existing coordinates', () => {
    const position = getBattlefieldDropPosition({
      card: makeCard({ position: { x: 32, y: 48 } }),
      fromZone: 'battlefield',
      containerRect: {
        left: 0,
        top: 0,
        width: 500,
        height: 400,
      },
      delta: { x: 20, y: -12 },
    });

    expect(position).toEqual({ x: 52, y: 36 });
  });

  it('creates deterministic playmat card ids', () => {
    expect(createPlaymatCardId(makeCard(), 'graveyard', 2)).toBe('graveyard:c21:263:Sol Ring:2');
  });
});
