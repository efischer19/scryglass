import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { GameHistory } from '../GameHistory.js';
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

  it('renders card thumbnails when cards are present', () => {
    const card = { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const };
    const entries: HistoryEntry[] = [
      makeEntry({ cards: [card] }),
    ];
    render(<GameHistory history={entries} open={true} onClose={() => {}} />);
    // The CardImage component renders loading state or name
    const cardThumbContainer = document.querySelector('.game-history__card-thumb');
    expect(cardThumbContainer).toBeTruthy();
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
});
