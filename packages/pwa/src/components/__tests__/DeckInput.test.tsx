import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { DeckInput } from '../DeckInput.js';

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
