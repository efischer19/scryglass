import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { PlayerZone } from '../PlayerZone.js';
import type { PlayerState, PlayerPhase, Action, GameState } from '@scryglass/core';

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

function renderPlayerZone(
  playerState: PlayerState,
  otherPlayerPhase: PlayerPhase = 'loading',
  player: 'A' | 'B' = 'A',
  onDispatch: (action: Action) => void = () => {},
) {
  return render(
    <PlayerZone
      player={player}
      playerState={playerState}
      otherPlayerPhase={otherPlayerPhase}
      settings={defaultSettings}
      onDispatch={onDispatch}
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
      expect(button).toHaveProperty('disabled', true);
    }
  });

  it('enables action buttons when both players are in playing phase', () => {
    renderPlayerZone(makePlayerState({ phase: 'playing' }), 'playing');

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toHaveProperty('disabled', false);
    }
  });

  it('disables action buttons when own phase is playing but other player is still mulliganing', () => {
    renderPlayerZone(makePlayerState({ phase: 'playing' }), 'mulligan');

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toHaveProperty('disabled', true);
    }
  });

  it('renders Draw, Fetch Land, Tutor, and Scry buttons', () => {
    renderPlayerZone(makePlayerState());

    expect(screen.getByText('Draw')).toBeTruthy();
    expect(screen.getByText('Fetch Land')).toBeTruthy();
    expect(screen.getByText('Tutor')).toBeTruthy();
    expect(screen.getByText('Scry')).toBeTruthy();
  });

  it('labels buttons with appropriate aria-labels', () => {
    renderPlayerZone(makePlayerState());

    expect(
      screen.getByRole('button', { name: "Draw card from Player A's library" }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: "Fetch land from Player A's library" }),
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
    renderPlayerZone(makePlayerState({ phase: 'mulligan' }));
    expect(screen.getByText('Opening Hand')).toBeTruthy();
  });

  it('does not render MulliganHand when player phase is loading', () => {
    renderPlayerZone(makePlayerState({ phase: 'loading' }));
    expect(screen.queryByText('Opening Hand')).toBeNull();
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = renderPlayerZone(makePlayerState());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
