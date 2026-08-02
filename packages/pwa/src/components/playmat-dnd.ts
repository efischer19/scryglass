import type { Action, Card, PlayerId } from '@scryglass/core';

type Zone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone' | 'mulliganHand';

const BATTLEFIELD_CARD_WIDTH = 96;
const BATTLEFIELD_CARD_HEIGHT = 134;
const BATTLEFIELD_PADDING = 8;

export type DroppableZone = Extract<Zone, 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone'>;

interface DragCardMoveOptions {
  player: PlayerId;
  card: Card;
  cardId: string;
  fromZone: Zone;
  toZone: Zone;
  position?: Card['position'];
}

interface BattlefieldDropPositionOptions {
  card: Card;
  fromZone: Zone;
  containerRect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
  delta: { x: number; y: number };
  translatedRect?: Pick<DOMRect, 'left' | 'top'> | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getBattlefieldDropPosition({
  card,
  fromZone,
  containerRect,
  delta,
  translatedRect,
}: BattlefieldDropPositionOptions): NonNullable<Card['position']> {
  const rawX = fromZone === 'battlefield'
    ? (card.position?.x ?? BATTLEFIELD_PADDING) + delta.x
    : (translatedRect?.left ?? containerRect.left + BATTLEFIELD_PADDING) - containerRect.left;
  const rawY = fromZone === 'battlefield'
    ? (card.position?.y ?? BATTLEFIELD_PADDING) + delta.y
    : (translatedRect?.top ?? containerRect.top + BATTLEFIELD_PADDING) - containerRect.top;
  const maxX = Math.max(BATTLEFIELD_PADDING, containerRect.width - BATTLEFIELD_CARD_WIDTH - BATTLEFIELD_PADDING);
  const maxY = Math.max(BATTLEFIELD_PADDING, containerRect.height - BATTLEFIELD_CARD_HEIGHT - BATTLEFIELD_PADDING);

  return {
    x: clamp(Math.round(rawX), BATTLEFIELD_PADDING, maxX),
    y: clamp(Math.round(rawY), BATTLEFIELD_PADDING, maxY),
  };
}

export function createMoveCardAction({
  player,
  card,
  cardId,
  fromZone,
  toZone,
  position,
}: DragCardMoveOptions): Action {
  return {
    type: 'MOVE_CARD',
    payload: {
      player,
      cardName: card.name,
      cardId,
      fromZone,
      toZone,
      ...(position != null ? { position } : {}),
    },
  };
}

export function createPlaymatCardId(card: Card, zone: Zone, index: number): string {
  return `${zone}:${card.setCode}:${card.collectorNumber}:${card.name}:${index}`;
}

export function createToggleTappedAction(player: PlayerId, zone: Zone, card: Card, cardId: string): Action {
  return {
    type: 'CHANGE_CARD_STATE',
    payload: {
      player,
      cardName: card.name,
      cardId,
      zone,
      tapped: !card.tapped,
    },
  };
}
