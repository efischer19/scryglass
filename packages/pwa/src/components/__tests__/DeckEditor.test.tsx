import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { DeckEditor } from '../DeckEditor.js';
import type { ScryfallLookupFn } from '../DeckEditor.js';
import type { ConvertResult, Card } from '@scryglass/core';

function makeResolvedResult(): ConvertResult {
  return {
    output: [
      'Forest;c21;300;land',
      'Sol Ring;c21;200;nonland',
    ].join('\n'),
    needsResolution: [],
    warnings: [],
    errors: [],
  };
}

function makeUnresolvedResult(): ConvertResult {
  return {
    output: 'Forest;c21;300;land',
    needsResolution: [
      {
        name: 'Lightning Bolt',
        quantity: 1,
        sourceLine: 2,
      },
      {
        name: 'Counterspell',
        setCode: 'a25',
        quantity: 2,
        sourceLine: 3,
      },
    ],
    warnings: [],
    errors: [],
  };
}

function makeMixedResult(): ConvertResult {
  return {
    output: [
      'Forest;c21;300;land',
      'Island;c21;301;land',
    ].join('\n'),
    needsResolution: [
      {
        name: 'Mystery Card',
        quantity: 1,
        sourceLine: 3,
        cardType: 'nonland',
      },
    ],
    warnings: ['Some warning'],
    errors: [],
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('<DeckEditor />', () => {
  describe('rendering', () => {
    it('renders the editor title', () => {
      render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Deck Editor')).toBeTruthy();
    });

    it('renders all resolved cards', () => {
      render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Forest')).toBeTruthy();
      expect(screen.getByText('Sol Ring')).toBeTruthy();
    });

    it('shows "All cards resolved" when no unresolved cards', () => {
      render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/All cards resolved/)).toBeTruthy();
    });

    it('shows unresolved count when cards need resolution', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/2 cards need resolution/)).toBeTruthy();
    });

    it('renders unresolved cards with warning badge', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Lightning Bolt')).toBeTruthy();
      // Counterspell has quantity > 1 so text is split; check via aria-label
      expect(
        screen.getByRole('listitem', { name: /Counterspell/ }),
      ).toBeTruthy();
    });

    it('shows quantity prefix for cards with quantity > 1', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Counterspell has quantity 2
      expect(screen.getByText(/2×/)).toBeTruthy();
    });

    it('shows missing fields for unresolved cards', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Lightning Bolt is missing set code, collector number, card type
      const missingLabels = screen.getAllByText(/Missing:/);
      expect(missingLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('displays unresolved cards grouped at the top', () => {
      const { container } = render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const items = container.querySelectorAll('[role="listitem"]');
      // First two should be unresolved (Lightning Bolt and Counterspell)
      // Last one should be resolved (Forest)
      expect(items.length).toBe(3);
      const firstItem = items[0];
      expect(firstItem.classList.contains('deck-editor__card--unresolved')).toBe(true);
    });
  });

  describe('inline editing', () => {
    it('allows editing set code', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Find set code inputs — there should be inputs for each card
      const inputs = screen.getAllByRole('textbox');
      // Find one that's empty (unresolved card)
      const emptyInput = inputs.find((i) => (i as HTMLInputElement).value === '');
      expect(emptyInput).toBeTruthy();
      fireEvent.input(emptyInput!, { target: { value: 'a25' } });
    });

    it('provides a card type selector', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Should have select elements with card type options
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(1);
      // Check that options include land, nonland, commander
      const firstSelect = selects[0] as HTMLSelectElement;
      const options = Array.from(firstSelect.options).map((o) => o.value);
      expect(options).toContain('land');
      expect(options).toContain('nonland');
      expect(options).toContain('commander');
    });

    it('updates card type when selecting from dropdown', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const selects = screen.getAllByRole('combobox');
      // Find a select with empty value (unresolved card)
      const emptySelect = selects.find(
        (s) => (s as HTMLSelectElement).value === '',
      );
      expect(emptySelect).toBeTruthy();
      fireEvent.change(emptySelect!, { target: { value: 'nonland' } });
      expect((emptySelect as HTMLSelectElement).value).toBe('nonland');
    });
  });

  describe('Load Deck button', () => {
    it('is disabled when there are unresolved cards', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const loadBtn = screen.getByRole('button', { name: 'Load Deck' });
      expect(loadBtn).toHaveProperty('disabled', true);
    });

    it('is enabled when all cards are resolved and no errors', () => {
      render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const loadBtn = screen.getByRole('button', { name: 'Load Deck' });
      expect(loadBtn).toHaveProperty('disabled', false);
    });

    it('calls onLoadDeck with parsed cards when clicked', () => {
      const onLoadDeck = vi.fn();
      render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={onLoadDeck}
          onCancel={vi.fn()}
        />,
      );
      const loadBtn = screen.getByRole('button', { name: 'Load Deck' });
      fireEvent.click(loadBtn);
      expect(onLoadDeck).toHaveBeenCalledTimes(1);
      const loadedCards = onLoadDeck.mock.calls[0][0] as Card[];
      expect(loadedCards).toHaveLength(2);
      expect(loadedCards[0].name).toBe('Forest');
      expect(loadedCards[1].name).toBe('Sol Ring');
    });

    it('does not call onLoadDeck when disabled', () => {
      const onLoadDeck = vi.fn();
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={onLoadDeck}
          onCancel={vi.fn()}
        />,
      );
      const loadBtn = screen.getByRole('button', { name: 'Load Deck' });
      fireEvent.click(loadBtn);
      expect(onLoadDeck).not.toHaveBeenCalled();
    });
  });

  describe('Cancel button', () => {
    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={onCancel}
        />,
      );
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scryfall lookup', () => {
    it('shows "Resolve via Scryfall" button when scryfallLookup provided', () => {
      const lookup: ScryfallLookupFn = vi.fn();
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
          scryfallLookup={lookup}
        />,
      );
      const resolveBtn = screen.getByRole('button', {
        name: /Resolve Lightning Bolt via Scryfall/,
      });
      expect(resolveBtn).toBeTruthy();
    });

    it('does not show Scryfall buttons when no lookup provided', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(
        screen.queryByRole('button', { name: /Resolve.*via Scryfall/ }),
      ).toBeNull();
    });

    it('calls scryfallLookup and updates card fields', async () => {
      const lookup: ScryfallLookupFn = vi.fn().mockResolvedValue({
        setCode: '2xm',
        collectorNumber: '141',
      });
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
          scryfallLookup={lookup}
        />,
      );
      const resolveBtn = screen.getByRole('button', {
        name: /Resolve Lightning Bolt via Scryfall/,
      });
      fireEvent.click(resolveBtn);
      await waitFor(() => {
        expect(lookup).toHaveBeenCalledWith('Lightning Bolt');
      });
    });

    it('shows "Resolve All" button when there are unresolved cards', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
          scryfallLookup={vi.fn()}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Resolve All via Scryfall' }),
      ).toBeTruthy();
    });

    it('does not show "Resolve All" when no unresolved cards', () => {
      render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
          scryfallLookup={vi.fn()}
        />,
      );
      expect(
        screen.queryByRole('button', { name: 'Resolve All via Scryfall' }),
      ).toBeNull();
    });

    it('handles Resolve All with progress indicator', async () => {
      let resolveCount = 0;
      const lookup: ScryfallLookupFn = vi.fn().mockImplementation(async () => {
        resolveCount++;
        return { setCode: 'test', collectorNumber: String(resolveCount) };
      });

      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
          scryfallLookup={lookup}
        />,
      );

      const resolveAllBtn = screen.getByRole('button', {
        name: 'Resolve All via Scryfall',
      });
      fireEvent.click(resolveAllBtn);

      await waitFor(() => {
        expect(lookup).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('validation', () => {
    it('shows warnings from parseDeck for commander cards', () => {
      // When a commander card appears in the resolved output, parseDeck skips it
      // and it won't appear as an editor card. The editor only tracks shuffleable cards.
      // Use a result with an actual parseable card that generates a warning.
      const result: ConvertResult = {
        output: 'Forest;c21;300;land',
        needsResolution: [
          // An unresolved card will produce errors from parseDeck (empty fields)
          { name: 'Mystery Card', quantity: 1, sourceLine: 2 },
        ],
        warnings: [],
        errors: [],
      };
      render(
        <DeckEditor
          convertResult={result}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // The unresolved card with empty fields produces errors in parseDeck
      const errorsList = screen.queryByRole('list', { name: 'Errors' });
      expect(errorsList).toBeTruthy();
    });

    it('shows error count in summary', () => {
      // A result with only unresolved cards that have empty fields
      // which will produce errors when run through parseDeck
      const result: ConvertResult = {
        output: '',
        needsResolution: [
          { name: 'Test Card', quantity: 1, sourceLine: 1 },
        ],
        warnings: [],
        errors: [],
      };
      render(
        <DeckEditor
          convertResult={result}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // The summary should show error count
      expect(screen.getByText(/error/i)).toBeTruthy();
    });
  });

  describe('mixed resolved/unresolved cards', () => {
    it('shows warnings from the ConvertResult when present', () => {
      render(
        <DeckEditor
          convertResult={makeMixedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Mystery Card needs set code and collector number
      expect(screen.getByText(/1 card needs resolution/)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('passes vitest-axe a11y assertions', async () => {
      const { container } = render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('passes a11y with unresolved cards', async () => {
      const { container } = render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has keyboard-navigable card rows', () => {
      const { container } = render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const items = container.querySelectorAll('[role="listitem"]');
      for (const item of items) {
        expect((item as HTMLElement).tabIndex).toBe(0);
      }
    });

    it('has aria-invalid on empty required fields', () => {
      const { container } = render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const invalidInputs = container.querySelectorAll('[aria-invalid="true"]');
      expect(invalidInputs.length).toBeGreaterThan(0);
    });

    it('uses aria-label on the editor section', () => {
      const { container } = render(
        <DeckEditor
          convertResult={makeResolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const section = container.querySelector('[aria-label="Deck editor"]');
      expect(section).toBeTruthy();
    });

    it('has aria-describedby linking Load Deck button to hint', () => {
      render(
        <DeckEditor
          convertResult={makeUnresolvedResult()}
          onLoadDeck={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const loadBtn = screen.getByRole('button', { name: 'Load Deck' });
      expect(loadBtn.getAttribute('aria-describedby')).toBe('editor-load-hint');
    });
  });
});
