import type { PlayerId } from '@scryglass/core';

interface DeckSelectionStatusProps {
  mode: 'deck-selection';
  player: PlayerId;
}

interface GameStatusProps {
  mode: 'game';
  drawCounts: Partial<Record<PlayerId, number>>;
  activePlayers: readonly PlayerId[];
}

type StatusBarProps = DeckSelectionStatusProps | GameStatusProps;

export function StatusBar(props: StatusBarProps) {
  let message: string;
  if (props.mode === 'deck-selection') {
    message = `Selecting deck for Player ${props.player}`;
  } else {
    const parts = props.activePlayers.map(
      (p) => `${p}:${props.drawCounts[p] ?? 0}`,
    );
    message = `Number of draws - ${parts.join(' ')}`;
  }

  return (
    <div class="status-bar" role="status" aria-live="polite">
      {message}
    </div>
  );
}
