import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { parseDeck } from '@scryglass/core';
import type { ParseResult, Card, SavedDeck } from '@scryglass/core';
import type { ConvertResult } from '@scryglass/core';
import {
  loadAllDecks,
  saveDeck,
  getDeckByName,
  overwriteDeck,
  renameDeck,
  deleteDeck,
  saveAutosave,
  loadAutosave,
  clearAutosave,
  StorageQuotaError,
} from '../storage/deck-storage.js';

interface DeckInputProps {
  onLoadDeck: (cards: Card[]) => void;
  onOpenEditor?: (result: ConvertResult) => void;
}

const PLACEHOLDER = `card_name;set_code;collector_number;card_type
Galadriel, Light of Valinor;ltc;498;commander
Island;ltr;715;land
Andúril, Flame of the West;ltr;687;nonland`;

const EMPTY_RESULT: ParseResult = { cards: [], warnings: [], errors: [] };
const DEBOUNCE_DELAY_MS = 250;
const AUTOSAVE_DELAY_MS = 1000;

export function DeckInput({ onLoadDeck, onOpenEditor }: DeckInputProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult>(EMPTY_RESULT);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'overwrite' | 'delete';
    deckId: string;
    deckName: string;
    pendingName?: string;
    pendingText?: string;
    pendingCardCount?: number;
  } | null>(null);
  const [renamingDeckId, setRenamingDeckId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshDecks = useCallback(() => {
    setSavedDecks(loadAllDecks());
  }, []);

  // Load saved decks and autosave on mount
  useEffect(() => {
    refreshDecks();
    const autosave = loadAutosave();
    if (autosave && autosave.rawText.trim() !== '') {
      setText(autosave.rawText);
      setResult(parseDeck(autosave.rawText));
    }
  }, [refreshDecks]);

  const runParse = useCallback((value: string) => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (value.trim() === '') {
        setResult(EMPTY_RESULT);
      } else {
        setResult(parseDeck(value));
      }
    }, DEBOUNCE_DELAY_MS);
  }, []);

  const runAutosave = useCallback((value: string) => {
    if (autosaveRef.current !== null) {
      clearTimeout(autosaveRef.current);
    }
    autosaveRef.current = setTimeout(() => {
      saveAutosave(value);
    }, AUTOSAVE_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      if (autosaveRef.current !== null) clearTimeout(autosaveRef.current);
    };
  }, []);

  const clearMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleInput = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value;
    setText(value);
    runParse(value);
    runAutosave(value);
    clearMessages();
  };

  const landCount = result.cards.filter((c) => c.cardType === 'land').length;
  const nonlandCount = result.cards.filter(
    (c) => c.cardType === 'nonland',
  ).length;
  const hasCards = result.cards.length > 0;
  const hasErrors = result.errors.length > 0;
  const canLoad = hasCards && !hasErrors;

  const handleLoadDeck = () => {
    if (!canLoad) return;
    clearAutosave();
    onLoadDeck(result.cards);
  };

  /* ── Save ── */
  const handleSaveDeck = () => {
    clearMessages();
    const name = prompt('Enter a name for this deck:');
    if (!name || name.trim() === '') return;
    const trimmed = name.trim();

    const existing = getDeckByName(trimmed);
    if (existing) {
      setConfirmAction({
        type: 'overwrite',
        deckId: existing.id,
        deckName: trimmed,
        pendingText: text,
        pendingCardCount: result.cards.length,
      });
      return;
    }

    try {
      saveDeck(trimmed, text, result.cards.length);
      refreshDecks();
      setStatusMessage(`Deck "${trimmed}" saved.`);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setErrorMessage(err.message);
      } else {
        throw err;
      }
    }
  };

  /* ── Load selected ── */
  const handleLoadSaved = () => {
    clearMessages();
    const deck = savedDecks.find((d) => d.id === selectedDeckId);
    if (!deck) return;
    setText(deck.rawText);
    const parsed =
      deck.rawText.trim() === '' ? EMPTY_RESULT : parseDeck(deck.rawText);
    setResult(parsed);
    setStatusMessage(`Deck "${deck.name}" loaded.`);
  };

  /* ── Delete ── */
  const handleDeleteDeck = () => {
    clearMessages();
    const deck = savedDecks.find((d) => d.id === selectedDeckId);
    if (!deck) return;
    setConfirmAction({
      type: 'delete',
      deckId: deck.id,
      deckName: deck.name,
    });
  };

  /* ── Rename ── */
  const handleStartRename = () => {
    clearMessages();
    const deck = savedDecks.find((d) => d.id === selectedDeckId);
    if (!deck) return;
    setRenamingDeckId(deck.id);
    setRenameValue(deck.name);
  };

  const handleConfirmRename = () => {
    if (!renamingDeckId || renameValue.trim() === '') return;
    try {
      renameDeck(renamingDeckId, renameValue.trim());
      refreshDecks();
      setStatusMessage(`Deck renamed to "${renameValue.trim()}".`);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setErrorMessage(err.message);
      } else {
        throw err;
      }
    }
    setRenamingDeckId(null);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setRenamingDeckId(null);
    setRenameValue('');
  };

  /* ── Confirmation actions ── */
  const handleConfirm = () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'overwrite') {
        overwriteDeck(
          confirmAction.deckId,
          confirmAction.pendingText ?? text,
          confirmAction.pendingCardCount ?? result.cards.length,
        );
        refreshDecks();
        setStatusMessage(`Deck "${confirmAction.deckName}" overwritten.`);
      } else if (confirmAction.type === 'delete') {
        deleteDeck(confirmAction.deckId);
        setSelectedDeckId('');
        refreshDecks();
        setStatusMessage(`Deck "${confirmAction.deckName}" deleted.`);
      }
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setErrorMessage(err.message);
      } else {
        throw err;
      }
    }
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setConfirmAction(null);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <section class="deck-input" aria-label="Deck input">
      <h2 class="deck-input__title">Enter Your Decklist</h2>

      {/* ── Saved Decks ── */}
      <fieldset class="deck-input__storage" aria-label="Saved decklists">
        <legend class="deck-input__storage-legend">Saved Decklists</legend>
        <div class="deck-input__storage-row">
          <label for="saved-decks-select" class="deck-input__storage-label">
            Saved decks:
          </label>
          <select
            id="saved-decks-select"
            class="deck-input__select"
            value={selectedDeckId}
            onChange={(e) => {
              setSelectedDeckId((e.target as HTMLSelectElement).value);
              clearMessages();
            }}
            aria-label="Saved decks"
          >
            <option value="">
              {savedDecks.length === 0
                ? '— no saved decks —'
                : '— select a deck —'}
            </option>
            {savedDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cardCount} cards, {formatDate(d.updatedAt)})
              </option>
            ))}
          </select>
          <button
            class="deck-input__storage-btn"
            type="button"
            disabled={!selectedDeckId}
            onClick={handleLoadSaved}
          >
            Load Saved
          </button>
          <button
            class="deck-input__storage-btn"
            type="button"
            disabled={!selectedDeckId}
            onClick={handleStartRename}
          >
            Rename
          </button>
          <button
            class="deck-input__storage-btn deck-input__storage-btn--danger"
            type="button"
            disabled={!selectedDeckId}
            onClick={handleDeleteDeck}
          >
            Delete
          </button>
          <button
            class="deck-input__storage-btn deck-input__storage-btn--save"
            type="button"
            onClick={handleSaveDeck}
          >
            Save Deck
          </button>
        </div>

        {/* Rename inline form */}
        {renamingDeckId && (
          <div class="deck-input__rename" role="group" aria-label="Rename deck">
            <label for="rename-input" class="deck-input__storage-label">
              New name:
            </label>
            <input
              id="rename-input"
              class="deck-input__rename-input"
              type="text"
              value={renameValue}
              onInput={(e) =>
                setRenameValue((e.target as HTMLInputElement).value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRename();
                if (e.key === 'Escape') handleCancelRename();
              }}
            />
            <button
              class="deck-input__storage-btn"
              type="button"
              onClick={handleConfirmRename}
              disabled={renameValue.trim() === ''}
            >
              Confirm Rename
            </button>
            <button
              class="deck-input__storage-btn"
              type="button"
              onClick={handleCancelRename}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Confirmation prompt */}
        {confirmAction && (
          <div
            class="deck-input__confirm"
            role="alertdialog"
            aria-label="Confirmation required"
          >
            <p class="deck-input__confirm-msg">
              {confirmAction.type === 'delete'
                ? `Delete deck "${confirmAction.deckName}"? This cannot be undone.`
                : `A deck named "${confirmAction.deckName}" already exists. Overwrite it?`}
            </p>
            <button
              class="deck-input__storage-btn deck-input__storage-btn--danger"
              type="button"
              onClick={handleConfirm}
            >
              {confirmAction.type === 'delete'
                ? 'Confirm Delete'
                : 'Confirm Overwrite'}
            </button>
            <button
              class="deck-input__storage-btn"
              type="button"
              onClick={handleCancelConfirm}
            >
              Cancel
            </button>
          </div>
        )}
      </fieldset>

      {/* ── Status / Error messages ── */}
      <div role="status" aria-live="polite" aria-label="Storage status">
        {statusMessage && (
          <p class="deck-input__status">{statusMessage}</p>
        )}
        {errorMessage && (
          <p class="deck-input__storage-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <label class="deck-input__label" for="deck-textarea">
        Paste your decklist in scryglass format (semicolon-delimited):
      </label>
      <textarea
        id="deck-textarea"
        class="deck-input__textarea"
        rows={20}
        placeholder={PLACEHOLDER}
        value={text}
        onInput={handleInput}
        spellcheck={false}
      />
      <div
        class="deck-input__validation"
        role="status"
        aria-live="polite"
        aria-label="Deck validation summary"
      >
        <p class="deck-input__counts">
          Total cards: {result.cards.length} (Lands: {landCount}, Nonlands:{' '}
          {nonlandCount})
        </p>
        {result.warnings.length > 0 && (
          <ul class="deck-input__warnings" aria-label="Warnings">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
        {result.errors.length > 0 && (
          <ul class="deck-input__errors" aria-label="Errors">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      <div class="deck-input__actions">
        <button
          class="deck-input__load-btn"
          type="button"
          disabled={!canLoad}
          onClick={handleLoadDeck}
          aria-describedby="load-btn-hint"
        >
          Load Deck
        </button>
        {onOpenEditor && (
          <button
            class="deck-input__edit-btn"
            type="button"
            disabled={text.trim() === ''}
            onClick={() => {
              if (text.trim() === '') return;
              onOpenEditor({
                output: text,
                needsResolution: [],
                warnings: result.warnings,
                errors: result.errors,
              });
            }}
            aria-label="Edit deck in structured editor"
          >
            Edit Deck
          </button>
        )}
        <span id="load-btn-hint" class="deck-input__hint">
          {!hasCards && 'Enter at least one valid card to load the deck.'}
          {hasCards && hasErrors && 'Fix all errors before loading the deck.'}
        </span>
      </div>
    </section>
  );
}
