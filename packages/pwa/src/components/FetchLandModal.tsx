import { useState, useRef, useEffect } from 'preact/hooks';
import type { Action, ActionResult, Card, LandType, PlayerId } from '@scryglass/core';
import { getBasicLandCounts, BASIC_LAND_TYPES } from '@scryglass/core';
import { ConfirmationGate } from './ConfirmationGate.js';
import { CardDisplay } from './CardDisplay.js';

interface FetchLandModalProps {
  player: PlayerId;
  library: Card[];
  onDispatch: (action: Action) => ActionResult;
  onClose: () => void;
}

export function FetchLandModal({ player, library, onDispatch, onClose }: FetchLandModalProps) {
  const [phase, setPhase] = useState<'select' | 'confirm' | 'done'>('select');
  const [selectedLandType, setSelectedLandType] = useState<LandType | null>(null);
  const [fetchedCard, setFetchedCard] = useState<Card | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = `Player ${player}`;

  const counts = getBasicLandCounts(library);
  const hasAnyLands = BASIC_LAND_TYPES.some(lt => (counts[lt] ?? 0) > 0);

  useEffect(() => {
    modalRef.current?.focus();
  }, [phase]);

  const handleSelectLandType = (landType: LandType) => {
    setSelectedLandType(landType);
    setPhase('confirm');
  };

  const handleConfirm = () => {
    if (!selectedLandType) return;
    const result = onDispatch({
      type: 'FETCH_BASIC_LAND',
      payload: { player, landType: selectedLandType },
    });
    setFetchedCard(result.card ?? null);
    setPhase('done');
  };

  const handleCancel = () => {
    if (phase === 'confirm') {
      setSelectedLandType(null);
      setPhase('select');
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  if (phase === 'confirm' && selectedLandType) {
    return (
      <ConfirmationGate
        message={`Fetch ${selectedLandType} from ${label}'s library?`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div
      class="fetch-land-modal"
      role="dialog"
      aria-label={`Fetch basic land from ${label}'s library`}
      aria-modal="true"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {phase === 'done' ? (
        <div class="fetch-land-modal__done">
          <CardDisplay player={player} card={fetchedCard} />
          <button
            class="action-btn"
            type="button"
            ref={triggerRef}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      ) : (
        <div class="fetch-land-modal__select">
          {!hasAnyLands ? (
            <>
              <p>No basic lands remaining</p>
              <button
                class="action-btn"
                type="button"
                onClick={onClose}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <p>Choose a basic land type to fetch:</p>
              <div class="fetch-land-modal__land-buttons">
                {BASIC_LAND_TYPES.map(landType => {
                  const count = counts[landType] ?? 0;
                  const isDisabled = count === 0;
                  return (
                    <button
                      key={landType}
                      class="action-btn"
                      type="button"
                      disabled={isDisabled}
                      aria-label={`Fetch ${landType}, ${count} remaining`}
                      aria-disabled={isDisabled}
                      onClick={() => handleSelectLandType(landType)}
                    >
                      {landType} ({count})
                    </button>
                  );
                })}
              </div>
              <button
                class="action-btn"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
