import { useState, useRef } from 'preact/hooks';
import type { Action, ActionResult, Card } from '@scryglass/core';
import { ConfirmationGate } from './ConfirmationGate.js';

interface DrawButtonProps {
  player: 'A' | 'B';
  disabled: boolean;
  libraryEmpty: boolean;
  onDispatch: (action: Action) => ActionResult;
  onCardDrawn: (card: Card | null) => void;
}

const PLAYER_LABELS: Record<'A' | 'B', string> = {
  A: 'Player A',
  B: 'Player B',
};

export function DrawButton({ player, disabled, libraryEmpty, onDispatch, onCardDrawn }: DrawButtonProps) {
  const [showGate, setShowGate] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = PLAYER_LABELS[player];
  const isDisabled = disabled || libraryEmpty;

  const handleConfirm = () => {
    setShowGate(false);
    try {
      const result = onDispatch({ type: 'DRAW_CARD', payload: { player } });
      onCardDrawn(result.card);
    } catch {
      // The core throws if library is empty — the button should be disabled
      // to prevent this, but handle it gracefully if it occurs.
    }
    buttonRef.current?.focus();
  };

  const handleCancel = () => {
    setShowGate(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        class="action-btn"
        type="button"
        ref={buttonRef}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={`Draw card from ${label}'s library`}
        onClick={() => setShowGate(true)}
      >
        {libraryEmpty ? 'Library Empty' : 'Draw'}
      </button>
      {showGate && (
        <ConfirmationGate
          message={`Draw from ${label}'s library?`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
