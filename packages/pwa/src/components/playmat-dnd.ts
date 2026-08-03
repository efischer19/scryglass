import {
  KeyboardCode,
  defaultKeyboardCoordinateGetter,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import type { Action, Card, PlayerId } from '@scrymat/core';

type Zone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone' | 'mulliganHand';

const BATTLEFIELD_CARD_WIDTH = 96;
const BATTLEFIELD_CARD_HEIGHT = 134;
const BATTLEFIELD_PADDING = 8;

export type DroppableZone = Extract<Zone, 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone'>;

const ZONE_LABELS: Record<DroppableZone, string> = {
  hand: 'Hand',
  battlefield: 'Battlefield',
  graveyard: 'Graveyard',
  exile: 'Exile',
  commandZone: 'Command Zone',
};

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

function getRectCenter(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getZoneNavigationScore(
  code: KeyboardEvent['code'],
  dx: number,
  dy: number,
): number | null {
  switch (code) {
    case KeyboardCode.Right:
      return dx > 0 ? dx + Math.abs(dy) * 2 : null;
    case KeyboardCode.Left:
      return dx < 0 ? Math.abs(dx) + Math.abs(dy) * 2 : null;
    case KeyboardCode.Down:
      return dy > 0 ? dy + Math.abs(dx) * 2 : null;
    case KeyboardCode.Up:
      return dy < 0 ? Math.abs(dy) + Math.abs(dx) * 2 : null;
    default:
      return null;
  }
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

export function getZoneLabel(zone: DroppableZone): string {
  return ZONE_LABELS[zone];
}

export const playmatKeyboardCoordinateGetter: KeyboardCoordinateGetter = (event, args) => {
  const { context } = args;
  const droppableContainers = Array.from(context.droppableContainers.values()) as Array<{
    id: string;
    disabled: boolean;
    data: { current?: { zone?: DroppableZone } };
  }>;
  const activeZone = context.over?.data.current?.zone as DroppableZone | undefined
    ?? context.active?.data.current?.fromZone as DroppableZone | undefined;

  if (
    activeZone == null
    || !Object.values(KeyboardCode).includes(event.code as KeyboardCode)
    || event.code === KeyboardCode.Space
    || event.code === KeyboardCode.Enter
    || event.code === KeyboardCode.Esc
    || event.code === KeyboardCode.Tab
  ) {
    return defaultKeyboardCoordinateGetter(event, args);
  }

  const currentContainer = droppableContainers.find(
    (container) => container?.data.current?.zone === activeZone,
  );
  const currentRect = currentContainer
    ? context.droppableRects.get(currentContainer.id)
    : null;

  if (currentRect == null) {
    return defaultKeyboardCoordinateGetter(event, args);
  }

  const currentCenter = getRectCenter(currentRect);
  let bestCandidate: { x: number; y: number; score: number } | null = null;

  for (const container of droppableContainers) {
    const zone = container?.data.current?.zone as DroppableZone | undefined;
    if (container == null || zone == null || zone === activeZone || container.disabled) {
      continue;
    }

    const rect = context.droppableRects.get(container.id);
    if (rect == null) {
      continue;
    }

    const center = getRectCenter(rect);
    const score = getZoneNavigationScore(
      event.code,
      center.x - currentCenter.x,
      center.y - currentCenter.y,
    );

    if (score == null || (bestCandidate != null && score >= bestCandidate.score)) {
      continue;
    }

    bestCandidate = {
      x: Math.round(center.x),
      y: Math.round(center.y),
      score,
    };
  }

  if (bestCandidate == null) {
    return defaultKeyboardCoordinateGetter(event, args);
  }

  return {
    x: bestCandidate.x,
    y: bestCandidate.y,
  };
};

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
