import type { Card } from '@scryglass/core';
import { CardImage } from './CardDisplay.js';

interface GameZoneProps {
  zoneName: string;
  cards: Card[];
}

export function GameZone({ zoneName, cards }: GameZoneProps) {
  return (
    <section class="game-zone" aria-label={`${zoneName} zone`}>
      <h3 class="game-zone__title">{zoneName}</h3>
      <p class="game-zone__card-count">
        {cards.length} card{cards.length !== 1 ? 's' : ''}
      </p>
      {cards.length > 0 ? (
        <ul class="game-zone__card-list" aria-label={`Cards in ${zoneName}`}>
          {cards.map((card: Card, i: number) => (
            <li key={i} class="game-zone__card-item">
              <CardImage card={card} />
            </li>
          ))}
        </ul>
      ) : (
        <p class="game-zone__empty-state">No cards in {zoneName}</p>
      )}
    </section>
  );
}
