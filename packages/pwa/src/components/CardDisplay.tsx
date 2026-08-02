import type { HiddenCard, PlayerId } from '@scryglass/core';
import { isCard, isCardHash } from '@scryglass/core';
import { useCardImage } from '../scryfall/useCardImage';

interface CardDisplayProps {
  player: PlayerId;
  card?: HiddenCard | null;
  onDismiss?: () => void;
  onReturnToLibrary?: () => void;
}

export function CardBack({ label = 'Hidden card' }: { label?: string }) {
  return (
    <div class="card-display__card-back" role="img" aria-label={label}>
      <span class="card-display__card-back-mark" aria-hidden="true">
        ✦
      </span>
      <span class="card-display__card-back-title" aria-hidden="true">
        Scryglass
      </span>
    </div>
  );
}

export function CardImage(
  { card, obscured = false, hiddenLabel }: { card: HiddenCard; obscured?: boolean; hiddenLabel?: string },
) {
  if (obscured || isCardHash(card)) {
    return <CardBack label={hiddenLabel} />;
  }

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

export function CardDisplay({ player, card, onDismiss, onReturnToLibrary }: CardDisplayProps) {
  const canReturnToLibrary = card != null && isCard(card) && onReturnToLibrary != null;

  return (
    <div
      class="card-display"
      role="region"
      aria-label={`Player ${player} card display area`}
    >
      {card ? (
        <div class="card-display__content">
          <CardImage card={card} />
          {canReturnToLibrary && (
            <button
              class="action-btn card-display__return"
              type="button"
              onClick={onReturnToLibrary!}
              aria-label="Return card to library"
            >
              Return to Library
            </button>
          )}
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
