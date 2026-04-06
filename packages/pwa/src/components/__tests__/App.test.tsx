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
    async function loadBothDecks() {
      // Step 1: Load Player A's deck
      const textareaA = screen.getByRole('textbox');
      fireEvent.input(textareaA, { target: { value: makeMinimalDeckText() } });
      await new Promise((r) => setTimeout(r, 300));
      const loadBtnA = await screen.findByRole('button', { name: 'Load Deck' });
      fireEvent.click(loadBtnA);

      // Step 2: Load Player B's deck (DeckInput re-mounts for Player B)
      const textareaB = await screen.findByRole('textbox');
      fireEvent.input(textareaB, { target: { value: makeMinimalDeckText() } });
      await new Promise((r) => setTimeout(r, 300));
      const loadBtnB = await screen.findByRole('button', { name: 'Load Deck' });
      fireEvent.click(loadBtnB);
    }

    it('enters mulligan phase after loading both decks (both players see Opening Hand)', async () => {
      render(<App />);

      // The App now uses a two-step flow: first load Player A's deck, then Player B's deck.
      // After both decks are loaded, the App deals opening hands and navigates to #/app.
      await loadBothDecks();

      // Both players' "Show cards" buttons should be visible (no cards visible initially)
      expect(await screen.findByRole('button', { name: "Show Player A's cards" })).toBeTruthy();
      expect(screen.getByRole('button', { name: "Show Player B's cards" })).toBeTruthy();

      // Show Player A's cards to verify Opening Hand is rendered
      fireEvent.click(screen.getByRole('button', { name: "Show Player A's cards" }));
      const openingHandA = await screen.findAllByText('Opening Hand');
      expect(openingHandA.length).toBeGreaterThanOrEqual(1);
    });

    it('transitions to playing phase when both players keep their hands', async () => {
      render(<App />);

      await loadBothDecks();

      // Show Player A's cards, keep hand (visibility auto-resets after keep)
      fireEvent.click(await screen.findByRole('button', { name: "Show Player A's cards" }));
      const keepBtnA = await screen.findByRole('button', { name: /keep player a's opening hand/i });
      fireEvent.click(keepBtnA);

      // Show Player B's cards, keep hand
      fireEvent.click(await screen.findByRole('button', { name: "Show Player B's cards" }));
      const keepBtnB = await screen.findByRole('button', { name: /keep player b's opening hand/i });
      fireEvent.click(keepBtnB);

      // After both keep, action buttons (Draw) should be enabled
      const drawBtns = await screen.findAllByRole('button', { name: /draw card/i });
      for (const btn of drawBtns) {
        expect(btn).toHaveProperty('disabled', false);
      }
    });
  });
});
