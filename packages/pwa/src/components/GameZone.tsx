import type { Card } from '@scryglass/core';
import { CardImage } from './CardDisplay.js';
import { CommanderAvatar } from './CommanderAvatar.js';

interface GameZoneProps {
  zoneName: string;
  cards: Card[];
}

export function GameZone({ zoneName, cards }: GameZoneProps) {
  const isCommandZone = zoneName === 'Command Zone';

  return (
    <section class="game-zone" aria-label={`${zoneName} zone`}>
      <h3 class="game-zone__title">{zoneName}</h3>
      <p class="game-zone__card-count">
        {cards.length} card{cards.length !== 1 ? 's' : ''}
      </p>
      {cards.length > 0 ? (
        isCommandZone ? (
          <ul class="game-zone__card-list game-zone__card-list--commanders" aria-label={`Cards in ${zoneName}`}>
            {cards.map((card: Card, i: number) => (
              <li key={i} class="game-zone__card-item game-zone__card-item--commander">
                <CommanderAvatar card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <ul class="game-zone__card-list" aria-label={`Cards in ${zoneName}`}>
            {cards.map((card: Card, i: number) => (
              <li key={i} class="game-zone__card-item">
                <CardImage card={card} />
              </li>
            ))}
          </ul>
        )
      ) : (
        <p class="game-zone__empty-state">No cards in {zoneName}</p>
      )}
    </section>
  );
}
