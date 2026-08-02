import { useState } from 'preact/hooks';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { PlayerState, PlayerPhase, Action, ActionResult, Card, GameState, PlayerId } from '@scryglass/core';
import { CardDisplay } from './CardDisplay.js';
import { MulliganHand } from './MulliganHand.js';
import { DrawButton } from './DrawButton.js';
import { ScryModal } from './ScryModal.js';
import { FetchLandModal } from './FetchLandModal.js';
import { TutorModal } from './TutorModal.js';
import { GameZone } from './GameZone.js';
import { createMoveCardAction, createToggleTappedAction, getBattlefieldDropPosition } from './playmat-dnd.js';

interface PlayerZoneProps {
  player: PlayerId;
  playerState: PlayerState;
  otherPlayerPhase: PlayerPhase;
  settings: GameState['settings'];
  gameState: GameState;
  onDispatch: (action: Action) => ActionResult;
  visiblePlayer: PlayerId | null;
  onShowPlayer: (player: PlayerId) => void;
  onHideAll: () => void;
}

function playerLabel(id: PlayerId): string {
  return `Player ${id}`;
}

function PlayerZoneContent({ player, playerState, disabled, onDispatch, handleDispatch, onToggleTapped }: {
  player: PlayerId;
  playerState: PlayerState;
  disabled: boolean;
  onDispatch: (action: Action) => ActionResult;
  handleDispatch: (action: Action) => ActionResult;
  onToggleTapped: (zone: 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone', card: Card, cardId: string) => void;
}) {
  const handleDragEnd = (event: DragEndEvent) => {
    const dragData = event.active.data.current;
    const dropData = event.over?.data.current;

    if (dragData == null || dropData == null) {
      return;
    }

    const fromZone = dragData.fromZone as 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone';
    const toZone = dropData.zone as 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone';
    const card = dragData.card as Card;
    const cardId = dragData.cardId as string;

    if (fromZone === toZone && toZone !== 'battlefield') {
      return;
    }

    const battlefieldSurface = document.getElementById(`zone-surface-${player}-battlefield`);
    const position = toZone === 'battlefield' && battlefieldSurface != null
      ? getBattlefieldDropPosition({
          card,
          fromZone,
          containerRect: battlefieldSurface.getBoundingClientRect(),
          delta: event.delta,
          translatedRect: event.active.rect.current.translated,
        })
      : undefined;

    handleDispatch(createMoveCardAction({ player, card, cardId, fromZone, toZone, position }));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div class="game-zones">
        <GameZone
          player={player}
          zone="battlefield"
          zoneName="Battlefield"
          cards={playerState.battlefield}
          disabled={disabled}
          onToggleTapped={onToggleTapped}
        />
        <GameZone
          player={player}
          zone="hand"
          zoneName="Hand"
          cards={playerState.hand}
          disabled={disabled}
          onToggleTapped={onToggleTapped}
        />
        <GameZone
          player={player}
          zone="graveyard"
          zoneName="Graveyard"
          cards={playerState.graveyard}
          disabled={disabled}
          onToggleTapped={onToggleTapped}
        />
        <GameZone
          player={player}
          zone="exile"
          zoneName="Exile"
          cards={playerState.exile}
          disabled={disabled}
          onToggleTapped={onToggleTapped}
        />
        <GameZone
          player={player}
          zone="commandZone"
          zoneName="Command Zone"
          cards={playerState.commandZone}
          disabled={disabled}
          onToggleTapped={onToggleTapped}
        />
      </div>
    </DndContext>
  );
}

export function PlayerZone({ player, playerState, otherPlayerPhase, settings, gameState, onDispatch, visiblePlayer, onShowPlayer, onHideAll }: PlayerZoneProps) {
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [showScry, setShowScry] = useState(false);
  const [showFetchLand, setShowFetchLand] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const label = playerLabel(player);
  const disabled = playerState.phase !== 'playing' || otherPlayerPhase !== 'playing';

  const isVisible = visiblePlayer === player;
  const canShow = visiblePlayer === null;

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

  const handleDispatch = (action: Action) => {
    const result = onDispatch(action);
    // After keeping hand, hide all cards so the phone can be passed to the other player
    if (action.type === 'KEEP_HAND') {
      onHideAll();
    }
    return result;
  };

  const handleToggleTapped = (zone: 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone', card: Card, cardId: string) => {
    handleDispatch(createToggleTappedAction(player, zone, card, cardId));
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
      <div class="visibility-controls">
        {canShow && (
          <button
            class="action-btn visibility-controls__show"
            type="button"
            onClick={() => onShowPlayer(player)}
            aria-label={`Show ${label}'s cards`}
          >
            Show {label}'s cards
          </button>
        )}
        {isVisible && (
          <button
            class="action-btn visibility-controls__hide"
            type="button"
            onClick={onHideAll}
            aria-label="Hide all cards"
          >
            Hide all cards
          </button>
        )}
      </div>
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
      <PlayerZoneContent
        player={player}
        playerState={playerState}
        disabled={disabled}
        onDispatch={onDispatch}
        handleDispatch={handleDispatch}
        onToggleTapped={handleToggleTapped}
      />
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
      {isVisible && (
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
