import { useState, useCallback, useMemo } from 'preact/hooks';
import { parseDeck } from '@scryglass/core';
import type { ConvertResult, Card, ParseResult, NeedsResolutionEntry } from '@scryglass/core';

/**
 * Represents a single card row in the editor.
 * All fields are editable strings; validation happens via parseDeck().
 */
interface EditorRow {
  name: string;
  setCode: string;
  collectorNumber: string;
  cardType: string;
}

/** Function signature for Scryfall card lookups. */
export type ScryfallLookupFn = (
  cardName: string,
) => Promise<{ setCode: string; collectorNumber: string } | null>;

interface DeckEditorProps {
  initialResult: ConvertResult;
  onLoadDeck: (cards: Card[]) => void;
  onCancel: () => void;
  scryfallLookup?: ScryfallLookupFn;
}

/** Parse the semicolon-delimited output into EditorRow objects. */
function parseOutputToRows(output: string): EditorRow[] {
  if (output.trim() === '') return [];
  return output.split('\n').map((line) => {
    const parts = line.split(';');
    return {
      name: (parts[0] ?? '').trim(),
      setCode: (parts[1] ?? '').trim(),
      collectorNumber: (parts[2] ?? '').trim(),
      cardType: (parts[3] ?? '').trim(),
    };
  });
}

/** Reconstruct the semicolon-delimited text from rows. */
function rowsToOutput(rows: EditorRow[]): string {
  return rows
    .map((r) => `${r.name};${r.setCode};${r.collectorNumber};${r.cardType}`)
    .join('\n');
}

/** Check which fields are missing on a row. */
function getMissingFields(row: EditorRow): string[] {
  const missing: string[] = [];
  if (!row.setCode) missing.push('set code');
  if (!row.collectorNumber) missing.push('collector number');
  if (!row.cardType) missing.push('card type');
  return missing;
}

const VALID_CARD_TYPES = ['land', 'nonland', 'commander'];

const EMPTY_PARSE: ParseResult = { cards: [], warnings: [], errors: [] };

export function DeckEditor({
  initialResult,
  onLoadDeck,
  onCancel,
  scryfallLookup,
}: DeckEditorProps) {
  const [rows, setRows] = useState<EditorRow[]>(() =>
    parseOutputToRows(initialResult.output),
  );

  const [resolveProgress, setResolveProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const [resolveErrors, setResolveErrors] = useState<Map<number, string>>(
    () => new Map(),
  );

  // Validate current rows through parseDeck()
  const parseResult = useMemo<ParseResult>(() => {
    if (rows.length === 0) return EMPTY_PARSE;
    return parseDeck(rowsToOutput(rows));
  }, [rows]);

  // Determine which rows are unresolved
  const unresolvedIndices = useMemo(() => {
    const indices = new Set<number>();
    for (let i = 0; i < rows.length; i++) {
      if (getMissingFields(rows[i]).length > 0) {
        indices.add(i);
      }
    }
    return indices;
  }, [rows]);

  const unresolvedCount = unresolvedIndices.size;
  const hasErrors = parseResult.errors.length > 0;
  const canLoad =
    parseResult.cards.length > 0 && !hasErrors && unresolvedCount === 0;

  // Sort indices: unresolved first, then resolved
  const sortedIndices = useMemo(() => {
    const unresolved: number[] = [];
    const resolved: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (unresolvedIndices.has(i)) {
        unresolved.push(i);
      } else {
        resolved.push(i);
      }
    }
    return [...unresolved, ...resolved];
  }, [rows, unresolvedIndices]);

  const updateRow = useCallback(
    (index: number, field: keyof EditorRow, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const handleLoadDeck = () => {
    if (!canLoad) return;
    onLoadDeck(parseResult.cards);
  };

  const handleResolveOne = useCallback(
    async (index: number) => {
      if (!scryfallLookup) return;
      const row = rows[index];
      try {
        const result = await scryfallLookup(row.name);
        if (result) {
          setResolveErrors((prev) => {
            const next = new Map(prev);
            next.delete(index);
            return next;
          });
          setRows((prev) => {
            const next = [...prev];
            next[index] = {
              ...next[index],
              setCode: next[index].setCode || result.setCode,
              collectorNumber:
                next[index].collectorNumber || result.collectorNumber,
            };
            return next;
          });
        } else {
          setResolveErrors((prev) => {
            const next = new Map(prev);
            next.set(index, 'No match found on Scryfall');
            return next;
          });
        }
      } catch {
        setResolveErrors((prev) => {
          const next = new Map(prev);
          next.set(index, 'Scryfall lookup failed');
          return next;
        });
      }
    },
    [rows, scryfallLookup],
  );

  const handleResolveAll = useCallback(async () => {
    if (!scryfallLookup) return;
    const toResolve = Array.from(unresolvedIndices);
    if (toResolve.length === 0) return;

    setResolveProgress({ current: 0, total: toResolve.length });

    for (let i = 0; i < toResolve.length; i++) {
      const idx = toResolve[i];
      const row = rows[idx];
      try {
        const result = await scryfallLookup(row.name);
        if (result) {
          setResolveErrors((prev) => {
            const next = new Map(prev);
            next.delete(idx);
            return next;
          });
          setRows((prev) => {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              setCode: next[idx].setCode || result.setCode,
              collectorNumber:
                next[idx].collectorNumber || result.collectorNumber,
            };
            return next;
          });
        } else {
          setResolveErrors((prev) => {
            const next = new Map(prev);
            next.set(idx, 'No match found on Scryfall');
            return next;
          });
        }
      } catch {
        setResolveErrors((prev) => {
          const next = new Map(prev);
          next.set(idx, 'Scryfall lookup failed');
          return next;
        });
      }
      setResolveProgress({ current: i + 1, total: toResolve.length });

      // Rate limit: 100ms between calls (ADR-003)
      if (i < toResolve.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    setResolveProgress(null);
  }, [rows, unresolvedIndices, scryfallLookup]);

  const landCount = parseResult.cards.filter(
    (c) => c.cardType === 'land',
  ).length;
  const nonlandCount = parseResult.cards.filter(
    (c) => c.cardType === 'nonland',
  ).length;

  return (
    <section class="deck-editor" aria-label="Deck editor">
      <h2 class="deck-editor__title">Deck Editor</h2>
      <p class="deck-editor__subtitle">
        {unresolvedCount > 0
          ? `${unresolvedCount} card${unresolvedCount !== 1 ? 's' : ''} need${unresolvedCount === 1 ? 's' : ''} resolution`
          : 'All cards resolved'}
      </p>

      {/* Validation summary */}
      <div
        class="deck-editor__validation"
        role="status"
        aria-live="polite"
        aria-label="Deck validation summary"
      >
        <p class="deck-editor__counts">
          Total cards: {parseResult.cards.length} (Lands: {landCount}, Nonlands:{' '}
          {nonlandCount})
          {parseResult.warnings.length > 0 && (
            <span class="deck-editor__warning-count">
              {' '}
              · {parseResult.warnings.length} warning
              {parseResult.warnings.length !== 1 ? 's' : ''}
            </span>
          )}
          {parseResult.errors.length > 0 && (
            <span class="deck-editor__error-count">
              {' '}
              · {parseResult.errors.length} error
              {parseResult.errors.length !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Resolve All button */}
      {scryfallLookup && unresolvedCount > 0 && (
        <div class="deck-editor__resolve-all">
          <button
            class="deck-editor__resolve-all-btn"
            type="button"
            onClick={handleResolveAll}
            disabled={resolveProgress !== null}
            aria-label="Resolve all unresolved cards via Scryfall"
          >
            Resolve All via Scryfall
          </button>
          {resolveProgress !== null && (
            <div
              class="deck-editor__progress"
              role="progressbar"
              aria-valuenow={resolveProgress.current}
              aria-valuemin={0}
              aria-valuemax={resolveProgress.total}
              aria-label="Scryfall resolution progress"
            >
              <div
                class="deck-editor__progress-bar"
                style={{
                  width: `${(resolveProgress.current / resolveProgress.total) * 100}%`,
                }}
              />
              <span class="deck-editor__progress-text">
                {resolveProgress.current} / {resolveProgress.total}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card list */}
      <div class="deck-editor__list" role="table" aria-label="Card list">
        <div class="deck-editor__row deck-editor__row--header" role="row">
          <span class="deck-editor__cell deck-editor__cell--status" role="columnheader">
            Status
          </span>
          <span class="deck-editor__cell deck-editor__cell--name" role="columnheader">
            Card Name
          </span>
          <span class="deck-editor__cell deck-editor__cell--set" role="columnheader">
            Set Code
          </span>
          <span class="deck-editor__cell deck-editor__cell--collector" role="columnheader">
            Collector #
          </span>
          <span class="deck-editor__cell deck-editor__cell--type" role="columnheader">
            Card Type
          </span>
          {scryfallLookup && (
            <span class="deck-editor__cell deck-editor__cell--actions" role="columnheader">
              Actions
            </span>
          )}
        </div>
        {sortedIndices.map((idx) => {
          const row = rows[idx];
          const isUnresolved = unresolvedIndices.has(idx);
          const missing = getMissingFields(row);
          const rowId = `editor-row-${idx}`;
          const missingId = `missing-${idx}`;

          return (
            <div
              key={idx}
              class={`deck-editor__row ${isUnresolved ? 'deck-editor__row--unresolved' : 'deck-editor__row--resolved'}`}
              role="row"
              tabIndex={0}
              aria-label={`${row.name || 'Unnamed card'}${isUnresolved ? ', needs resolution' : ''}`}
            >
              <span
                class="deck-editor__cell deck-editor__cell--status"
                role="cell"
              >
                {isUnresolved ? (
                  <span
                    class="deck-editor__badge deck-editor__badge--unresolved"
                    aria-label="Unresolved"
                  >
                    ⚠
                  </span>
                ) : (
                  <span
                    class="deck-editor__badge deck-editor__badge--resolved"
                    aria-label="Resolved"
                  >
                    ✓
                  </span>
                )}
              </span>

              <span
                class="deck-editor__cell deck-editor__cell--name"
                role="cell"
              >
                <input
                  type="text"
                  class="deck-editor__input"
                  value={row.name}
                  onInput={(e) =>
                    updateRow(
                      idx,
                      'name',
                      (e.target as HTMLInputElement).value,
                    )
                  }
                  aria-label={`Card name for row ${idx + 1}`}
                />
              </span>

              <span
                class="deck-editor__cell deck-editor__cell--set"
                role="cell"
              >
                <input
                  type="text"
                  class={`deck-editor__input ${missing.includes('set code') ? 'deck-editor__input--missing' : ''}`}
                  value={row.setCode}
                  onInput={(e) =>
                    updateRow(
                      idx,
                      'setCode',
                      (e.target as HTMLInputElement).value,
                    )
                  }
                  aria-label={`Set code for ${row.name || `row ${idx + 1}`}`}
                  aria-invalid={missing.includes('set code') ? 'true' : undefined}
                  aria-describedby={
                    isUnresolved ? missingId : undefined
                  }
                />
              </span>

              <span
                class="deck-editor__cell deck-editor__cell--collector"
                role="cell"
              >
                <input
                  type="text"
                  class={`deck-editor__input ${missing.includes('collector number') ? 'deck-editor__input--missing' : ''}`}
                  value={row.collectorNumber}
                  onInput={(e) =>
                    updateRow(
                      idx,
                      'collectorNumber',
                      (e.target as HTMLInputElement).value,
                    )
                  }
                  aria-label={`Collector number for ${row.name || `row ${idx + 1}`}`}
                  aria-invalid={
                    missing.includes('collector number') ? 'true' : undefined
                  }
                  aria-describedby={
                    isUnresolved ? missingId : undefined
                  }
                />
              </span>

              <span
                class="deck-editor__cell deck-editor__cell--type"
                role="cell"
              >
                <select
                  class={`deck-editor__select ${missing.includes('card type') ? 'deck-editor__select--missing' : ''}`}
                  value={row.cardType}
                  onChange={(e) =>
                    updateRow(
                      idx,
                      'cardType',
                      (e.target as HTMLSelectElement).value,
                    )
                  }
                  aria-label={`Card type for ${row.name || `row ${idx + 1}`}`}
                  aria-invalid={
                    missing.includes('card type') ? 'true' : undefined
                  }
                >
                  {!VALID_CARD_TYPES.includes(row.cardType) && (
                    <option value="">— select —</option>
                  )}
                  {VALID_CARD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </span>

              {scryfallLookup && (
                <span
                  class="deck-editor__cell deck-editor__cell--actions"
                  role="cell"
                >
                  {isUnresolved && (
                    <button
                      class="deck-editor__resolve-btn"
                      type="button"
                      onClick={() => handleResolveOne(idx)}
                      aria-label={`Resolve ${row.name || 'card'} via Scryfall`}
                    >
                      Resolve
                    </button>
                  )}
                </span>
              )}

              {isUnresolved && (
                <span id={missingId} class="deck-editor__missing-hint">
                  Missing: {missing.join(', ')}
                </span>
              )}
              {resolveErrors.has(idx) && (
                <span class="deck-editor__resolve-error" role="alert">
                  {resolveErrors.get(idx)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation detail lists */}
      {parseResult.warnings.length > 0 && (
        <ul class="deck-editor__warnings" aria-label="Warnings">
          {parseResult.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      {parseResult.errors.length > 0 && (
        <ul class="deck-editor__errors" aria-label="Errors">
          {parseResult.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div class="deck-editor__actions">
        <button
          class="deck-editor__load-btn"
          type="button"
          disabled={!canLoad}
          onClick={handleLoadDeck}
          aria-describedby="editor-load-hint"
        >
          Load Deck
        </button>
        <button
          class="deck-editor__cancel-btn"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <span id="editor-load-hint" class="deck-editor__hint">
          {unresolvedCount > 0 &&
            'Resolve all cards before loading the deck.'}
          {unresolvedCount === 0 &&
            hasErrors &&
            'Fix all errors before loading the deck.'}
        </span>
      </div>
    </section>
  );
}
