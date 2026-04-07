import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { PlayerZone } from '../PlayerZone.js';
import type { PlayerState, PlayerPhase, Action, ActionResult, GameState, PlayerId } from '@scryglass/core';

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

function makeGameState(playerState: PlayerState, player: PlayerId = 'A'): GameState {
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
  player: PlayerId = 'A',
  onDispatch: (action: Action) => ActionResult = stubDispatch(),
  visiblePlayer: PlayerId | null = null,
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
      onShowPlayer={() => {}}
      onHideAll={() => {}}
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

    // Game action buttons (Draw, Fetch Land, Tutor, Scry) should be disabled during loading
    // Visibility controls (Show/Hide) are not game actions and are not affected by phase
    const drawBtn = screen.getByRole('button', { name: /draw card/i });
    const fetchBtn = screen.getByRole('button', { name: /fetch basic land/i });
    const tutorBtn = screen.getByRole('button', { name: /tutor card/i });
    const scryBtn = screen.getByRole('button', { name: /scry/i });
    expect(drawBtn).toHaveProperty('disabled', true);
    expect(fetchBtn).toHaveProperty('disabled', true);
    expect(tutorBtn).toHaveProperty('disabled', true);
    expect(scryBtn).toHaveProperty('disabled', true);
  });

  it('enables action buttons when both players are in playing phase', () => {
    const cards = [
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
    ];
    renderPlayerZone(makePlayerState({ phase: 'playing', library: cards }), 'playing');

    const drawBtn = screen.getByRole('button', { name: /draw card/i });
    const fetchBtn = screen.getByRole('button', { name: /fetch basic land/i });
    const tutorBtn = screen.getByRole('button', { name: /tutor card/i });
    const scryBtn = screen.getByRole('button', { name: /scry/i });
    expect(drawBtn).toHaveProperty('disabled', false);
    expect(fetchBtn).toHaveProperty('disabled', false);
    expect(tutorBtn).toHaveProperty('disabled', false);
    expect(scryBtn).toHaveProperty('disabled', false);
  });

  it('disables action buttons when own phase is playing but other player is still mulliganing', () => {
    renderPlayerZone(makePlayerState({ phase: 'playing' }), 'mulligan');

    const drawBtn = screen.getByRole('button', { name: /draw card/i });
    const fetchBtn = screen.getByRole('button', { name: /fetch basic land/i });
    const tutorBtn = screen.getByRole('button', { name: /tutor card/i });
    const scryBtn = screen.getByRole('button', { name: /scry/i });
    expect(drawBtn).toHaveProperty('disabled', true);
    expect(fetchBtn).toHaveProperty('disabled', true);
    expect(tutorBtn).toHaveProperty('disabled', true);
    expect(scryBtn).toHaveProperty('disabled', true);
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

  it('renders MulliganHand when player phase is mulligan', () => {
    renderPlayerZone(makePlayerState({ phase: 'mulligan' }), 'loading', 'A', stubDispatch(), 'A');
    expect(screen.getByText('Opening Hand')).toBeTruthy();
  });

  it('does not render MulliganHand when player phase is loading', () => {
    renderPlayerZone(makePlayerState({ phase: 'loading' }));
    expect(screen.queryByText('Opening Hand')).toBeNull();
  });

  it('calls onShowPlayer when "Show" button is clicked', () => {
    const onShowPlayer = vi.fn();
    render(
      <PlayerZone
        player="A"
        playerState={makePlayerState()}
        otherPlayerPhase="loading"
        settings={defaultSettings}
        gameState={makeGameState(makePlayerState())}
        onDispatch={stubDispatch()}
        visiblePlayer={null}
        onShowPlayer={onShowPlayer}
        onHideAll={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: "Show Player A's cards" }));
    expect(onShowPlayer).toHaveBeenCalledWith('A');
  });

  it('calls onHideAll when "Hide all cards" button is clicked', () => {
    const onHideAll = vi.fn();
    render(
      <PlayerZone
        player="A"
        playerState={makePlayerState()}
        otherPlayerPhase="loading"
        settings={defaultSettings}
        gameState={makeGameState(makePlayerState())}
        onDispatch={stubDispatch()}
        visiblePlayer="A"
        onShowPlayer={() => {}}
        onHideAll={onHideAll}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hide all cards' }));
    expect(onHideAll).toHaveBeenCalled();
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = renderPlayerZone(makePlayerState());
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
      'loading',
      'A',
      stubDispatch(),
      'A',
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
      'playing',
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
