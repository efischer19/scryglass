import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { parseDeck, convertMoxfield, convertArchidekt, convertMtgoArena } from '@scryglass/core';
import type { ParseResult, Action, Card, SavedDeck, ConvertResult, PlayerId } from '@scryglass/core';
import { ExportDropdown } from './ExportDropdown.js';
import { parseCommandersFromScryglassText } from '../utils/deck-parse.js';
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
  seedExampleDecks,
  StorageQuotaError,
} from '../storage/deck-storage.js';
import { GOOD_DECK_NAME, GOOD_DECK_TEXT, GOOD_DECK_CARD_COUNT, EVIL_DECK_NAME, EVIL_DECK_TEXT, EVIL_DECK_CARD_COUNT } from '../data/example-decks.js';

type ImportFormat = 'scryglass' | 'moxfield' | 'archidekt' | 'mtgo-arena';

interface DeckInputProps {
  player?: PlayerId;
  onLoadDeck: (cards: Card[]) => void;
  onOpenEditor?: (result: ConvertResult) => void;
}

const PLACEHOLDER_SCRYGLASS = `card_name;set_code;collector_number;card_type
Galadriel, Light of Valinor;ltc;498;commander
Island;ltr;715;land
Andúril, Flame of the West;ltr;687;nonland`;

const PLACEHOLDER_MOXFIELD = `Name,Edition,Collector Number,Count,Board
"Galadriel, Light of Valinor",ltc,498,1,Commanders
Island,ltr,715,1,Mainboard`;

const PLACEHOLDER_ARCHIDEKT = `1 Galadriel, Light of Valinor (ltc) 498 [Commander]
1 Island (ltr) 715 [Land]
1 Andúril, Flame of the West (ltr) 687 [Nonland]`;

const PLACEHOLDER_MTGO_ARENA = `Commander
1 Galadriel, Light of Valinor (ltc) 498
Deck
1 Island (ltr) 715
1 Andúril, Flame of the West (ltr) 687`;

const PLACEHOLDERS: Record<ImportFormat, string> = {
  scryglass: PLACEHOLDER_SCRYGLASS,
  moxfield: PLACEHOLDER_MOXFIELD,
  archidekt: PLACEHOLDER_ARCHIDEKT,
  'mtgo-arena': PLACEHOLDER_MTGO_ARENA,
};

const FORMAT_LABELS: Record<ImportFormat, string> = {
  scryglass: 'scryglass (semicolon-delimited)',
  moxfield: 'Moxfield CSV',
  archidekt: 'Archidekt text',
  'mtgo-arena': 'MTGO/Arena',
};

function parseWithFormat(value: string, format: ImportFormat): ParseResult {
  if (format === 'scryglass') {
    return parseDeck(value);
  }

  let converted: ConvertResult;
  switch (format) {
    case 'moxfield':
      converted = convertMoxfield(value);
      break;
    case 'archidekt':
      converted = convertArchidekt(value);
      break;
    case 'mtgo-arena':
      converted = convertMtgoArena(value);
      break;
  }

  // If conversion produced output, parse the scryglass-formatted result
  if (converted.output.trim() !== '') {
    const parsed = parseDeck(converted.output);
    return {
      cards: parsed.cards,
      warnings: [...converted.warnings, ...parsed.warnings],
      errors: [...converted.errors, ...parsed.errors],
    };
  }

  // If conversion produced needsResolution entries, open editor
  return {
    cards: [],
    warnings: converted.warnings,
    errors: converted.errors.length > 0
      ? converted.errors
      : converted.needsResolution.length > 0
        ? ['Some cards need resolution. Use "Edit Deck" to fix them.']
        : [],
  };
}

const EMPTY_RESULT: ParseResult = { cards: [], warnings: [], errors: [] };
const DEBOUNCE_DELAY_MS = 250;
const AUTOSAVE_DELAY_MS = 1000;

export function DeckInput({ player = 'A', onLoadDeck, onOpenEditor }: DeckInputProps) {
  const [text, setText] = useState('');
  const [importFormat, setImportFormat] = useState<ImportFormat>('scryglass');
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
  const formatRef = useRef<ImportFormat>(importFormat);
  formatRef.current = importFormat;

  const refreshDecks = useCallback(() => {
    setSavedDecks(loadAllDecks());
  }, []);

  // Load saved decks and autosave on mount
  useEffect(() => {
    seedExampleDecks([
      { name: GOOD_DECK_NAME, rawText: GOOD_DECK_TEXT, cardCount: GOOD_DECK_CARD_COUNT },
      { name: EVIL_DECK_NAME, rawText: EVIL_DECK_TEXT, cardCount: EVIL_DECK_CARD_COUNT },
    ]);
    refreshDecks();
    const autosave = loadAutosave();
    if (autosave && autosave.rawText.trim() !== '') {
      setText(autosave.rawText);
      setResult(parseWithFormat(autosave.rawText, formatRef.current));
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
        setResult(parseWithFormat(value, formatRef.current));
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

  const handleFormatChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value as ImportFormat;
    setImportFormat(value);
    // Re-parse current text with new format
    if (text.trim() !== '') {
      setResult(parseWithFormat(text, value));
    }
  };

  const landCount = result.cards.filter((c: Card) => c.cardType === 'land').length;
  const nonlandCount = result.cards.filter(
    (c: Card) => c.cardType === 'nonland',
  ).length;
  const hasCards = result.cards.length > 0;
  const hasErrors = result.errors.length > 0;
  const canLoad = hasCards && !hasErrors;
  const commanders = parseCommandersFromScryglassText(text);

  const handleLoadDeck = () => {
    if (!canLoad) return;
    clearAutosave();
    onLoadDeck(result.cards);
  };

  const handleEditDeck = () => {
    if (!onOpenEditor || !hasCards) return;
    const convertResult: ConvertResult = {
      output: text,
      needsResolution: [],
      warnings: result.warnings,
      errors: result.errors,
    };
    onOpenEditor(convertResult);
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
      deck.rawText.trim() === '' ? EMPTY_RESULT : parseWithFormat(deck.rawText, importFormat);
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
    <section class="deck-input" aria-label={`Deck input for Player ${player}`}>
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

      <div class="deck-input__format-row">
        <label class="deck-input__label" for="import-format-select">
          Import format:
        </label>
        <select
          id="import-format-select"
          class="deck-input__select"
          value={importFormat}
          onChange={handleFormatChange}
          aria-label="Import format"
        >
          <option value="scryglass">{FORMAT_LABELS.scryglass}</option>
          <option value="moxfield">{FORMAT_LABELS.moxfield}</option>
          <option value="archidekt">{FORMAT_LABELS.archidekt}</option>
          <option value="mtgo-arena">{FORMAT_LABELS['mtgo-arena']}</option>
        </select>
      </div>

      <label class="deck-input__label" for="deck-textarea">
        Paste your decklist in {FORMAT_LABELS[importFormat]} format:
      </label>
      <textarea
        id="deck-textarea"
        class="deck-input__textarea"
        rows={20}
        placeholder={PLACEHOLDERS[importFormat]}
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
            {result.warnings.map((w: string, i: number) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
        {result.errors.length > 0 && (
          <ul class="deck-input__errors" aria-label="Errors">
            {result.errors.map((e: string, i: number) => (
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
            disabled={!hasCards}
            onClick={handleEditDeck}
          >
            Edit Deck
          </button>
        )}
        <span id="load-btn-hint" class="deck-input__hint">
          {!hasCards && 'Enter at least one valid card to load the deck.'}
          {hasCards && hasErrors && 'Fix all errors before loading the deck.'}
        </span>
      </div>
      <ExportDropdown cards={result.cards} commanders={commanders} />
    </section>
  );
}
