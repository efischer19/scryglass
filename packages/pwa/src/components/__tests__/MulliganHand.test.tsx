import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { MulliganHand } from '../MulliganHand.js';
import type { PlayerState, Action, GameState } from '@scryglass/core';

/* ------------------------------------------------------------------ */
/*  Module mock for useCardImage                                      */
/* ------------------------------------------------------------------ */

vi.mock('../../scryfall/useCardImage', () => ({
  useCardImage: (collectorNumber: string) => ({
    status: 'loading' as const,
    imageUrl: null,
    collectorNumber,
  }),
}));

const defaultSettings: GameState['settings'] = { allowMulliganWith2or5Lands: false };

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    library: [],
    phase: 'mulligan',
    mulliganHand: [],
    mulliganCount: 0,
    ...overrides,
  };
}

const makeHand = (lands: number, nonlands: number) => [
  ...Array.from({ length: lands }, (_, i) => ({
    name: `Forest ${i + 1}`,
    setCode: 'c21',
    collectorNumber: String(300 + i),
    cardType: 'land' as const,
  })),
  ...Array.from({ length: nonlands }, (_, i) => ({
    name: `Sol Ring ${i + 1}`,
    setCode: 'c21',
    collectorNumber: String(200 + i),
    cardType: 'nonland' as const,
  })),
];

describe('<MulliganHand />', () => {
  it('renders the "Opening Hand" heading', () => {
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState()}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    expect(screen.getByText('Opening Hand')).toBeTruthy();
  });

  it('renders card names from the mulligan hand', () => {
    const hand = makeHand(3, 4);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );

    expect(screen.getByText('Forest 1')).toBeTruthy();
    expect(screen.getByText('Sol Ring 1')).toBeTruthy();
  });

  it('displays the land count and verdict', () => {
    const hand = makeHand(3, 4);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    expect(screen.getByText(/3 lands — must keep/)).toBeTruthy();
  });

  it('uses singular "land" when there is exactly 1 land', () => {
    const hand = makeHand(1, 6);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    expect(screen.getByText(/1 land — mulligan recommended/)).toBeTruthy();
  });

  it('displays the mulligan count', () => {
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganCount: 2 })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    expect(screen.getByText('Mulligans taken: 2')).toBeTruthy();
  });

  it('Keep button dispatches KEEP_HAND for the correct player', () => {
    const onDispatch = vi.fn();
    const hand = makeHand(3, 4);
    render(
      <MulliganHand
        player="B"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={onDispatch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: "Keep Player B's opening hand" }));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'KEEP_HAND',
      payload: { player: 'B' },
    });
  });

  it('Mulligan button dispatches MULLIGAN for the correct player', () => {
    const onDispatch = vi.fn();
    const hand = makeHand(0, 7);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={onDispatch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: "Mulligan Player A's hand" }));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'MULLIGAN',
      payload: { player: 'A' },
    });
  });

  it('Mulligan button is disabled when verdict is must_keep (3 lands)', () => {
    const hand = makeHand(3, 4);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    const mulliganBtn = screen.getByRole('button', { name: "Mulligan Player A's hand" });
    expect(mulliganBtn).toHaveProperty('disabled', true);
  });

  it('Mulligan button is enabled when verdict is must_mulligan (0 lands)', () => {
    const hand = makeHand(0, 7);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    const mulliganBtn = screen.getByRole('button', { name: "Mulligan Player A's hand" });
    expect(mulliganBtn).toHaveProperty('disabled', false);
  });

  it('Mulligan button is enabled when verdict is user_choice (2 lands, allowMulliganWith2or5Lands: true)', () => {
    const hand = makeHand(2, 5);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={{ allowMulliganWith2or5Lands: true }}
        onDispatch={() => {}}
      />,
    );
    const mulliganBtn = screen.getByRole('button', { name: "Mulligan Player A's hand" });
    expect(mulliganBtn).toHaveProperty('disabled', false);
  });

  it('has appropriate aria-labels on Keep and Mulligan buttons', () => {
    const hand = makeHand(3, 4);
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: "Keep Player A's opening hand" })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Mulligan Player A's hand" })).toBeTruthy();
  });

  it('shows Deal Initial button (not Keep/Mulligan) before hand is dealt', () => {
    const onDispatch = vi.fn();
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState()}
        settings={defaultSettings}
        onDispatch={onDispatch}
      />,
    );
    expect(screen.getByRole('button', { name: "Deal initial hand for Player A" })).toBeTruthy();
    expect(screen.queryByRole('button', { name: "Keep Player A's opening hand" })).toBeNull();
    expect(screen.queryByRole('button', { name: "Mulligan Player A's hand" })).toBeNull();
  });

  it('Deal Initial button dispatches DEAL_OPENING_HAND', () => {
    const onDispatch = vi.fn();
    render(
      <MulliganHand
        player="A"
        playerState={makePlayerState()}
        settings={defaultSettings}
        onDispatch={onDispatch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: "Deal initial hand for Player A" }));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'DEAL_OPENING_HAND',
      payload: { player: 'A' },
    });
  });

  it('renders Player B labels correctly after hand is dealt', () => {
    const hand = makeHand(3, 4);
    render(
      <MulliganHand
        player="B"
        playerState={makePlayerState({ mulliganHand: hand })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: "Keep Player B's opening hand" })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Mulligan Player B's hand" })).toBeTruthy();
  });

  it('renders Player B Deal Initial label correctly before hand is dealt', () => {
    render(
      <MulliganHand
        player="B"
        playerState={makePlayerState()}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: "Deal initial hand for Player B" })).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions (gate hidden)', async () => {
    const { container } = render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: makeHand(3, 4) })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions (hand revealed)', async () => {
    const { container } = render(
      <MulliganHand
        player="A"
        playerState={makePlayerState({ mulliganHand: makeHand(3, 4) })}
        settings={defaultSettings}
        onDispatch={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
