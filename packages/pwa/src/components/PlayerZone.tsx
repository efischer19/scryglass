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
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

export function PlayerZone({ player, playerState, otherPlayerPhase, settings, gameState, onDispatch }: PlayerZoneProps) {
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [showScry, setShowScry] = useState(false);
  const [showFetchLand, setShowFetchLand] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const label = PLAYER_LABELS[player];
  const disabled = playerState.phase !== 'playing' || otherPlayerPhase !== 'playing';

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
      <CardDisplay
        player={player}
        card={drawnCard}
        onDismiss={() => setDrawnCard(null)}
        onReturnToLibrary={handleReturnToLibrary}
      />
    </section>
  );
}
