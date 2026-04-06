import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { PlayerZone } from '../PlayerZone.js';
import type { PlayerState, PlayerPhase, Action, ActionResult, GameState } from '@scryglass/core';

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    library: [],
    phase: 'loading',
    mulliganHand: [],
    mulliganCount: 0,
    ...overrides,
  };
}

const defaultSettings: GameState['settings'] = { allowMulliganWith2or5Lands: false };

function stubDispatch(state?: PlayerState): (action: Action) => ActionResult {
  return () => ({
    state: {
      players: {
        A: state ?? makePlayerState(),
        B: state ?? makePlayerState(),
      },
      settings: defaultSettings,
    },
    card: null,
  });
}

function makeGameState(playerState: PlayerState, player: 'A' | 'B' = 'A'): GameState {
  const other = makePlayerState();
  return {
    players: player === 'A'
      ? { A: playerState, B: other }
      : { A: other, B: playerState },
    settings: defaultSettings,
  };
}

function renderPlayerZone(
  playerState: PlayerState,
  otherPlayerPhase: PlayerPhase = 'loading',
  player: 'A' | 'B' = 'A',
  onDispatch: (action: Action) => ActionResult = stubDispatch(),
  visiblePlayer: 'A' | 'B' | null = null,
  onVisibilityChange: (p: 'A' | 'B' | null) => void = () => {},
) {
  return render(
    <PlayerZone
      player={player}
      playerState={playerState}
      otherPlayerPhase={otherPlayerPhase}
      settings={defaultSettings}
      gameState={makeGameState(playerState, player)}
      onDispatch={onDispatch}
      visiblePlayer={visiblePlayer}
      onVisibilityChange={onVisibilityChange}
    />,
  );
}

describe('<PlayerZone />', () => {
  it('displays the correct library count from GameState', () => {
    const cards = [
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
      { name: 'Forest', setCode: 'c21', collectorNumber: '300', cardType: 'land' as const },
      { name: 'Island', setCode: 'c21', collectorNumber: '290', cardType: 'land' as const },
    ];
    renderPlayerZone(makePlayerState({ library: cards, phase: 'playing' }), 'playing');
    expect(screen.getByText('Cards: 3')).toBeTruthy();
  });

  it('shows 0 cards when library is empty', () => {
    renderPlayerZone(makePlayerState(), 'loading', 'B');
    expect(screen.getByText('Cards: 0')).toBeTruthy();
  });

  it('disables action buttons when phase is loading', () => {
    renderPlayerZone(makePlayerState({ phase: 'loading' }));

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      // The "Show cards" button is not disabled; only the game-action buttons are
      if (button.getAttribute('aria-label') === 'Show Player A\'s cards') continue;
      expect(button).toHaveProperty('disabled', true);
    }
  });

  it('enables action buttons when both players are in playing phase', () => {
    const cards = [
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
    ];
    renderPlayerZone(makePlayerState({ phase: 'playing', library: cards }), 'playing', 'A', stubDispatch(), null);

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      // The "Show cards" button is not a game-action button
      if (button.getAttribute('aria-label') === 'Show Player A\'s cards') continue;
      expect(button).toHaveProperty('disabled', false);
    }
  });

  it('disables action buttons when own phase is playing but other player is still mulliganing', () => {
    renderPlayerZone(makePlayerState({ phase: 'playing' }), 'mulligan', 'A', stubDispatch(), null);

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      if (button.getAttribute('aria-label') === 'Show Player A\'s cards') continue;
      expect(button).toHaveProperty('disabled', true);
    }
  });

  it('renders Draw, Fetch Land, Tutor, and Scry buttons', () => {
    const cards = [
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
    ];
    renderPlayerZone(makePlayerState({ library: cards }));

    expect(screen.getByText('Draw')).toBeTruthy();
    expect(screen.getByText('Fetch Land')).toBeTruthy();
    expect(screen.getByText('Tutor')).toBeTruthy();
    expect(screen.getByText('Scry')).toBeTruthy();
  });

  it('shows "Library Empty" on the Draw button when library is empty', () => {
    renderPlayerZone(makePlayerState());

    expect(screen.getByText('Library Empty')).toBeTruthy();
  });

  it('labels buttons with appropriate aria-labels', () => {
    renderPlayerZone(makePlayerState());

    expect(
      screen.getByRole('button', { name: "Draw card from Player A's library" }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: "Fetch basic land from Player A's library" }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: "Tutor card from Player A's library" }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: "Scry Player A's library" }),
    ).toBeTruthy();
  });

  it('uses a semantic section element', () => {
    const { container } = renderPlayerZone(makePlayerState(), 'loading', 'B');
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('renders MulliganHand when player phase is mulligan and cards are visible', () => {
    renderPlayerZone(makePlayerState({ phase: 'mulligan' }), 'loading', 'A', stubDispatch(), 'A');
    expect(screen.getByText('Opening Hand')).toBeTruthy();
  });

  it('does not render MulliganHand when player phase is loading', () => {
    renderPlayerZone(makePlayerState({ phase: 'loading' }));
    expect(screen.queryByText('Opening Hand')).toBeNull();
  });

  it('does not render MulliganHand when phase is mulligan but cards are not visible', () => {
    renderPlayerZone(makePlayerState({ phase: 'mulligan' }), 'loading', 'A', stubDispatch(), null);
    expect(screen.queryByText('Opening Hand')).toBeNull();
  });

  describe('pass-and-play visibility', () => {
    it('shows "Show Player A\'s cards" button when no player is visible', () => {
      renderPlayerZone(makePlayerState(), 'loading', 'A', stubDispatch(), null);
      expect(screen.getByRole('button', { name: "Show Player A's cards" })).toBeTruthy();
    });

    it('shows "Hide all cards" button when this player is visible', () => {
      renderPlayerZone(makePlayerState(), 'loading', 'A', stubDispatch(), 'A');
      expect(screen.getByRole('button', { name: 'Hide all cards' })).toBeTruthy();
    });

    it('shows no visibility button when the other player is visible', () => {
      renderPlayerZone(makePlayerState(), 'loading', 'A', stubDispatch(), 'B');
      expect(screen.queryByRole('button', { name: "Show Player A's cards" })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Hide all cards' })).toBeNull();
    });

    it('calls onVisibilityChange(player) when "Show" button is clicked', () => {
      const onVisibilityChange = vi.fn();
      renderPlayerZone(makePlayerState(), 'loading', 'A', stubDispatch(), null, onVisibilityChange);
      fireEvent.click(screen.getByRole('button', { name: "Show Player A's cards" }));
      expect(onVisibilityChange).toHaveBeenCalledWith('A');
    });

    it('calls onVisibilityChange(null) when "Hide all cards" button is clicked', () => {
      const onVisibilityChange = vi.fn();
      renderPlayerZone(makePlayerState(), 'loading', 'A', stubDispatch(), 'A', onVisibilityChange);
      fireEvent.click(screen.getByRole('button', { name: 'Hide all cards' }));
      expect(onVisibilityChange).toHaveBeenCalledWith(null);
    });

    it('calls onVisibilityChange(null) when KEEP_HAND is dispatched', () => {
      const onVisibilityChange = vi.fn();
      const mulliganHand = [
        { name: 'Forest', setCode: 'c21', collectorNumber: '300', cardType: 'land' as const },
        { name: 'Forest', setCode: 'c21', collectorNumber: '300', cardType: 'land' as const },
        { name: 'Forest', setCode: 'c21', collectorNumber: '300', cardType: 'land' as const },
        { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
        { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
        { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
        { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
      ];
      renderPlayerZone(
        makePlayerState({ phase: 'mulligan', mulliganHand }),
        'loading', 'A', stubDispatch(), 'A', onVisibilityChange,
      );
      fireEvent.click(screen.getByRole('button', { name: "Keep Player A's opening hand" }));
      expect(onVisibilityChange).toHaveBeenCalledWith(null);
    });
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = renderPlayerZone(makePlayerState(), 'loading', 'A', stubDispatch(), null);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions in mulligan phase', async () => {
    const mulliganHand = [
      { name: 'Forest', setCode: 'c21', collectorNumber: '300', cardType: 'land' as const },
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
    ];
    const { container } = renderPlayerZone(
      makePlayerState({ phase: 'mulligan', mulliganHand }),
      'loading', 'A', stubDispatch(), 'A',
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions in playing phase', async () => {
    const cards = [
      { name: 'Forest', setCode: 'c21', collectorNumber: '300', cardType: 'land' as const },
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
    ];
    const { container } = renderPlayerZone(
      makePlayerState({ phase: 'playing', library: cards }),
      'playing', 'A', stubDispatch(), 'A',
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
