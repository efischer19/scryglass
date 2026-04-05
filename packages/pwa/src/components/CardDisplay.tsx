import type { Card } from '@scryglass/core';

interface CardDisplayProps {
  player: 'A' | 'B';
  card?: Card | null;
  onDismiss?: () => void;
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

export function CardDisplay({ player, card, onDismiss }: CardDisplayProps) {
  return (
    <div
      class="card-display"
      role="region"
      aria-label={`${PLAYER_LABELS[player]} card display area`}
    >
      {card ? (
        <div class="card-display__content">
          <p class="card-display__name">{card.name}</p>
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
