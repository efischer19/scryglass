import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { DeckInput } from '../DeckInput.js';
import { saveDeck } from '../../storage/deck-storage.js';

const mockLoadDeck = () => {};

const VALID_DECK = [
  'Island;ltr;715;land',
  'Forest;m21;313;land',
  'Sol Ring;c21;263;nonland',
].join('\n');

const DECK_WITH_ERRORS = [
  'Island;ltr;715;land',
  'Bad Row',
].join('\n');

const DECK_WITH_COMMANDER = [
  'Galadriel, Light of Valinor;ltc;498;commander',
  'Island;ltr;715;land',
].join('\n');

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

describe('<DeckInput />', () => {
  it('renders a labeled textarea with at least 20 rows', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeTruthy();
    expect(Number(textarea.getAttribute('rows'))).toBeGreaterThanOrEqual(20);
  });

  it('renders a placeholder with example format', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('card_name;set_code');
  });

  it('renders a Load Deck button that is initially disabled', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const btn = screen.getByRole('button', { name: /load deck/i });
    expect(btn).toBeTruthy();
    expect(btn).toHaveProperty('disabled', true);
  });

  it('renders export controls with native scryglass option', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    expect(screen.getByLabelText('Export')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'scryglass format' })).toBeTruthy();
  });

  it('shows card counts after entering valid cards', async () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.input(textarea, { target: { value: VALID_DECK } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText(/Total cards: 3/)).toBeTruthy();
      expect(screen.getByText(/Lands: 2/)).toBeTruthy();
      expect(screen.getByText(/Nonlands: 1/)).toBeTruthy();
    });
  });

  it('enables the Load Deck button when cards are valid', async () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.input(textarea, { target: { value: VALID_DECK } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /load deck/i });
      expect(btn).toHaveProperty('disabled', false);
    });
  });

  it('displays errors for malformed rows', async () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.input(textarea, { target: { value: DECK_WITH_ERRORS } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      const errors = screen.getByRole('list', { name: /errors/i });
      expect(errors).toBeTruthy();
      expect(errors.textContent).toContain('Row 2');
    });
  });

  it('keeps Load Deck disabled when errors are present', async () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.input(textarea, { target: { value: DECK_WITH_ERRORS } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /load deck/i });
      expect(btn).toHaveProperty('disabled', true);
    });
  });

  it('shows warnings for commander cards', async () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.input(textarea, { target: { value: DECK_WITH_COMMANDER } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      const warnings = screen.getByRole('list', { name: /warnings/i });
      expect(warnings).toBeTruthy();
      expect(warnings.textContent).toContain('commander');
    });
  });

  it('calls onLoadDeck with parsed cards when Load Deck is clicked', async () => {
    const handleLoad = vi.fn();
    render(<DeckInput onLoadDeck={handleLoad} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.input(textarea, { target: { value: VALID_DECK } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /load deck/i });
      expect(btn).toHaveProperty('disabled', false);
    });

    const btn = screen.getByRole('button', { name: /load deck/i });
    fireEvent.click(btn);
    expect(handleLoad).toHaveBeenCalledTimes(1);
    expect(handleLoad).toHaveBeenCalledWith([
      { name: 'Island', setCode: 'ltr', collectorNumber: '715', cardType: 'land' },
      { name: 'Forest', setCode: 'm21', collectorNumber: '313', cardType: 'land' },
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' },
    ]);
  });

  it('uses a semantic section element with aria-label', () => {
    const { container } = render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const section = container.querySelector('section[aria-label]');
    expect(section).toBeTruthy();
  });

  it('has an aria-live validation summary region', () => {
    const { container } = render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it('has aria-describedby on the Load Deck button', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const btn = screen.getByRole('button', { name: /load deck/i });
    expect(btn.getAttribute('aria-describedby')).toBe('load-btn-hint');
  });

  it('passes vitest-axe a11y assertions', async () => {
    vi.useRealTimers();
    const { container } = render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('<DeckInput /> — deck storage', () => {
  it('renders Saved Decklists fieldset', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    expect(
      screen.getByRole('group', { name: /saved decklists/i }),
    ).toBeTruthy();
  });

  it('renders a Save Deck button', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    expect(
      screen.getByRole('button', { name: /save deck/i }),
    ).toBeTruthy();
  });

  it('renders saved decks dropdown', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const select = screen.getByRole('combobox', { name: /saved decks/i });
    expect(select).toBeTruthy();
  });

  it('shows example decks in dropdown on first use', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const select = screen.getByRole('combobox', { name: /saved decks/i });
    expect(select.textContent).toContain('Good');
    expect(select.textContent).toContain('Evil');
  });

  it('shows "no saved decks" when all decks have been removed after seeding', () => {
    // Mark as already seeded so no examples are injected
    localStorage.setItem('scryglass:seeded', '1');
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const select = screen.getByRole('combobox', { name: /saved decks/i });
    expect(select.textContent).toContain('no saved decks');
  });

  it('lists previously saved decks in dropdown', () => {
    saveDeck('Test Deck', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const select = screen.getByRole('combobox', { name: /saved decks/i });
    expect(select.textContent).toContain('Test Deck');
    expect(select.textContent).toContain('3 cards');
  });

  it('Load Saved button is disabled when no deck selected', () => {
    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const btn = screen.getByRole('button', { name: /load saved/i });
    expect(btn).toHaveProperty('disabled', true);
  });

  it('loads a saved deck into textarea when Load Saved is clicked', async () => {
    saveDeck('My Deck', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const select = screen.getByRole('combobox', { name: /saved decks/i });
    const options = select.querySelectorAll('option');
    const deckOption = Array.from(options).find((o) =>
      o.textContent?.includes('My Deck'),
    );
    expect(deckOption).toBeTruthy();

    fireEvent.change(select, { target: { value: deckOption!.value } });
    fireEvent.click(screen.getByRole('button', { name: /load saved/i }));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe(VALID_DECK);
    });
  });

  it('re-runs validation when loading a saved deck', async () => {
    saveDeck('My Deck', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const select = screen.getByRole('combobox', { name: /saved decks/i });
    const options = select.querySelectorAll('option');
    const deckOption = Array.from(options).find((o) =>
      o.textContent?.includes('My Deck'),
    );
    fireEvent.change(select, { target: { value: deckOption!.value } });
    fireEvent.click(screen.getByRole('button', { name: /load saved/i }));

    await waitFor(() => {
      expect(screen.getByText(/Total cards: 3/)).toBeTruthy();
    });
  });

  it('shows delete confirmation dialog when Delete is clicked', () => {
    saveDeck('My Deck', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const select = screen.getByRole('combobox', { name: /saved decks/i });
    const options = select.querySelectorAll('option');
    const deckOption = Array.from(options).find((o) =>
      o.textContent?.includes('My Deck'),
    );
    fireEvent.change(select, { target: { value: deckOption!.value } });
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByText(/cannot be undone/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /confirm delete/i }),
    ).toBeTruthy();
  });

  it('deletes a deck after confirmation', () => {
    saveDeck('My Deck', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const select = screen.getByRole('combobox', { name: /saved decks/i });
    const options = select.querySelectorAll('option');
    const deckOption = Array.from(options).find((o) =>
      o.textContent?.includes('My Deck'),
    );
    fireEvent.change(select, { target: { value: deckOption!.value } });
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    expect(screen.getByText(/deleted/i)).toBeTruthy();
    const updatedSelect = screen.getByRole('combobox', { name: /saved decks/i });
    expect(updatedSelect.textContent).not.toContain('My Deck');
  });

  it('shows rename input when Rename is clicked', () => {
    saveDeck('My Deck', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const select = screen.getByRole('combobox', { name: /saved decks/i });
    const options = select.querySelectorAll('option');
    const deckOption = Array.from(options).find((o) =>
      o.textContent?.includes('My Deck'),
    );
    fireEvent.change(select, { target: { value: deckOption!.value } });
    fireEvent.click(screen.getByRole('button', { name: /^rename$/i }));

    expect(screen.getByLabelText(/new name/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /confirm rename/i }),
    ).toBeTruthy();
  });

  it('renames a deck and updates the list', () => {
    saveDeck('Old Name', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const select = screen.getByRole('combobox', { name: /saved decks/i });
    const options = select.querySelectorAll('option');
    const deckOption = Array.from(options).find((o) =>
      o.textContent?.includes('Old Name'),
    );
    fireEvent.change(select, { target: { value: deckOption!.value } });
    fireEvent.click(screen.getByRole('button', { name: /^rename$/i }));

    const input = screen.getByLabelText(/new name/i);
    fireEvent.input(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm rename/i }));

    const updatedSelect = screen.getByRole('combobox', { name: /saved decks/i });
    expect(updatedSelect.textContent).toContain('New Name');
    expect(updatedSelect.textContent).not.toContain('Old Name');
  });

  it('shows overwrite confirmation for duplicate name', () => {
    saveDeck('Existing Deck', VALID_DECK, 3);
    vi.spyOn(window, 'prompt').mockReturnValue('Existing Deck');

    render(<DeckInput onLoadDeck={mockLoadDeck} />);
    fireEvent.click(screen.getByRole('button', { name: /save deck/i }));

    expect(screen.getByText(/already exists/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /confirm overwrite/i }),
    ).toBeTruthy();

    vi.restoreAllMocks();
  });

  it('saves a new deck with prompt-provided name', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Brand New Deck');
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.input(textarea, { target: { value: VALID_DECK } });
    vi.advanceTimersByTime(300);

    fireEvent.click(screen.getByRole('button', { name: /save deck/i }));

    expect(screen.getByText(/Brand New Deck" saved/i)).toBeTruthy();
    const select = screen.getByRole('combobox', { name: /saved decks/i });
    expect(select.textContent).toContain('Brand New Deck');

    vi.restoreAllMocks();
  });

  it('restores autosaved content on mount', async () => {
    // Pre-populate autosave
    localStorage.setItem(
      'scryglass:decklists:__autosave__',
      JSON.stringify({ rawText: VALID_DECK, updatedAt: new Date().toISOString() }),
    );

    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    await waitFor(() => {
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe(VALID_DECK);
    });
  });

  it('has accessible confirmation dialog with alertdialog role', () => {
    saveDeck('My Deck', VALID_DECK, 3);
    render(<DeckInput onLoadDeck={mockLoadDeck} />);

    const select = screen.getByRole('combobox', { name: /saved decks/i });
    const options = select.querySelectorAll('option');
    const deckOption = Array.from(options).find((o) =>
      o.textContent?.includes('My Deck'),
    );
    fireEvent.change(select, { target: { value: deckOption!.value } });
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(
      screen.getByRole('alertdialog', { name: /confirmation required/i }),
    ).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions with saved decks', async () => {
    vi.useRealTimers();
    saveDeck('My Deck', VALID_DECK, 3);
    const { container } = render(<DeckInput onLoadDeck={mockLoadDeck} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
