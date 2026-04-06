import { useState, useRef, useEffect } from 'preact/hooks';
import type { Action, ActionResult, Card, ScryDecision } from '@scryglass/core';
import { peekTop } from '@scryglass/core';
import type { GameState } from '@scryglass/core';
import { ConfirmationGate } from './ConfirmationGate.js';
import { CardDisplay, CardImage } from './CardDisplay.js';

type Destination = 'top' | 'bottom' | 'remove';

interface ScryModalProps {
  player: 'A' | 'B';
  libraryLength: number;
  gameState: GameState;
  onDispatch: (action: Action) => ActionResult;
  onClose: () => void;
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

export function ScryModal({ player, libraryLength, gameState, onDispatch, onClose }: ScryModalProps) {
  const [phase, setPhase] = useState<'confirm' | 'count' | 'decide' | 'done'>('confirm');
  const [count, setCount] = useState(1);
  const [peekedCards, setPeekedCards] = useState<Card[]>([]);
  const [destinations, setDestinations] = useState<Map<number, Destination>>(new Map());
  const [topOrder, setTopOrder] = useState<number[]>([]);
  const [removedCards, setRemovedCards] = useState<Card[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const label = PLAYER_LABELS[player];

  useEffect(() => {
    if (phase === 'count' || phase === 'decide') {
      modalRef.current?.focus();
    }
  }, [phase]);

  const handleConfirmScry = () => {
    setPhase('count');
  };

  const handleCancelScry = () => {
    onClose();
  };

  const handleCountSubmit = () => {
    const cards = peekTop(gameState, player, count);
    setPeekedCards(cards);
    setDestinations(new Map());
    setTopOrder([]);
    setPhase('decide');
  };

  const handleDestinationChange = (cardIndex: number, destination: Destination) => {
    const newDestinations = new Map(destinations);
    newDestinations.set(cardIndex, destination);
    setDestinations(newDestinations);

    // Update top order
    if (destination === 'top') {
      setTopOrder(prev => {
        if (!prev.includes(cardIndex)) return [...prev, cardIndex];
        return prev;
      });
    } else {
      setTopOrder(prev => prev.filter(i => i !== cardIndex));
    }
  };

  const handleMoveUp = (cardIndex: number) => {
    setTopOrder(prev => {
      const idx = prev.indexOf(cardIndex);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const handleMoveDown = (cardIndex: number) => {
    setTopOrder(prev => {
      const idx = prev.indexOf(cardIndex);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const allAssigned = peekedCards.length > 0 && destinations.size === peekedCards.length;

  const handleConfirmDecisions = () => {
    // Build decisions array: top cards in topOrder, then rest
    const decisions: ScryDecision[] = [];

    // First, add top cards in their reordered order
    for (const cardIndex of topOrder) {
      decisions.push({ cardIndex, destination: 'top' });
    }

    // Then bottom and remove in original order
    for (let i = 0; i < peekedCards.length; i++) {
      const dest = destinations.get(i);
      if (dest === 'bottom' || dest === 'remove') {
        decisions.push({ cardIndex: i, destination: dest });
      }
    }

    const result = onDispatch({
      type: 'SCRY_RESOLVE',
      payload: { player, decisions },
    });

    setRemovedCards(result.cards ?? []);
    setPhase('done');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (phase === 'confirm') {
    return (
      <ConfirmationGate
        message={`Scry ${label}'s library?`}
        onConfirm={handleConfirmScry}
        onCancel={handleCancelScry}
      />
    );
  }

  if (phase === 'done') {
    return (
      <div
        class="scry-modal"
        role="dialog"
        aria-label={`Scry results for ${label}`}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        {removedCards.length > 0 ? (
          <div class="scry-modal__removed">
            <p>Removed from library:</p>
            {removedCards.map((card, i) => (
              <CardDisplay key={i} player={player} card={card} />
            ))}
          </div>
        ) : (
          <p>Scry complete — no cards removed.</p>
        )}
        <button
          class="action-btn"
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      class="scry-modal"
      role="dialog"
      aria-label={`Scry ${label}'s library`}
      aria-modal="true"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {phase === 'count' && (
        <div class="scry-modal__count">
          <label>
            How many cards to look at?
            <input
              type="number"
              min={1}
              max={libraryLength}
              value={count}
              aria-label="Number of cards to look at"
              onInput={(e) => {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(val)) setCount(Math.max(1, Math.min(val, libraryLength)));
              }}
            />
          </label>
          <button class="action-btn" type="button" onClick={handleCountSubmit}>
            Look
          </button>
          <button class="action-btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      )}

      {phase === 'decide' && (
        <div class="scry-modal__decide">
          <p>Top of library → Bottom of library</p>
          <div aria-live="polite" class="sr-only" id="scry-live-region" />
          <ul class="scry-modal__card-list">
            {peekedCards.map((card, i) => {
              const dest = destinations.get(i);
              const isTop = dest === 'top';
              const topIdx = topOrder.indexOf(i);
              return (
                <li key={i} class="scry-modal__card-item">
                  <div class="scry-modal__card-thumb">
                    <CardImage card={card} />
                  </div>
                  <div class="scry-modal__card-controls">
                  <span class="scry-modal__card-name">{card.name}</span>
                  <div role="radiogroup" aria-label={`Destination for ${card.name}`}>
                    <label>
                      <input
                        type="radio"
                        name={`scry-dest-${i}`}
                        value="top"
                        role="radio"
                        checked={dest === 'top'}
                        aria-checked={dest === 'top' ? 'true' : 'false'}
                        onChange={() => {
                          handleDestinationChange(i, 'top');
                          const liveRegion = document.getElementById('scry-live-region');
                          if (liveRegion) liveRegion.textContent = `${card.name} set to keep on top`;
                        }}
                      />
                      Keep on Top
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`scry-dest-${i}`}
                        value="bottom"
                        role="radio"
                        checked={dest === 'bottom'}
                        aria-checked={dest === 'bottom' ? 'true' : 'false'}
                        onChange={() => {
                          handleDestinationChange(i, 'bottom');
                          const liveRegion = document.getElementById('scry-live-region');
                          if (liveRegion) liveRegion.textContent = `${card.name} set to send to bottom`;
                        }}
                      />
                      Send to Bottom
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`scry-dest-${i}`}
                        value="remove"
                        role="radio"
                        checked={dest === 'remove'}
                        aria-checked={dest === 'remove' ? 'true' : 'false'}
                        onChange={() => {
                          handleDestinationChange(i, 'remove');
                          const liveRegion = document.getElementById('scry-live-region');
                          if (liveRegion) liveRegion.textContent = `${card.name} set to remove from library`;
                        }}
                      />
                      Remove from Library
                    </label>
                  </div>
                  {isTop && topOrder.length > 1 && (
                    <div class="scry-modal__reorder">
                      <button
                        class="action-btn action-btn--small"
                        type="button"
                        disabled={topIdx === 0}
                        aria-label={`Move ${card.name} up in scry order`}
                        onClick={() => handleMoveUp(i)}
                      >
                        Move Up
                      </button>
                      <button
                        class="action-btn action-btn--small"
                        type="button"
                        disabled={topIdx === topOrder.length - 1}
                        aria-label={`Move ${card.name} down in scry order`}
                        onClick={() => handleMoveDown(i)}
                      >
                        Move Down
                      </button>
                    </div>
                  )}
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            class="action-btn"
            type="button"
            disabled={!allAssigned}
            onClick={handleConfirmDecisions}
          >
            Confirm Scry
          </button>
          <button class="action-btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
