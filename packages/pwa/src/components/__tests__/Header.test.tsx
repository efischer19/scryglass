import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { Header } from '../Header.js';

describe('<Header />', () => {
  it('renders the app name', () => {
    render(<Header onLoadDecks={() => {}} />);
    expect(screen.getByText('Scryglass')).toBeTruthy();
  });

  it('renders a "Load Decks" button', () => {
    render(<Header onLoadDecks={() => {}} />);
    const button = screen.getByRole('button', { name: /load decks/i });
    expect(button).toBeTruthy();
  });

  it('uses a semantic header element', () => {
    const { container } = render(<Header onLoadDecks={() => {}} />);
    expect(container.querySelector('header')).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(<Header onLoadDecks={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  describe('New Game button', () => {
    it('does not render a "New Game" button when onNewGame is not provided', () => {
      render(<Header onLoadDecks={() => {}} />);
      expect(screen.queryByRole('button', { name: /new game/i })).toBeNull();
    });

    it('renders a "New Game" button when onNewGame is provided', () => {
      render(<Header onLoadDecks={() => {}} onNewGame={() => {}} />);
      expect(screen.getByRole('button', { name: /new game/i })).toBeTruthy();
    });

    it('calls onNewGame when the "New Game" button is clicked', () => {
      const onNewGame = vi.fn();
      render(<Header onLoadDecks={() => {}} onNewGame={onNewGame} />);
      fireEvent.click(screen.getByRole('button', { name: /new game/i }));
      expect(onNewGame).toHaveBeenCalledOnce();
    });

    it('passes vitest-axe a11y assertions when New Game button is visible', async () => {
      const { container } = render(<Header onLoadDecks={() => {}} onNewGame={() => {}} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
