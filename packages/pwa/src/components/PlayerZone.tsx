import type { PlayerState, PlayerPhase, Action, GameState } from '@scryglass/core';
import { CardDisplay } from './CardDisplay.js';
import { MulliganHand } from './MulliganHand.js';

interface PlayerZoneProps {
  player: 'A' | 'B';
  playerState: PlayerState;
  otherPlayerPhase: PlayerPhase;
  settings: GameState['settings'];
  onDispatch: (action: Action) => void;
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

export function PlayerZone({ player, playerState, otherPlayerPhase, settings, onDispatch }: PlayerZoneProps) {
  const label = PLAYER_LABELS[player];
  const disabled = playerState.phase !== 'playing' || otherPlayerPhase !== 'playing';

  return (
    <section
      class={`player-zone player-zone--${player.toLowerCase()}`}
      aria-label={`${label}'s zone`}
    >
      <h2 class="player-zone__name">{label}</h2>
      <p class="player-zone__card-count">
        Cards: {playerState.library.length}
      </p>
      {playerState.phase === 'mulligan' && (
        <MulliganHand
          player={player}
          playerState={playerState}
          settings={settings}
          onDispatch={onDispatch}
        />
      )}
      <div class="action-buttons">
        <button
          class="action-btn"
          type="button"
          disabled={disabled}
          aria-label={`Draw card from ${label}'s library`}
          onClick={() =>
            onDispatch({ type: 'DRAW_CARD', payload: { player } })
          }
        >
          Draw
        </button>
        <button
          class="action-btn"
          type="button"
          disabled={disabled}
          aria-label={`Fetch land from ${label}'s library`}
          onClick={() => {
            /* Requires land selection UI — wired in a later ticket */
          }}
        >
          Fetch Land
        </button>
        <button
          class="action-btn"
          type="button"
          disabled={disabled}
          aria-label={`Tutor card from ${label}'s library`}
          onClick={() => {
            /* Requires card selection UI — wired in a later ticket */
          }}
        >
          Tutor
        </button>
        <button
          class="action-btn"
          type="button"
          disabled={disabled}
          aria-label={`Scry ${label}'s library`}
          onClick={() => {
            /* Requires scry decision UI — wired in a later ticket */
          }}
        >
          Scry
        </button>
      </div>
      <CardDisplay player={player} />
    </section>
  );
}
