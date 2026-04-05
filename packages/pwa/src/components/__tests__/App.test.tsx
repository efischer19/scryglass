import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { App } from '../App.js';

// A small balanced deck (3 lands, 4 nonlands repeated to 60) for integration tests
function makeMinimalDeckText(): string {
  const lines: string[] = [];
  for (let i = 0; i < 30; i++) {
    lines.push(`Forest;c21;${300 + i};land`);
  }
  for (let i = 0; i < 30; i++) {
    lines.push(`Sol Ring;c21;${200 + i};nonland`);
  }
  return lines.join('\n');
}

beforeEach(() => {
  window.location.hash = '';
});

describe('<App />', () => {
  it('renders the deck input view by default', () => {
    render(<App />);
    expect(screen.getByText('Enter Your Decklist')).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('renders the shuffler view when hash is #/app', () => {
    window.location.hash = '#/app';
    render(<App />);
    expect(screen.getByText('Player A')).toBeTruthy();
    expect(screen.getByText('Player B')).toBeTruthy();
  });

  it('renders the Header on the input view', () => {
    render(<App />);
    expect(screen.getByText('Scryglass')).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions on the input view', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  describe('integration: mulligan flow', () => {
    it('enters mulligan phase after loading deck (both players see Opening Hand)', async () => {
      render(<App />);

      // Simulate loading a deck via the DeckInput callback by calling handleLoadDeck indirectly
      // The DeckInput fires onLoadDeck; the App wires it to load + deal opening hands and navigate to #/app
      // We test this by checking that after navigation both players are in mulligan phase
      const textarea = screen.getByRole('textbox');
      fireEvent.input(textarea, { target: { value: makeMinimalDeckText() } });

      // Wait for debounce and load button to enable
      await new Promise((r) => setTimeout(r, 300));

      const loadBtn = await screen.findByRole('button', { name: 'Load Deck' });
      fireEvent.click(loadBtn);

      // Both players should now be in mulligan phase showing Opening Hand heading
      const openingHandHeadings = await screen.findAllByText('Opening Hand');
      expect(openingHandHeadings).toHaveLength(2);
    });

    it('transitions to playing phase when both players keep their hands', async () => {
      render(<App />);

      const textarea = screen.getByRole('textbox');
      fireEvent.input(textarea, { target: { value: makeMinimalDeckText() } });
      await new Promise((r) => setTimeout(r, 300));

      const loadBtn = await screen.findByRole('button', { name: 'Load Deck' });
      fireEvent.click(loadBtn);

      // Both players are in mulligan phase — keep both hands
      // The verdict for 30 lands / 60 cards hand has 3-4 lands, so "must_keep"
      const keepBtns = await screen.findAllByRole('button', { name: /keep.*opening hand/i });
      expect(keepBtns).toHaveLength(2);

      fireEvent.click(keepBtns[0]);
      fireEvent.click(keepBtns[1]);

      // After both keep, action buttons (Draw) should be enabled
      const drawBtns = await screen.findAllByRole('button', { name: /draw card/i });
      for (const btn of drawBtns) {
        expect(btn).toHaveProperty('disabled', false);
      }
    });
  });
});
