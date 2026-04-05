import { useState, useRef, useEffect } from 'preact/hooks';
import type { Action, ActionResult, Card } from '@scryglass/core';
import { searchLibrary } from '@scryglass/core';
import { ConfirmationGate } from './ConfirmationGate.js';
import { CardDisplay } from './CardDisplay.js';

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

interface TutorModalProps {
  player: 'A' | 'B';
  library: Card[];
  onDispatch: (action: Action) => ActionResult;
  onClose: () => void;
}

export function TutorModal({ player, library, onDispatch, onClose }: TutorModalProps) {
  const [phase, setPhase] = useState<'search' | 'confirm' | 'done'>('search');
  const [query, setQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [tutoredCard, setTutoredCard] = useState<Card | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const label = PLAYER_LABELS[player];

  const filteredCards = searchLibrary(library, query);

  useEffect(() => {
    if (phase === 'search') {
      searchInputRef.current?.focus();
    }
  }, [phase]);

  // Reset active index when the filter results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
    setPhase('confirm');
  };

  const handleConfirm = () => {
    if (!selectedCard) return;
    // JIT image fetch stub — integration point with Ticket 17
    const result = onDispatch({
      type: 'TUTOR_CARD',
      payload: { player, cardName: selectedCard.name },
    });
    setTutoredCard(result.card ?? null);
    setPhase('done');
  };

  const handleCancel = () => {
    if (phase === 'confirm') {
      setSelectedCard(null);
      setPhase('search');
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (phase !== 'search') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filteredCards.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? -1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < filteredCards.length) {
      e.preventDefault();
      handleSelectCard(filteredCards[activeIndex]);
    } else if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  if (phase === 'confirm' && selectedCard) {
    return (
      <ConfirmationGate
        message={`Tutor ${selectedCard.name} from ${label}'s library?`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div
      class="tutor-modal"
      role="dialog"
      aria-label={`Tutor card from ${label}'s library`}
      aria-modal="true"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {phase === 'done' ? (
        <div class="tutor-modal__done">
          <CardDisplay player={player} card={tutoredCard} />
          <button
            class="action-btn"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      ) : (
        <div class="tutor-modal__search">
          <input
            class="tutor-modal__input"
            type="text"
            aria-label={`Search ${label}'s library`}
            value={query}
            ref={searchInputRef}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
          <ul
            class="tutor-modal__list"
            role="listbox"
            aria-label={`${label}'s library cards`}
          >
            {filteredCards.length === 0 ? (
              <li class="tutor-modal__no-results" role="option" aria-selected="false">
                No matching cards
              </li>
            ) : (
              filteredCards.map((card, index) => (
                <li
                  key={`${card.setCode}-${card.collectorNumber}-${index}`}
                  class={`tutor-modal__option${activeIndex === index ? ' tutor-modal__option--active' : ''}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onClick={() => handleSelectCard(card)}
                >
                  <span class="tutor-modal__card-name">{card.name}</span>
                  <span class="tutor-modal__card-type">{card.cardType}</span>
                </li>
              ))
            )}
          </ul>
          <button
            class="action-btn"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
