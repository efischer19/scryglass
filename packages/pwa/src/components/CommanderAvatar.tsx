import type { Card } from '@scrymat/core';
import { useCommanderAvatar } from '../scryfall/useCommanderAvatar';

interface CommanderAvatarProps {
  card: Card;
}

export function CommanderAvatar({ card }: CommanderAvatarProps) {
  const { status, imageUrl } = useCommanderAvatar(
    card.collectorNumber,
    card.setCode,
  );

  if (status === 'loading') {
    return (
      <div class="commander-avatar__loading" role="status">
        <span class="sr-only">Loading avatar for {card.name}</span>
        <span class="commander-avatar__spinner" aria-hidden="true" />
        <p class="commander-avatar__name">{card.name}</p>
      </div>
    );
  }

  if (status === 'error' || !imageUrl) {
    return (
      <div class="commander-avatar__fallback">
        <p class="commander-avatar__name">{card.name}</p>
      </div>
    );
  }

  return (
    <div class="commander-avatar">
      <img
        class="commander-avatar__image"
        src={imageUrl}
        alt={`${card.name} avatar`}
      />
    </div>
  );
}
