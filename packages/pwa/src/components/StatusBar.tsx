interface DeckSelectionStatusProps {
  mode: 'deck-selection';
  player: 'A' | 'B';
}

interface GameStatusProps {
  mode: 'game';
  drawCounts: { A: number; B: number };
}

type StatusBarProps = DeckSelectionStatusProps | GameStatusProps;

export function StatusBar(props: StatusBarProps) {
  const message =
    props.mode === 'deck-selection'
      ? `Selecting deck for Player ${props.player}`
      : `Number of draws - A:${props.drawCounts.A} B:${props.drawCounts.B}`;

  return (
    <div class="status-bar" role="status" aria-live="polite">
      {message}
    </div>
  );
}
