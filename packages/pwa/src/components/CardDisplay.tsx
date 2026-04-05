interface CardDisplayProps {
  player: 'A' | 'B';
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

export function CardDisplay({ player }: CardDisplayProps) {
  return (
    <div
      class="card-display"
      role="region"
      aria-label={`${PLAYER_LABELS[player]} card display area`}
    >
      <p>No cards to display</p>
    </div>
  );
}
