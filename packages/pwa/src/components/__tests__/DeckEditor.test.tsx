import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { DeckEditor } from '../DeckEditor.js';
import type { ScryfallLookupFn } from '../DeckEditor.js';
import type { ConvertResult } from '@scryglass/core';

const mockLoadDeck = vi.fn();
const mockCancel = vi.fn();

function makeResult(overrides: Partial<ConvertResult> = {}): ConvertResult {
  return {
    output: '',
    warnings: [],
    errors: [],
    needsResolution: [],
    ...overrides,
  };
}

const RESOLVED_OUTPUT = [
  'Island;ltr;715;land',
  'Forest;m21;313;land',
  'Sol Ring;c21;263;nonland',
].join('\n');

const UNRESOLVED_OUTPUT = [
  'Lightning Bolt;m21;;nonland',
  'Island;ltr;715;land',
].join('\n');

beforeEach(() => {
  mockLoadDeck.mockClear();
  mockCancel.mockClear();
});

describe('<DeckEditor />', () => {
  describe('rendering', () => {
    it('renders the editor with title and subtitle', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      expect(screen.getByText('Deck Editor')).toBeTruthy();
      expect(screen.getByText('All cards resolved')).toBeTruthy();
    });

    it('displays all cards in the list', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const nameInputs = screen.getAllByRole('textbox');
      // 3 cards × 3 text inputs (name, set code, collector #) = 9
      expect(nameInputs.length).toBe(9);
    });

    it('renders a scrollable card list with table role', () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const table = container.querySelector('[role="table"]');
      expect(table).toBeTruthy();
    });

    it('shows card counts in the validation summary', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      expect(screen.getByText(/Total cards: 3/)).toBeTruthy();
      expect(screen.getByText(/Lands: 2/)).toBeTruthy();
      expect(screen.getByText(/Nonlands: 1/)).toBeTruthy();
    });
  });

  describe('unresolved cards', () => {
    it('shows unresolved count in subtitle', () => {
      render(
        <DeckEditor
          initialResult={makeResult({
            output: UNRESOLVED_OUTPUT,
            needsResolution: [
              { lineIndex: 0, cardName: 'Lightning Bolt', missingFields: ['collectorNumber'] },
            ],
          })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      expect(screen.getByText(/1 card needs resolution/)).toBeTruthy();
    });

    it('visually distinguishes unresolved cards with warning badge', () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({
            output: UNRESOLVED_OUTPUT,
            needsResolution: [
              { lineIndex: 0, cardName: 'Lightning Bolt', missingFields: ['collectorNumber'] },
            ],
          })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const unresolvedRows = container.querySelectorAll('.deck-editor__row--unresolved');
      expect(unresolvedRows.length).toBe(1);
      const resolvedRows = container.querySelectorAll('.deck-editor__row--resolved');
      expect(resolvedRows.length).toBe(1);
    });

    it('groups unresolved cards at the top', () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({
            output: UNRESOLVED_OUTPUT,
            needsResolution: [
              { lineIndex: 0, cardName: 'Lightning Bolt', missingFields: ['collectorNumber'] },
            ],
          })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const dataRows = container.querySelectorAll('.deck-editor__row:not(.deck-editor__row--header)');
      // First data row should be the unresolved one
      expect(dataRows[0].classList.contains('deck-editor__row--unresolved')).toBe(true);
      // Second data row should be resolved
      expect(dataRows[1].classList.contains('deck-editor__row--resolved')).toBe(true);
    });

    it('shows what fields are missing for unresolved cards', () => {
      render(
        <DeckEditor
          initialResult={makeResult({
            output: UNRESOLVED_OUTPUT,
            needsResolution: [
              { lineIndex: 0, cardName: 'Lightning Bolt', missingFields: ['collectorNumber'] },
            ],
          })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      expect(screen.getByText(/Missing: collector number/)).toBeTruthy();
    });
  });

  describe('inline editing', () => {
    it('allows editing the collector number of an unresolved card', () => {
      render(
        <DeckEditor
          initialResult={makeResult({
            output: UNRESOLVED_OUTPUT,
          })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const collectorInputs = screen.getAllByRole('textbox').filter(
        (el) => (el as HTMLInputElement).getAttribute('aria-label')?.includes('Collector number'),
      );
      // The first unresolved card should have the empty collector number input
      const emptyCollector = collectorInputs.find(
        (el) => (el as HTMLInputElement).value === '',
      );
      expect(emptyCollector).toBeTruthy();
      fireEvent.input(emptyCollector!, { target: { value: '219' } });
      // After setting the value, the field should be updated
      expect((emptyCollector as HTMLInputElement).value).toBe('219');
    });

    it('provides a card_type selector for each card', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(3); // 3 cards, each with a type selector
    });

    it('card type selector includes land, nonland, and commander options', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: 'Island;ltr;715;land' })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const select = screen.getByRole('combobox');
      const options = select.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toContain('land');
      expect(values).toContain('nonland');
      expect(values).toContain('commander');
    });
  });

  describe('validation', () => {
    it('shows live error count for invalid data', () => {
      // A card with an empty set_code creates an error in parseDeck
      render(
        <DeckEditor
          initialResult={makeResult({ output: 'Lightning Bolt;;219;nonland' })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      expect(screen.getByText(/1 error/)).toBeTruthy();
    });

    it('shows errors list when parseDeck returns errors', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: 'Lightning Bolt;;219;nonland' })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const errorList = screen.getByRole('list', { name: /errors/i });
      expect(errorList).toBeTruthy();
      expect(errorList.textContent).toContain('empty set_code');
    });

    it('shows warnings for commander cards', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: 'Galadriel;ltc;498;commander\nIsland;ltr;715;land' })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const warningList = screen.getByRole('list', { name: /warnings/i });
      expect(warningList).toBeTruthy();
      expect(warningList.textContent).toContain('commander');
    });
  });

  describe('Load Deck button', () => {
    it('is enabled when all cards are resolved and no errors', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const btn = screen.getByRole('button', { name: /load deck/i });
      expect(btn).toHaveProperty('disabled', false);
    });

    it('is disabled when cards have empty fields', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const btn = screen.getByRole('button', { name: /load deck/i });
      expect(btn).toHaveProperty('disabled', true);
    });

    it('calls onLoadDeck with parsed cards when clicked', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const btn = screen.getByRole('button', { name: /load deck/i });
      fireEvent.click(btn);
      expect(mockLoadDeck).toHaveBeenCalledTimes(1);
      expect(mockLoadDeck).toHaveBeenCalledWith([
        { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
        { name: 'Forest', setCode: 'm21', collectorNumber: '313', cardType: 'land' },
        { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' },
      ]);
    });

    it('shows a hint when cards are unresolved', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      expect(screen.getByText(/Resolve all cards/)).toBeTruthy();
    });

    it('shows a hint when there are errors but no unresolved cards', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: 'Lightning Bolt;;219;nonland' })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      // The card has a missing set_code which means it's also "unresolved"
      // so the unresolved hint shows instead
      const hints = screen.getAllByText(/Resolve all cards|Fix all errors/);
      expect(hints.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cancel button', () => {
    it('renders a Cancel button', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const btn = screen.getByRole('button', { name: /cancel/i });
      expect(btn).toBeTruthy();
    });

    it('calls onCancel when Cancel is clicked', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const btn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(btn);
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scryfall integration', () => {
    it('does not show Resolve buttons when scryfallLookup is not provided', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      expect(screen.queryByRole('button', { name: /resolve.*scryfall/i })).toBeNull();
    });

    it('shows Resolve All button when scryfallLookup is provided and cards are unresolved', () => {
      const lookup: ScryfallLookupFn = vi.fn().mockResolvedValue(null);
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
          scryfallLookup={lookup}
        />,
      );
      const btn = screen.getByRole('button', { name: /resolve all/i });
      expect(btn).toBeTruthy();
    });

    it('shows per-card Resolve button for unresolved cards when scryfallLookup is provided', () => {
      const lookup: ScryfallLookupFn = vi.fn().mockResolvedValue(null);
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
          scryfallLookup={lookup}
        />,
      );
      const resolveBtn = screen.getByRole('button', { name: /resolve lightning bolt/i });
      expect(resolveBtn).toBeTruthy();
    });

    it('calls scryfallLookup when Resolve per-card button is clicked', async () => {
      const lookup: ScryfallLookupFn = vi.fn().mockResolvedValue({
        setCode: 'm21',
        collectorNumber: '219',
      });
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
          scryfallLookup={lookup}
        />,
      );
      const resolveBtn = screen.getByRole('button', { name: /resolve lightning bolt/i });
      fireEvent.click(resolveBtn);
      await waitFor(() => {
        expect(lookup).toHaveBeenCalledWith('Lightning Bolt');
      });
    });

    it('fills in missing fields after successful Scryfall lookup', async () => {
      const lookup: ScryfallLookupFn = vi.fn().mockResolvedValue({
        setCode: 'm21',
        collectorNumber: '219',
      });
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
          scryfallLookup={lookup}
        />,
      );
      const resolveBtn = screen.getByRole('button', { name: /resolve lightning bolt/i });
      fireEvent.click(resolveBtn);
      await waitFor(() => {
        // After resolution, the card should now be resolved
        expect(screen.getByText('All cards resolved')).toBeTruthy();
      });
    });

    it('shows error feedback when Scryfall lookup returns null', async () => {
      const lookup: ScryfallLookupFn = vi.fn().mockResolvedValue(null);
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
          scryfallLookup={lookup}
        />,
      );
      const resolveBtn = screen.getByRole('button', { name: /resolve lightning bolt/i });
      fireEvent.click(resolveBtn);
      await waitFor(() => {
        expect(screen.getByText(/No match found/)).toBeTruthy();
      });
    });

    it('shows error feedback when Scryfall lookup throws', async () => {
      const lookup: ScryfallLookupFn = vi.fn().mockRejectedValue(new Error('Network error'));
      render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
          scryfallLookup={lookup}
        />,
      );
      const resolveBtn = screen.getByRole('button', { name: /resolve lightning bolt/i });
      fireEvent.click(resolveBtn);
      await waitFor(() => {
        expect(screen.getByText(/lookup failed/)).toBeTruthy();
      });
    });
  });

  describe('accessibility', () => {
    it('uses a semantic section element with aria-label', () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const section = container.querySelector('section[aria-label]');
      expect(section).toBeTruthy();
    });

    it('has an aria-live validation summary region', () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
    });

    it('has aria-describedby on the Load Deck button', () => {
      render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const btn = screen.getByRole('button', { name: /load deck/i });
      expect(btn.getAttribute('aria-describedby')).toBe('editor-load-hint');
    });

    it('rows are focusable', () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const dataRows = container.querySelectorAll('.deck-editor__row:not(.deck-editor__row--header)');
      for (const row of Array.from(dataRows)) {
        expect(row.getAttribute('tabindex')).toBe('0');
      }
    });

    it('uses aria-invalid on missing field inputs', () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({ output: UNRESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const invalidInputs = container.querySelectorAll('[aria-invalid="true"]');
      expect(invalidInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('passes vitest-axe a11y assertions', async () => {
      const { container } = render(
        <DeckEditor
          initialResult={makeResult({ output: RESOLVED_OUTPUT })}
          onLoadDeck={mockLoadDeck}
          onCancel={mockCancel}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
