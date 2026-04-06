import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { parseDeck } from '@scryglass/core';
import type { ConvertResult, UnresolvedCard, Card, CardType, ParseResult } from '@scryglass/core';

/** Scryfall lookup function signature — injectable for testability. */
export type ScryfallLookupFn = (
  cardName: string,
) => Promise<{ setCode: string; collectorNumber: string } | null>;

interface EditorCard {
  /** Unique key for React reconciliation. */
  key: number;
  name: string;
  setCode: string;
  collectorNumber: string;
  cardType: CardType | '';
  quantity: number;
  resolved: boolean;
}

interface DeckEditorProps {
  convertResult: ConvertResult;
  onLoadDeck: (cards: Card[]) => void;
  onCancel: () => void;
  scryfallLookup?: ScryfallLookupFn;
}

const CARD_TYPES: CardType[] = ['land', 'nonland', 'commander'];

/** Build the initial editor card list from a ConvertResult. */
function buildEditorCards(result: ConvertResult): EditorCard[] {
  const cards: EditorCard[] = [];
  let key = 0;

  // Parse the already-resolved output lines
  const parsed = result.output.trim() === '' ? [] : parseDeck(result.output).cards;
  for (const c of parsed) {
    cards.push({
      key: key++,
      name: c.name,
      setCode: c.setCode,
      collectorNumber: c.collectorNumber,
      cardType: c.cardType,
      quantity: 1,
      resolved: true,
    });
  }

  // Add unresolved cards
  for (const u of result.needsResolution) {
    cards.push({
      key: key++,
      name: u.name,
      setCode: u.setCode ?? '',
      collectorNumber: u.collectorNumber ?? '',
      cardType: u.cardType ?? '',
      quantity: u.quantity,
      resolved: false,
    });
  }

  return cards;
}

/** Build scryglass CSV text from editor cards. */
function buildDeckText(cards: EditorCard[]): string {
  const lines: string[] = [];
  for (const c of cards) {
    for (let i = 0; i < c.quantity; i++) {
      lines.push(`${c.name};${c.setCode};${c.collectorNumber};${c.cardType}`);
    }
  }
  return lines.join('\n');
}

function getMissingFields(card: EditorCard): string[] {
  const missing: string[] = [];
  if (!card.setCode) missing.push('set code');
  if (!card.collectorNumber) missing.push('collector number');
  if (!card.cardType) missing.push('card type');
  return missing;
}

function isCardComplete(card: EditorCard): boolean {
  return card.name !== '' && card.setCode !== '' && card.collectorNumber !== '' && card.cardType !== '';
}

const EMPTY_RESULT: ParseResult = { cards: [], warnings: [], errors: [] };

export function DeckEditor({
  convertResult,
  onLoadDeck,
  onCancel,
  scryfallLookup,
}: DeckEditorProps) {
  const [cards, setCards] = useState<EditorCard[]>(() => buildEditorCards(convertResult));
  const [parseResult, setParseResult] = useState<ParseResult>(EMPTY_RESULT);
  const [resolveAllProgress, setResolveAllProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const abortRef = useRef(false);

  // Re-validate whenever cards change
  useEffect(() => {
    const text = buildDeckText(cards);
    if (text.trim() === '') {
      setParseResult(EMPTY_RESULT);
    } else {
      setParseResult(parseDeck(text));
    }
  }, [cards]);

  // Sort: unresolved first, then resolved
  const sortedCards = [...cards].sort((a, b) => {
    const aComplete = isCardComplete(a);
    const bComplete = isCardComplete(b);
    if (aComplete === bComplete) return 0;
    return aComplete ? 1 : -1;
  });

  const unresolvedCount = cards.filter((c) => !isCardComplete(c)).length;
  const allResolved = unresolvedCount === 0;
  const hasErrors = parseResult.errors.length > 0;
  const hasCards = cards.length > 0;
  const canLoad = allResolved && !hasErrors && hasCards;

  const updateCard = useCallback(
    (key: number, field: keyof EditorCard, value: string) => {
      setCards((prev) =>
        prev.map((c) => {
          if (c.key !== key) return c;
          return { ...c, [field]: value, resolved: false };
        }),
      );
    },
    [],
  );

  const handleLoadDeck = () => {
    if (!canLoad) return;
    onLoadDeck(parseResult.cards);
  };

  const handleScryfallLookup = useCallback(
    async (key: number) => {
      if (!scryfallLookup) return;
      const card = cards.find((c) => c.key === key);
      if (!card) return;
      const result = await scryfallLookup(card.name);
      if (result) {
        setCards((prev) =>
          prev.map((c) => {
            if (c.key !== key) return c;
            return {
              ...c,
              setCode: result.setCode,
              collectorNumber: result.collectorNumber,
            };
          }),
        );
      }
    },
    [scryfallLookup, cards],
  );

  const handleResolveAll = useCallback(async () => {
    if (!scryfallLookup) return;
    const unresolved = cards.filter((c) => !isCardComplete(c));
    if (unresolved.length === 0) return;

    abortRef.current = false;
    setResolveAllProgress({ current: 0, total: unresolved.length });

    for (let i = 0; i < unresolved.length; i++) {
      if (abortRef.current) break;
      const card = unresolved[i];
      try {
        const result = await scryfallLookup(card.name);
        if (result) {
          setCards((prev) =>
            prev.map((c) => {
              if (c.key !== card.key) return c;
              return {
                ...c,
                setCode: result.setCode,
                collectorNumber: result.collectorNumber,
              };
            }),
          );
        }
      } catch {
        // Skip failed lookups silently
      }
      setResolveAllProgress({ current: i + 1, total: unresolved.length });
    }

    setResolveAllProgress(null);
  }, [scryfallLookup, cards]);

  return (
    <section class="deck-editor" aria-label="Deck editor">
      <h2 class="deck-editor__title">Deck Editor</h2>
      <p class="deck-editor__summary" role="status" aria-live="polite">
        {unresolvedCount > 0
          ? `${String(unresolvedCount)} card${unresolvedCount === 1 ? '' : 's'} need${unresolvedCount === 1 ? 's' : ''} resolution`
          : 'All cards resolved'}
        {' · '}
        {parseResult.errors.length > 0
          ? `${String(parseResult.errors.length)} error${parseResult.errors.length === 1 ? '' : 's'}`
          : 'No errors'}
        {parseResult.warnings.length > 0 &&
          ` · ${String(parseResult.warnings.length)} warning${parseResult.warnings.length === 1 ? '' : 's'}`}
      </p>

      {/* Resolve All + Progress */}
      {scryfallLookup && unresolvedCount > 0 && (
        <div class="deck-editor__resolve-all">
          <button
            type="button"
            class="deck-editor__resolve-all-btn"
            onClick={handleResolveAll}
            disabled={resolveAllProgress !== null}
          >
            Resolve All via Scryfall
          </button>
          {resolveAllProgress && (
            <div
              class="deck-editor__progress"
              role="progressbar"
              aria-valuenow={resolveAllProgress.current}
              aria-valuemin={0}
              aria-valuemax={resolveAllProgress.total}
              aria-label="Scryfall resolution progress"
            >
              <div
                class="deck-editor__progress-bar"
                style={{ width: `${String(Math.round((resolveAllProgress.current / resolveAllProgress.total) * 100))}%` }}
              />
              <span class="deck-editor__progress-text">
                {resolveAllProgress.current} / {resolveAllProgress.total}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card list */}
      <div class="deck-editor__list" role="list" aria-label="Deck cards">
        {sortedCards.map((card) => {
          const missing = getMissingFields(card);
          const complete = isCardComplete(card);
          const cardTypeId = `card-type-${String(card.key)}`;
          const setCodeId = `set-code-${String(card.key)}`;
          const collectorId = `collector-${String(card.key)}`;
          const errorId = `error-${String(card.key)}`;

          return (
            <div
              key={card.key}
              class={`deck-editor__card ${complete ? '' : 'deck-editor__card--unresolved'}`}
              role="listitem"
              tabIndex={0}
              aria-label={`${card.name}${complete ? '' : ' (unresolved)'}`}
            >
              <div class="deck-editor__card-header">
                <span class="deck-editor__card-name">
                  {!complete && (
                    <span class="deck-editor__badge" aria-hidden="true">
                      ⚠
                    </span>
                  )}
                  {card.quantity > 1 ? `${String(card.quantity)}× ` : ''}
                  {card.name}
                </span>
                {!complete && (
                  <span
                    id={errorId}
                    class="deck-editor__missing"
                    aria-label={`Missing: ${missing.join(', ')}`}
                  >
                    Missing: {missing.join(', ')}
                  </span>
                )}
              </div>

              <div class="deck-editor__card-fields">
                <label class="deck-editor__field">
                  <span class="deck-editor__field-label" id={setCodeId}>
                    Set code
                  </span>
                  <input
                    type="text"
                    class="deck-editor__input"
                    value={card.setCode}
                    aria-labelledby={setCodeId}
                    aria-invalid={!card.setCode ? 'true' : undefined}
                    aria-describedby={!complete ? errorId : undefined}
                    onInput={(e) =>
                      updateCard(card.key, 'setCode', (e.target as HTMLInputElement).value.toLowerCase())
                    }
                  />
                </label>

                <label class="deck-editor__field">
                  <span class="deck-editor__field-label" id={collectorId}>
                    Collector #
                  </span>
                  <input
                    type="text"
                    class="deck-editor__input"
                    value={card.collectorNumber}
                    aria-labelledby={collectorId}
                    aria-invalid={!card.collectorNumber ? 'true' : undefined}
                    aria-describedby={!complete ? errorId : undefined}
                    onInput={(e) =>
                      updateCard(card.key, 'collectorNumber', (e.target as HTMLInputElement).value)
                    }
                  />
                </label>

                <label class="deck-editor__field">
                  <span class="deck-editor__field-label" id={cardTypeId}>
                    Card type
                  </span>
                  <select
                    class="deck-editor__select"
                    value={card.cardType}
                    aria-labelledby={cardTypeId}
                    aria-invalid={!card.cardType ? 'true' : undefined}
                    aria-describedby={!complete ? errorId : undefined}
                    onChange={(e) =>
                      updateCard(card.key, 'cardType', (e.target as HTMLSelectElement).value)
                    }
                  >
                    <option value="">— select —</option>
                    {CARD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                {scryfallLookup && !complete && (
                  <button
                    type="button"
                    class="deck-editor__lookup-btn"
                    onClick={() => void handleScryfallLookup(card.key)}
                    aria-label={`Resolve ${card.name} via Scryfall`}
                  >
                    Resolve via Scryfall
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation details */}
      {(parseResult.warnings.length > 0 || parseResult.errors.length > 0) && (
        <div
          class="deck-editor__validation"
          role="status"
          aria-live="polite"
          aria-label="Validation messages"
        >
          {parseResult.warnings.length > 0 && (
            <ul class="deck-editor__warnings" aria-label="Warnings">
              {parseResult.warnings.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {parseResult.errors.length > 0 && (
            <ul class="deck-editor__errors" aria-label="Errors">
              {parseResult.errors.map((e: string, i: number) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div class="deck-editor__actions">
        <button
          type="button"
          class="deck-editor__load-btn"
          disabled={!canLoad}
          onClick={handleLoadDeck}
          aria-describedby="editor-load-hint"
        >
          Load Deck
        </button>
        <button
          type="button"
          class="deck-editor__cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
        <span id="editor-load-hint" class="deck-editor__hint">
          {!allResolved && 'Resolve all cards before loading.'}
          {allResolved && hasErrors && 'Fix all errors before loading.'}
          {allResolved && !hasErrors && !hasCards && 'No cards to load.'}
        </span>
      </div>
    </section>
  );
}
