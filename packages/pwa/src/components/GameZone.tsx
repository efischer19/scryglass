import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Card, HiddenCard, PlayerId } from '@scryglass/core';
import { isCard } from '@scryglass/core';
import type { JSX } from 'preact';
import type { DroppableZone } from './playmat-dnd.js';
import { createPlaymatCardId } from './playmat-dnd.js';
import { CardImage } from './CardDisplay.js';
import { CommanderAvatar } from './CommanderAvatar.js';

interface DraggableZoneCardProps {
  card: Card;
  cardIndex: number;
  player: PlayerId;
  zone: DroppableZone;
  zoneName: string;
  isCommandZone: boolean;
  disabled: boolean;
  onToggleTapped?: (zone: DroppableZone, card: Card, cardId: string) => void;
}

function DraggableZoneCard({
  card,
  cardIndex,
  player,
  zone,
  zoneName,
  isCommandZone,
  disabled,
  onToggleTapped,
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

  return (
    <li
      ref={setNodeRef}
      class={`game-zone__card-item${isCommandZone ? ' game-zone__card-item--commander' : ''}${isDragging ? ' game-zone__card-item--dragging' : ''}${card.tapped ? ' game-zone__card-item--tapped' : ''}${zone === 'battlefield' ? ' game-zone__card-item--battlefield' : ''}`}
      style={style}
    >
      <button
        {...buttonAttributes}
        {...listeners}
        class="game-zone__card-button"
        type="button"
        disabled={disabled}
        aria-label={`${card.name} in ${zoneName}`}
        onDblClick={() => onToggleTapped?.(zone, card, cardId)}
        onContextMenu={(event) => {
          event.preventDefault();
          onToggleTapped?.(zone, card, cardId);
        }}
      >
        {isCommandZone ? <CommanderAvatar card={card} /> : <CardImage card={card} />}
      </button>
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
}

export function GameZone({
  player,
  zone,
  zoneName,
  cards,
  disabled = false,
  onToggleTapped,
}: GameZoneProps) {
  const isCommandZone = zone === 'commandZone';
  const isBattlefield = zone === 'battlefield';
  const visibleCards = cards.filter(isCard);
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${player}:${zone}`,
    data: { zone },
    disabled,
  });

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
      {visibleCards.length > 0 ? (
        <ul
          id={isBattlefield ? `zone-surface-${player}-${zone}` : undefined}
          ref={isBattlefield ? setNodeRef : undefined}
          class={`game-zone__card-list${isCommandZone ? ' game-zone__card-list--commanders' : ''}${isBattlefield ? ' game-zone__card-list--battlefield' : ''}`}
          aria-label={`Cards in ${zoneName}`}
        >
          {visibleCards.map((card, index) => (
            <DraggableZoneCard
              key={`${card.name}:${card.collectorNumber}:${index}`}
              card={card}
              cardIndex={index}
              player={player}
              zone={zone}
              zoneName={zoneName}
              isCommandZone={isCommandZone}
              disabled={disabled}
              onToggleTapped={onToggleTapped}
            />
          ))}
        </ul>
      ) : isBattlefield ? (
        <div
          id={`zone-surface-${player}-${zone}`}
          ref={setNodeRef}
          class="game-zone__battlefield-empty"
          aria-label={`Cards in ${zoneName}`}
        >
          <p class="game-zone__empty-state">No cards in {zoneName}</p>
        </div>
      ) : (
        <p class="game-zone__empty-state">No cards in {zoneName}</p>
      )}
    </section>
  );
}
