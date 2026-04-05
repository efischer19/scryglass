import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { ScryModal } from '../ScryModal.js';
import type { Action, ActionResult, GameState, Card } from '@scryglass/core';

function makeCard(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'nonland' };
}

function makeGameState(libraryCards: Card[]): GameState {
  return {
    players: {
      A: { library: libraryCards, phase: 'playing', mulliganHand: [], mulliganCount: 0 },
      B: { library: [], phase: 'playing', mulliganHand: [], mulliganCount: 0 },
    },
    settings: { allowMulliganWith2or5Lands: false },
  };
}

function makeResult(gameState: GameState, removedCards: Card[] = []): ActionResult {
  return {
    state: gameState,
    card: removedCards.length > 0 ? removedCards[0] : null,
    cards: removedCards,
  };
}

describe('<ScryModal />', () => {
  it('renders the confirmation gate first', () => {
    const cards = [makeCard('Sol Ring'), makeCard('Forest'), makeCard('Island')];
    const gameState = makeGameState(cards);

    render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={() => makeResult(gameState)}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Scry Player A's library?")).toBeTruthy();
  });

  it('renders the numeric input prompt after confirmation gate', () => {
    const cards = [makeCard('Sol Ring'), makeCard('Forest'), makeCard('Island')];
    const gameState = makeGameState(cards);

    render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={() => makeResult(gameState)}
        onClose={() => {}}
      />,
    );

    // Confirm the gate
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(screen.getByLabelText('Number of cards to look at')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Look' })).toBeTruthy();
  });

  it('displays the correct cards from peekTop and allows destination assignment', () => {
    const cards = [makeCard('Sol Ring'), makeCard('Forest'), makeCard('Island')];
    const gameState = makeGameState(cards);

    render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={() => makeResult(gameState)}
        onClose={() => {}}
      />,
    );

    // Confirm gate
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    // Set count to 3 and look
    const input = screen.getByLabelText('Number of cards to look at');
    fireEvent.input(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    // All 3 cards should be displayed
    expect(screen.getByText('Sol Ring')).toBeTruthy();
    expect(screen.getByText('Forest')).toBeTruthy();
    expect(screen.getByText('Island')).toBeTruthy();

    // Each card should have destination radio groups
    const radioGroups = screen.getAllByRole('radiogroup');
    expect(radioGroups).toHaveLength(3);
  });

  it('disables "Confirm Scry" until all cards have destinations', () => {
    const cards = [makeCard('Sol Ring'), makeCard('Forest')];
    const gameState = makeGameState(cards);

    render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={() => makeResult(gameState)}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.input(screen.getByLabelText('Number of cards to look at'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    // Confirm should be disabled initially
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Scry' });
    expect(confirmBtn).toHaveProperty('disabled', true);

    // Assign one card
    const radios = screen.getAllByRole('radio');
    // First card's "Keep on Top" radio
    fireEvent.click(radios[0]);

    // Still disabled (only 1 of 2 assigned)
    expect(confirmBtn).toHaveProperty('disabled', true);

    // Assign second card's "Send to Bottom" radio (index 4 = second card's second radio)
    fireEvent.click(radios[4]);

    // Now should be enabled
    expect(confirmBtn).toHaveProperty('disabled', false);
  });

  it('dispatches SCRY_RESOLVE with the correct decisions payload', () => {
    const cards = [makeCard('Sol Ring'), makeCard('Forest')];
    const gameState = makeGameState(cards);
    const onDispatch = vi.fn<(action: Action) => ActionResult>().mockReturnValue(makeResult(gameState));

    render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={onDispatch}
        onClose={() => {}}
      />,
    );

    // Confirm gate → count → look
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.input(screen.getByLabelText('Number of cards to look at'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    // Assign Sol Ring → top, Forest → bottom
    const radios = screen.getAllByRole('radio');
    // radios layout: [top0, bottom0, remove0, top1, bottom1, remove1]
    fireEvent.click(radios[0]); // Sol Ring → Keep on Top
    fireEvent.click(radios[4]); // Forest → Send to Bottom

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Scry' }));

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'SCRY_RESOLVE',
      payload: {
        player: 'A',
        decisions: [
          { cardIndex: 0, destination: 'top' },
          { cardIndex: 1, destination: 'bottom' },
        ],
      },
    });
  });

  it('calls onClose when Cancel is clicked on confirmation gate', () => {
    const cards = [makeCard('Sol Ring')];
    const gameState = makeGameState(cards);
    const onClose = vi.fn();

    render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={() => makeResult(gameState)}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows removed cards after confirmation', () => {
    const cards = [makeCard('Sol Ring'), makeCard('Forest')];
    const gameState = makeGameState(cards);
    const removedCards = [makeCard('Sol Ring')];
    const onDispatch = vi.fn<(action: Action) => ActionResult>().mockReturnValue(
      makeResult({ ...gameState, players: { ...gameState.players, A: { ...gameState.players.A, library: [makeCard('Forest')] } } }, removedCards),
    );

    render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={onDispatch}
        onClose={() => {}}
      />,
    );

    // Confirm gate → count → look
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.input(screen.getByLabelText('Number of cards to look at'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    // Assign Sol Ring → remove, Forest → top
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[2]); // Sol Ring → Remove
    fireEvent.click(radios[3]); // Forest → Keep on Top

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Scry' }));

    // Should show removed card and Close button
    expect(screen.getByText('Removed from library:')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions on initial confirmation gate', async () => {
    const cards = [makeCard('Sol Ring')];
    const gameState = makeGameState(cards);

    const { container } = render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={() => makeResult(gameState)}
        onClose={() => {}}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions on the decision view', async () => {
    const cards = [makeCard('Sol Ring'), makeCard('Forest')];
    const gameState = makeGameState(cards);

    const { container } = render(
      <ScryModal
        player="A"
        libraryLength={cards.length}
        gameState={gameState}
        onDispatch={() => makeResult(gameState)}
        onClose={() => {}}
      />,
    );

    // Navigate to decision view
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.input(screen.getByLabelText('Number of cards to look at'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
