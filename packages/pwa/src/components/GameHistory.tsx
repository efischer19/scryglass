import { useRef, useEffect } from 'preact/hooks';
import type { HistoryEntry } from '@scryglass/core';
import { CardImage } from './CardDisplay.js';

interface GameHistoryProps {
  history: HistoryEntry[];
  open: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  LOAD_DECK: 'Load Deck',
  SHUFFLE_LIBRARY: 'Shuffle',
  DRAW_CARD: 'Draw',
  RETURN_TO_LIBRARY: 'Return',
  DEAL_OPENING_HAND: 'Deal Hand',
  MULLIGAN: 'Mulligan',
  KEEP_HAND: 'Keep Hand',
  SCRY_RESOLVE: 'Scry',
  FETCH_BASIC_LAND: 'Fetch Land',
  TUTOR_CARD: 'Tutor',
};

export function GameHistory({ history, open, onClose }: GameHistoryProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      class="game-history"
      role="dialog"
      aria-label="Game History"
      aria-modal="true"
      ref={drawerRef}
    >
      <div class="game-history__header">
        <h2 class="game-history__title">Game History</h2>
        <button
          class="action-btn game-history__close"
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close game history"
        >
          Close
        </button>
      </div>
      <ol class="game-history__list" aria-label="Action history">
        {history.length === 0 ? (
          <li class="game-history__empty">No actions yet</li>
        ) : (
          [...history].reverse().map((entry, i) => (
            <li
              key={history.length - 1 - i}
              class={`game-history__entry game-history__entry--${entry.player.toLowerCase()}`}
            >
              <span class="game-history__badge">
                {ACTION_LABELS[entry.actionType] ?? entry.actionType}
              </span>
              <span class="game-history__description">{entry.description}</span>
              {entry.cards && entry.cards.length > 0 && (
                <div class="game-history__cards">
                  {entry.cards.map((card, ci) => (
                    <div key={ci} class="game-history__card-thumb">
                      <CardImage card={card} />
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
