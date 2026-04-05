import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { PlayerZone } from '../PlayerZone.js';
import type { PlayerState, Action } from '@scryglass/core';

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    library: [],
    phase: 'loading',
    mulliganHand: null,
    ...overrides,
  };
}

const noop = (_action: Action) => {};

describe('<PlayerZone />', () => {
  it('displays the correct library count from GameState', () => {
    const cards = [
      { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const },
      { name: 'Forest', setCode: 'c21', collectorNumber: '300', cardType: 'land' as const },
      { name: 'Island', setCode: 'c21', collectorNumber: '290', cardType: 'land' as const },
    ];
    render(
      <PlayerZone
        player="A"
        playerState={makePlayerState({ library: cards, phase: 'playing' })}
        onDispatch={noop}
      />,
    );
    expect(screen.getByText('Cards: 3')).toBeTruthy();
  });

  it('shows 0 cards when library is empty', () => {
    render(
      <PlayerZone player="B" playerState={makePlayerState()} onDispatch={noop} />,
    );
    expect(screen.getByText('Cards: 0')).toBeTruthy();
  });

  it('disables action buttons when phase is loading', () => {
    render(
      <PlayerZone
        player="A"
        playerState={makePlayerState({ phase: 'loading' })}
        onDispatch={noop}
      />,
    );

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toHaveProperty('disabled', true);
    }
  });

  it('enables action buttons when phase is playing', () => {
    render(
      <PlayerZone
        player="A"
        playerState={makePlayerState({ phase: 'playing' })}
        onDispatch={noop}
      />,
    );

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toHaveProperty('disabled', false);
    }
  });

  it('renders Draw, Fetch Land, Tutor, and Scry buttons', () => {
    render(
      <PlayerZone player="A" playerState={makePlayerState()} onDispatch={noop} />,
    );

    expect(screen.getByText('Draw')).toBeTruthy();
    expect(screen.getByText('Fetch Land')).toBeTruthy();
    expect(screen.getByText('Tutor')).toBeTruthy();
    expect(screen.getByText('Scry')).toBeTruthy();
  });

  it('labels buttons with appropriate aria-labels', () => {
    render(
      <PlayerZone player="A" playerState={makePlayerState()} onDispatch={noop} />,
    );

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
    const { container } = render(
      <PlayerZone player="B" playerState={makePlayerState()} onDispatch={noop} />,
    );
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(
      <PlayerZone player="A" playerState={makePlayerState()} onDispatch={noop} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
