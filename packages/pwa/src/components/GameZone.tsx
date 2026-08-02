import { useState } from 'preact/hooks';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Card, HiddenCard, PlayerId } from '@scryglass/core';
import { isCard } from '@scryglass/core';
import type { JSX } from 'preact';
import type { DroppableZone } from './playmat-dnd.js';
import { createPlaymatCardId } from './playmat-dnd.js';
import { CardBack, CardImage } from './CardDisplay.js';
import { CommanderAvatar } from './CommanderAvatar.js';
import type { MatchPresence, MatchPresenceUpdate } from '../networking/presenceSync.js';

interface DraggableZoneCardProps {
  card: Card;
  cardIndex: number;
  player: PlayerId;
  zone: DroppableZone;
  zoneName: string;
  isCommandZone: boolean;
  disabled: boolean;
  obscured: boolean;
  onToggleTapped?: (zone: DroppableZone, card: Card, cardId: string) => void;
  remotePresence?: MatchPresence | null;
  onPresenceChange?: (presence: MatchPresenceUpdate) => void;
}

function getBattlefieldPointerPosition(
  player: PlayerId,
  zone: DroppableZone,
  clientX: number,
  clientY: number,
): { x: number; y: number } | undefined {
  if (zone !== 'battlefield') {
    return undefined;
  }

  const battlefieldSurface = document.getElementById(`zone-surface-${player}-${zone}`);
  if (battlefieldSurface == null) {
    return undefined;
  }

  const rect = battlefieldSurface.getBoundingClientRect();
  return {
    x: Math.round(Math.min(Math.max(clientX - rect.left, 0), rect.width)),
    y: Math.round(Math.min(Math.max(clientY - rect.top, 0), rect.height)),
  };
}

function DraggableZoneCard({
  card,
  cardIndex,
  player,
  zone,
  zoneName,
  isCommandZone,
  disabled,
  obscured,
  onToggleTapped,
  remotePresence,
  onPresenceChange,
}: DraggableZoneCardProps) {
  const cardId = createPlaymatCardId(card, zone, cardIndex);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${player}:${cardId}`,
    disabled,
    data: { card, cardId, fromZone: zone },
  });
  const buttonAttributes = attributes as unknown as JSX.HTMLAttributes<HTMLButtonElement>;
  const translate = transform == null ? null : `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  const rotation = card.tapped ? 'rotate(90deg)' : null;
  const style = zone === 'battlefield'
    ? {
        left: `${card.position?.x ?? 8}px`,
        top: `${card.position?.y ?? 8}px`,
        transform: [translate, rotation].filter(Boolean).join(' ') || undefined,
      }
    : {
        transform: [translate, rotation].filter(Boolean).join(' ') || undefined,
      };
  const isRemotelyActive =
    remotePresence != null &&
    !remotePresence.cleared &&
    remotePresence.player === player &&
    remotePresence.zone === zone &&
    remotePresence.cardId === cardId;

  return (
    <li
      ref={setNodeRef}
      class={`game-zone__card-item${isCommandZone ? ' game-zone__card-item--commander' : ''}${isDragging ? ' game-zone__card-item--dragging' : ''}${card.tapped ? ' game-zone__card-item--tapped' : ''}${zone === 'battlefield' ? ' game-zone__card-item--battlefield' : ''}${isRemotelyActive ? ' game-zone__card-item--remote-active' : ''}`}
      style={style}
    >
      <button
        {...buttonAttributes}
        {...listeners}
        class="game-zone__card-button"
        type="button"
        disabled={disabled}
        aria-label={obscured ? `Hidden card ${cardIndex + 1} in ${zoneName}` : `${card.name} in ${zoneName}`}
        onDblClick={() => onToggleTapped?.(zone, card, cardId)}
        onPointerEnter={(event) => {
          event.stopPropagation();
          onPresenceChange?.({
            player,
            zone,
            cardId,
            interaction: 'hover',
            position: getBattlefieldPointerPosition(player, zone, event.clientX, event.clientY),
          });
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onPresenceChange?.({
            player,
            zone,
            cardId,
            interaction: 'hover',
            position: getBattlefieldPointerPosition(player, zone, event.clientX, event.clientY),
          });
        }}
        onPointerLeave={(event) => {
          event.stopPropagation();
          onPresenceChange?.({
            player,
            zone,
            cardId,
            cleared: true,
          });
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onToggleTapped?.(zone, card, cardId);
        }}
      >
        {isCommandZone ? <CommanderAvatar card={card} /> : <CardImage card={card} obscured={obscured} hiddenLabel={`Hidden card ${cardIndex + 1} in ${zoneName}`} />}
      </button>
    </li>
  );
}

function HiddenZoneCard(
  { cardIndex, zoneName, isCommandZone }: { cardIndex: number; zoneName: string; isCommandZone: boolean },
) {
  return (
    <li class={`game-zone__card-item${isCommandZone ? ' game-zone__card-item--commander' : ''}`}>
      <div class="game-zone__card-button">
        <CardBack label={`Hidden card ${cardIndex + 1} in ${zoneName}`} />
      </div>
    </li>
  );
}

interface GameZoneProps {
  player: PlayerId;
  zone: DroppableZone;
  zoneName: string;
  cards: HiddenCard[];
  disabled?: boolean;
  onToggleTapped?: (zone: DroppableZone, card: Card, cardId: string) => void;
  remotePresence?: MatchPresence | null;
  onPresenceChange?: (presence: MatchPresenceUpdate) => void;
}

export function GameZone({
  player,
  zone,
  zoneName,
  cards,
  disabled = false,
  onToggleTapped,
  remotePresence,
  onPresenceChange,
}: GameZoneProps) {
  const isCommandZone = zone === 'commandZone';
  const isBattlefield = zone === 'battlefield';
  const isPrivateHand = zone === 'hand';
  const [handPeekVisible, setHandPeekVisible] = useState(false);
  const canPeekAtHand = isPrivateHand && cards.some(isCard);
  const shouldObscureVisibleCards = isPrivateHand && !handPeekVisible;
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${player}:${zone}`,
    data: { zone },
    disabled,
  });
  const showRemoteCursor =
    isBattlefield &&
    remotePresence != null &&
    !remotePresence.cleared &&
    remotePresence.player === player &&
    remotePresence.zone === 'battlefield' &&
    remotePresence.position != null;
  const remoteCursorPosition = showRemoteCursor ? remotePresence.position : null;

  return (
    <section
      ref={!isBattlefield ? setNodeRef : undefined}
      class={`game-zone${isOver ? ' game-zone--drag-over' : ''}${isBattlefield ? ' game-zone--battlefield' : ''}`}
      aria-label={`${zoneName} zone`}
    >
      <h3 class="game-zone__title">{zoneName}</h3>
      <p class="game-zone__card-count">
        {cards.length} card{cards.length !== 1 ? 's' : ''}
      </p>
      {canPeekAtHand && (
        <button
          class="action-btn game-zone__peek-toggle"
          type="button"
          aria-pressed={handPeekVisible}
          onClick={() => setHandPeekVisible((visible) => !visible)}
        >
          {handPeekVisible ? `Hide ${zoneName}` : `Peek at ${zoneName}`}
        </button>
      )}
      {cards.length > 0 ? (
        isBattlefield ? (
          <div
            id={`zone-surface-${player}-${zone}`}
            ref={setNodeRef}
            class="game-zone__battlefield-surface"
            onPointerMove={(event) => {
              onPresenceChange?.({
                player,
                zone,
                interaction: 'hover',
                position: getBattlefieldPointerPosition(player, zone, event.clientX, event.clientY),
              });
            }}
            onPointerLeave={() => {
              onPresenceChange?.({
                player,
                zone,
                cleared: true,
              });
            }}
          >
            <ul
              class="game-zone__card-list game-zone__card-list--battlefield"
              aria-label={`Cards in ${zoneName}`}
            >
              {cards.map((card, index) => (
                isCard(card) ? (
                  <DraggableZoneCard
                    key={`${card.name}:${card.collectorNumber}:${index}`}
                    card={card}
                    cardIndex={index}
                    player={player}
                    zone={zone}
                    zoneName={zoneName}
                    isCommandZone={isCommandZone}
                    disabled={disabled}
                    obscured={shouldObscureVisibleCards}
                    onToggleTapped={onToggleTapped}
                    remotePresence={remotePresence}
                    onPresenceChange={onPresenceChange}
                  />
                ) : (
                  <HiddenZoneCard
                    key={`${card.hash}:${index}`}
                    cardIndex={index}
                    zoneName={zoneName}
                    isCommandZone={isCommandZone}
                  />
                )
              ))}
            </ul>
            {showRemoteCursor && (
              <div
                class="game-zone__remote-cursor"
                style={{
                  left: `${remoteCursorPosition?.x ?? 0}px`,
                  top: `${remoteCursorPosition?.y ?? 0}px`,
                }}
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
          <ul
            class={`game-zone__card-list${isCommandZone ? ' game-zone__card-list--commanders' : ''}`}
            aria-label={`Cards in ${zoneName}`}
          >
            {cards.map((card, index) => (
              isCard(card) ? (
                <DraggableZoneCard
                  key={`${card.name}:${card.collectorNumber}:${index}`}
                  card={card}
                  cardIndex={index}
                  player={player}
                  zone={zone}
                  zoneName={zoneName}
                  isCommandZone={isCommandZone}
                  disabled={disabled}
                  obscured={shouldObscureVisibleCards}
                  onToggleTapped={onToggleTapped}
                  remotePresence={remotePresence}
                  onPresenceChange={onPresenceChange}
                />
              ) : (
                <HiddenZoneCard
                  key={`${card.hash}:${index}`}
                  cardIndex={index}
                  zoneName={zoneName}
                  isCommandZone={isCommandZone}
                />
              )
            ))}
          </ul>
        )
      ) : isBattlefield ? (
        <div
          id={`zone-surface-${player}-${zone}`}
          ref={setNodeRef}
          class="game-zone__battlefield-surface game-zone__battlefield-empty"
          aria-label={`Cards in ${zoneName}`}
          onPointerMove={(event) => {
            onPresenceChange?.({
              player,
              zone,
              interaction: 'hover',
              position: getBattlefieldPointerPosition(player, zone, event.clientX, event.clientY),
            });
          }}
          onPointerLeave={() => {
            onPresenceChange?.({
              player,
              zone,
              cleared: true,
            });
          }}
        >
          <p class="game-zone__empty-state">No cards in {zoneName}</p>
          {showRemoteCursor && (
            <div
              class="game-zone__remote-cursor"
              style={{
                left: `${remoteCursorPosition?.x ?? 0}px`,
                top: `${remoteCursorPosition?.y ?? 0}px`,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      ) : (
        <p class="game-zone__empty-state">No cards in {zoneName}</p>
      )}
    </section>
  );
}
