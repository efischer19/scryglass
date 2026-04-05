import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { parseDeck } from '@scryglass/core';
import type { ParseResult, Action, Card } from '@scryglass/core';

interface DeckInputProps {
  onLoadDeck: (cards: Card[]) => void;
}

const PLACEHOLDER = `card_name;set_code;collector_number;card_type
Galadriel, Light of Valinor;ltc;498;commander
Island;ltr;715;land
Andúril, Flame of the West;ltr;687;nonland`;

const EMPTY_RESULT: ParseResult = { cards: [], warnings: [], errors: [] };

export function DeckInput({ onLoadDeck }: DeckInputProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult>(EMPTY_RESULT);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInput = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value;
    setText(value);
    runParse(value);
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
    onLoadDeck(result.cards);
  };

  return (
    <section class="deck-input" aria-label="Deck input">
      <h2 class="deck-input__title">Enter Your Decklist</h2>
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
        <span id="load-btn-hint" class="deck-input__hint">
          {!hasCards && 'Enter at least one valid card to load the deck.'}
          {hasCards && hasErrors && 'Fix all errors before loading the deck.'}
        </span>
      </div>
    </section>
  );
}
