import { useEffect, useRef, useState } from 'preact/hooks';
import type { Card, HiddenCard, HistoryEntry } from '@scrymat/core';
import { isCard } from '@scrymat/core';
import { CardImage } from './CardDisplay.js';
import { copyToClipboard } from '../utils/clipboard.js';

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

type ExportMode = 'copy' | 'download';
type HistoryCardDetail = { card: Card; destination?: string };
type HistoryCardDetails = HistoryCardDetail[];

function downloadText(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getCardDetails(entry: HistoryEntry): HistoryCardDetails {
  if (entry.cardDetails && entry.cardDetails.length > 0) {
    // Filter to only actual cards, not hashes
    return entry.cardDetails.filter(detail => isCard(detail.card)).map(detail => ({ ...detail, card: detail.card as Card }));
  }
  // Filter to only actual cards, not hashes
  return (entry.cards ?? []).filter(isCard).map((card: Card): HistoryCardDetail => ({ card }));
}

export function toHistoryExportText(history: HistoryEntry[]): string {
  return history.flatMap((entry) => {
    const cardDetails = getCardDetails(entry);
    if (cardDetails.length === 0) {
      return [`${entry.actionType}||`];
    }
    return cardDetails.map(({ card, destination }: HistoryCardDetail) => (
      `${entry.actionType}|${card.name}|${destination ?? ''}`
    ));
  }).join('\n');
}

export function GameHistory({ history, open, onClose }: GameHistoryProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState('');

  const canExport = history.length > 0;

  const handleExport = async (mode: ExportMode) => {
    if (!canExport) return;

    const text = toHistoryExportText(history);
    if (mode === 'copy') {
      const copied = await copyToClipboard(text);
      setMessage(
        copied
          ? 'History copied to clipboard.'
          : 'Failed to copy history. Please use Download instead.',
      );
      return;
    }

    downloadText(text, 'game-history.txt', 'text/plain;charset=utf-8');
    setMessage('History downloaded.');
  };

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
      <div class="game-history__actions">
        <button class="action-btn" type="button" disabled={!canExport} onClick={() => handleExport('copy')}>
          Copy Log
        </button>
        <button class="action-btn" type="button" disabled={!canExport} onClick={() => handleExport('download')}>
          Download Log
        </button>
        {message && (
          <p class="game-history__message" role="status" aria-live="polite">
            {message}
          </p>
        )}
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
              {getCardDetails(entry).length > 0 && (
                <div class="game-history__cards">
                  {getCardDetails(entry).map(({ card, destination }: HistoryCardDetail, cardIndex: number) => (
                    <div key={`${card.setCode}-${card.collectorNumber}-${cardIndex}`} class="game-history__card-thumb">
                      <CardImage card={card} />
                      <p class="game-history__card-name">{card.name}</p>
                      {destination && <p class="game-history__card-destination">{destination}</p>}
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
