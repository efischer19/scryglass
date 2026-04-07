import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { StatusBar } from '../StatusBar.js';

describe('<StatusBar />', () => {
  describe('deck-selection mode', () => {
    it('shows "Selecting deck for Player A" when player is A', () => {
      render(<StatusBar mode="deck-selection" player="A" />);
      expect(screen.getByText('Selecting deck for Player A')).toBeTruthy();
    });

    it('shows "Selecting deck for Player B" when player is B', () => {
      render(<StatusBar mode="deck-selection" player="B" />);
      expect(screen.getByText('Selecting deck for Player B')).toBeTruthy();
    });

    it('uses role="status" with aria-live="polite"', () => {
      const { container } = render(<StatusBar mode="deck-selection" player="A" />);
      const el = container.querySelector('[role="status"]');
      expect(el).toBeTruthy();
      expect(el?.getAttribute('aria-live')).toBe('polite');
    });

    it('passes vitest-axe a11y assertions', async () => {
      const { container } = render(<StatusBar mode="deck-selection" player="A" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('game mode', () => {
    it('shows zero draw counts initially', () => {
      render(<StatusBar mode="game" drawCounts={{ A: 0, B: 0 }} activePlayers={['A', 'B']} />);
      expect(screen.getByText('Number of draws - A:0 B:0')).toBeTruthy();
    });

    it('reflects updated draw counts', () => {
      render(<StatusBar mode="game" drawCounts={{ A: 3, B: 1 }} activePlayers={['A', 'B']} />);
      expect(screen.getByText('Number of draws - A:3 B:1')).toBeTruthy();
    });

    it('uses role="status" with aria-live="polite"', () => {
      const { container } = render(<StatusBar mode="game" drawCounts={{ A: 0, B: 0 }} activePlayers={['A', 'B']} />);
      const el = container.querySelector('[role="status"]');
      expect(el).toBeTruthy();
      expect(el?.getAttribute('aria-live')).toBe('polite');
    });

    it('passes vitest-axe a11y assertions', async () => {
      const { container } = render(<StatusBar mode="game" drawCounts={{ A: 0, B: 0 }} activePlayers={['A', 'B']} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
