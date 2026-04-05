import { useEffect, useRef } from 'preact/hooks';

interface ConfirmationGateProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationGate({ message, onConfirm, onCancel }: ConfirmationGateProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Tab') {
      // Trap focus within the gate
      const focusable = gateRef.current?.querySelectorAll<HTMLElement>('button');
      if (focusable && focusable.length > 0) {
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

  return (
    <div
      class="confirmation-gate"
      role="alertdialog"
      aria-label="Confirmation"
      aria-describedby="confirmation-gate-message"
      ref={gateRef}
      onKeyDown={handleKeyDown}
    >
      <p id="confirmation-gate-message" class="confirmation-gate__message">{message}</p>
      <div class="confirmation-gate__actions">
        <button
          class="action-btn confirmation-gate__confirm"
          type="button"
          ref={confirmRef}
          onClick={onConfirm}
        >
          Yes
        </button>
        <button
          class="action-btn confirmation-gate__cancel"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
