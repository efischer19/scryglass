import type { Card } from '@scryglass/core';
import { useCardImage } from '../scryfall/useCardImage';

interface CardDisplayProps {
  player: 'A' | 'B';
  card?: Card | null;
  onDismiss?: () => void;
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

function CardImage({ card }: { card: Card }) {
  const { status, imageUrl } = useCardImage(card.collectorNumber, card.setCode);

  if (status === 'loading') {
    return (
      <div class="card-display__loading" role="status">
        <span class="sr-only">Loading image for {card.name}</span>
        <span class="card-display__spinner" aria-hidden="true" />
        <p class="card-display__name">{card.name}</p>
      </div>
    );
  }

  if (status === 'error' || !imageUrl) {
    return <p class="card-display__name">{card.name}</p>;
  }

  return (
    <img
      class="card-display__image"
      src={imageUrl}
      alt={card.name}
    />
  );
}

export function CardDisplay({ player, card, onDismiss }: CardDisplayProps) {
  return (
    <div
      class="card-display"
      role="region"
      aria-label={`${PLAYER_LABELS[player]} card display area`}
    >
      {card ? (
        <div class="card-display__content">
          <CardImage card={card} />
          {onDismiss && (
            <button
              class="action-btn card-display__dismiss"
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss card display"
            >
              Dismiss
            </button>
          )}
        </div>
      ) : (
        <p>No cards to display</p>
      )}
    </div>
  );
}
