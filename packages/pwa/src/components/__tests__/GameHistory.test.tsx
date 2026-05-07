import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { GameHistory, toHistoryExportText } from '../GameHistory.js';
import type { HistoryEntry } from '@scryglass/core';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    actionType: 'DRAW_CARD',
    player: 'A',
    description: 'Player A drew a card',
    ...overrides,
  };
}

describe('<GameHistory />', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <GameHistory history={[]} open={false} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the drawer when open', () => {
    render(<GameHistory history={[]} open={true} onClose={() => {}} />);
    expect(screen.getByText('Game History')).toBeTruthy();
  });

  it('shows "No actions yet" when history is empty', () => {
    render(<GameHistory history={[]} open={true} onClose={() => {}} />);
    expect(screen.getByText('No actions yet')).toBeTruthy();
  });

  it('renders history entries in reverse chronological order', () => {
    const entries: HistoryEntry[] = [
      makeEntry({ actionType: 'LOAD_DECK', description: 'Player A loaded a deck (60 cards)' }),
      makeEntry({ actionType: 'SHUFFLE_LIBRARY', description: 'Player A shuffled their library' }),
      makeEntry({ actionType: 'DRAW_CARD', description: 'Player A drew a card' }),
    ];
    render(<GameHistory history={entries} open={true} onClose={() => {}} />);
    const items = screen.getAllByRole('listitem');
    // Most recent first
    expect(items[0].textContent).toContain('Player A drew a card');
    expect(items[2].textContent).toContain('Player A loaded a deck');
  });

  it('displays action badge labels', () => {
    const entries: HistoryEntry[] = [
      makeEntry({ actionType: 'TUTOR_CARD', description: 'Player A tutored for Sol Ring' }),
    ];
    render(<GameHistory history={entries} open={true} onClose={() => {}} />);
    expect(screen.getByText('Tutor')).toBeTruthy();
  });

  it('renders card thumbnails and destinations when card details are present', () => {
    const card = { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const };
    const entries: HistoryEntry[] = [
      makeEntry({ cards: [card], cardDetails: [{ card, destination: 'hand' }] }),
    ];
    render(<GameHistory history={entries} open={true} onClose={() => {}} />);
    const cardThumbContainer = document.querySelector('.game-history__card-thumb');
    expect(cardThumbContainer).toBeTruthy();
    expect(screen.getAllByText('Sol Ring')).toHaveLength(2);
    expect(screen.getByText('hand')).toBeTruthy();
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<GameHistory history={[]} open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close game history' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<GameHistory history={[]} open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('applies player-specific styling classes', () => {
    const entries: HistoryEntry[] = [
      makeEntry({ player: 'A', description: 'Player A action' }),
      makeEntry({ player: 'B', description: 'Player B action' }),
    ];
    render(<GameHistory history={entries} open={true} onClose={() => {}} />);
    const items = screen.getAllByRole('listitem');
    // Reversed order: B first, A second
    expect(items[0].classList.contains('game-history__entry--b')).toBe(true);
    expect(items[1].classList.contains('game-history__entry--a')).toBe(true);
  });

  it('has proper dialog role and aria attributes', () => {
    render(<GameHistory history={[]} open={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-label')).toBe('Game History');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('passes vitest-axe a11y assertions', async () => {
    const entries: HistoryEntry[] = [
      makeEntry({ actionType: 'DRAW_CARD', description: 'Player A drew a card' }),
      makeEntry({ player: 'B', actionType: 'TUTOR_CARD', description: 'Player B tutored for Sol Ring' }),
    ];
    const { container } = render(
      <GameHistory history={entries} open={true} onClose={() => {}} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('formats the action log as action, card, destination rows', () => {
    const entries: HistoryEntry[] = [
      makeEntry({ cards: [{ name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' }], cardDetails: [{ card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' }, destination: 'hand' }] }),
      makeEntry({ actionType: 'SHUFFLE_LIBRARY', description: 'Player A shuffled their library' }),
    ];

    expect(toHistoryExportText(entries)).toBe([
      'DRAW_CARD|Sol Ring|hand',
      'SHUFFLE_LIBRARY||',
    ].join('\n'));
  });

  it('copies the action log to the clipboard', async () => {
    const entries: HistoryEntry[] = [
      makeEntry({
        cards: [{ name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' }],
        cardDetails: [{ card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' }, destination: 'hand' }],
      }),
    ];

    render(<GameHistory history={entries} open={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy Log' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('DRAW_CARD|Sol Ring|hand');
      expect(screen.getByText('History copied to clipboard.')).toBeTruthy();
    });
  });

  it('downloads the action log', () => {
    const entries: HistoryEntry[] = [
      makeEntry({
        cards: [{ name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' }],
        cardDetails: [{ card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' }, destination: 'hand' }],
      }),
    ];
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<GameHistory history={entries} open={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download Log' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('History downloaded.')).toBeTruthy();
  });
});
