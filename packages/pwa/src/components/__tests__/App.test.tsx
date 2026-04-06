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

      // With pass-and-play visibility gate, each player's section must be shown individually.
      // Show Player A's section and verify the Opening Hand heading is present
      const showPlayerABtn = await screen.findByRole('button', { name: "Show Player A's cards" });
      fireEvent.click(showPlayerABtn);
      expect(screen.getAllByText('Opening Hand')).toHaveLength(1);

      // Hide all then show Player B's section
      const hideBtn = screen.getByRole('button', { name: 'Hide all cards' });
      fireEvent.click(hideBtn);
      const showPlayerBBtn = screen.getByRole('button', { name: "Show Player B's cards" });
      fireEvent.click(showPlayerBBtn);
      expect(screen.getAllByText('Opening Hand')).toHaveLength(1);
    });

    it('transitions to playing phase when both players keep their hands', async () => {
      render(<App />);

      await loadBothDecks();

      // Player A: show cards, deal, keep (auto-hides on KEEP_HAND)
      const showPlayerABtn = await screen.findByRole('button', { name: "Show Player A's cards" });
      fireEvent.click(showPlayerABtn);
      const dealBtnA = await screen.findByRole('button', { name: /deal initial hand for player a/i });
      fireEvent.click(dealBtnA);
      const keepBtnA = await screen.findByRole('button', { name: /keep player a's opening hand/i });
      fireEvent.click(keepBtnA);

      // Player B: show cards, deal, keep (auto-hides on KEEP_HAND)
      const showPlayerBBtn = await screen.findByRole('button', { name: "Show Player B's cards" });
      fireEvent.click(showPlayerBBtn);
      const dealBtnB = await screen.findByRole('button', { name: /deal initial hand for player b/i });
      fireEvent.click(dealBtnB);
      const keepBtnB = await screen.findByRole('button', { name: /keep player b's opening hand/i });
      fireEvent.click(keepBtnB);

      // After both keep, action buttons (Draw) should be enabled — they are always rendered
      const drawBtns = await screen.findAllByRole('button', { name: /draw card/i });
      for (const btn of drawBtns) {
        expect(btn).toHaveProperty('disabled', false);
      }
    });

    it('shows New Game button in app view after decks are loaded', async () => {
      render(<App />);
      await loadBothDecks();

      const newGameBtn = await screen.findByRole('button', { name: /new game/i });
      expect(newGameBtn).toBeTruthy();
    });

    it('resets to mulligan phase when New Game is clicked', async () => {
      render(<App />);
      await loadBothDecks();

      // Player A: show cards, deal, keep (auto-hides on KEEP_HAND)
      const showPlayerABtn = await screen.findByRole('button', { name: "Show Player A's cards" });
      fireEvent.click(showPlayerABtn);
      const dealBtnA = screen.getByRole('button', { name: /deal initial hand for player a/i });
      fireEvent.click(dealBtnA);
      const keepBtnA = screen.getByRole('button', { name: /keep player a's opening hand/i });
      fireEvent.click(keepBtnA);

      // Player B: show cards, deal, keep (auto-hides on KEEP_HAND)
      const showPlayerBBtn = screen.getByRole('button', { name: "Show Player B's cards" });
      fireEvent.click(showPlayerBBtn);
      const dealBtnB = screen.getByRole('button', { name: /deal initial hand for player b/i });
      fireEvent.click(dealBtnB);
      const keepBtnB = screen.getByRole('button', { name: /keep player b's opening hand/i });
      fireEvent.click(keepBtnB);

      // Confirm we're in playing phase (draw buttons are always rendered)
      const drawBtns = await screen.findAllByRole('button', { name: /draw card/i });
      expect(drawBtns.length).toBeGreaterThan(0);

      // Click New Game — visibility resets to null
      const newGameBtn = screen.getByRole('button', { name: /new game/i });
      fireEvent.click(newGameBtn);

      // Show Player A's cards to verify they're back in mulligan phase
      const showABtn = screen.getByRole('button', { name: "Show Player A's cards" });
      fireEvent.click(showABtn);
      const openingHandHeadings = await screen.findAllByText('Opening Hand');
      expect(openingHandHeadings).toHaveLength(1);
    });
  });
});
