import { useState } from 'preact/hooks';
import type { PlayerState, PlayerPhase, Action, ActionResult, Card, GameState } from '@scryglass/core';
import { CardDisplay } from './CardDisplay.js';
import { MulliganHand } from './MulliganHand.js';
import { DrawButton } from './DrawButton.js';
import { ScryModal } from './ScryModal.js';
import { FetchLandModal } from './FetchLandModal.js';
import { TutorModal } from './TutorModal.js';

interface PlayerZoneProps {
  player: 'A' | 'B';
  playerState: PlayerState;
  otherPlayerPhase: PlayerPhase;
  settings: GameState['settings'];
  gameState: GameState;
  onDispatch: (action: Action) => ActionResult;
  visiblePlayer: 'A' | 'B' | null;
  onVisibilityChange: (player: 'A' | 'B' | null) => void;
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

export function PlayerZone({ player, playerState, otherPlayerPhase, settings, gameState, onDispatch, visiblePlayer, onVisibilityChange }: PlayerZoneProps) {
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [showScry, setShowScry] = useState(false);
  const [showFetchLand, setShowFetchLand] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const label = PLAYER_LABELS[player];
  const disabled = playerState.phase !== 'playing' || otherPlayerPhase !== 'playing';
  const isVisible = visiblePlayer === player;
  const canReveal = visiblePlayer === null;

  const handleCardDrawn = (card: Card | null) => {
    setDrawnCard(card);
    // JIT image fetch stub — integration point with Ticket 17
  };

  const handleReturnToLibrary = () => {
    if (!drawnCard) return;
    onDispatch({
      type: 'RETURN_TO_LIBRARY',
      payload: { player, card: drawnCard, position: 'top' },
    });
    setDrawnCard(null);
  };

  const handleDispatch = (action: Action): ActionResult => {
    const result = onDispatch(action);
    if (action.type === 'KEEP_HAND') {
      onVisibilityChange(null);
    }
    return result;
  };

  return (
    <section
      class={`player-zone player-zone--${player.toLowerCase()}`}
      aria-label={`${label}'s zone`}
    >
      <h2 class="player-zone__name">{label}</h2>
      <p class="player-zone__card-count">
        Cards: {playerState.library.length}
      </p>
      {canReveal && (
        <button
          class="action-btn player-zone__show-btn"
          type="button"
          aria-label={`Show ${label}'s cards`}
          onClick={() => onVisibilityChange(player)}
        >
          Show {label}'s cards
        </button>
      )}
      {isVisible && (
        <button
          class="action-btn player-zone__hide-btn"
          type="button"
          aria-label="Hide all cards"
          onClick={() => onVisibilityChange(null)}
        >
          Hide all cards
        </button>
      )}
      {isVisible && playerState.phase === 'mulligan' && (
        <MulliganHand
          player={player}
          playerState={playerState}
          settings={settings}
          onDispatch={handleDispatch}
        />
      )}
      <div class="action-buttons">
        <DrawButton
          player={player}
          disabled={disabled}
          libraryEmpty={playerState.library.length === 0}
          onDispatch={onDispatch}
          onCardDrawn={handleCardDrawn}
        />
        <button
          class="action-btn"
          type="button"
          disabled={disabled}
          aria-label={`Fetch basic land from ${label}'s library`}
          onClick={() => setShowFetchLand(true)}
        >
          Fetch Land
        </button>
        <button
          class="action-btn"
          type="button"
          disabled={disabled}
          aria-label={`Tutor card from ${label}'s library`}
          onClick={() => setShowTutor(true)}
        >
          Tutor
        </button>
        <button
          class="action-btn"
          type="button"
          disabled={disabled}
          aria-label={`Scry ${label}'s library`}
          onClick={() => setShowScry(true)}
        >
          Scry
        </button>
      </div>
      {showScry && (
        <ScryModal
          player={player}
          libraryLength={playerState.library.length}
          gameState={gameState}
          onDispatch={onDispatch}
          onClose={() => setShowScry(false)}
        />
      )}
      {showFetchLand && (
        <FetchLandModal
          player={player}
          library={playerState.library}
          onDispatch={onDispatch}
          onClose={() => setShowFetchLand(false)}
        />
      )}
      {showTutor && (
        <TutorModal
          player={player}
          library={playerState.library}
          onDispatch={onDispatch}
          onClose={() => setShowTutor(false)}
        />
      )}
      {/* Drawn card is only shown when this player's cards are visible.
          If the player hides all cards (visiblePlayer → null), the drawn card
          is preserved in state and reappears when visibility is restored. */}
      {isVisible && drawnCard && (
        <CardDisplay
          player={player}
          card={drawnCard}
          onDismiss={() => setDrawnCard(null)}
          onReturnToLibrary={handleReturnToLibrary}
        />
      )}
    </section>
  );
}
