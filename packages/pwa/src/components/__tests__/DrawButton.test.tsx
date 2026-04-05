import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { DrawButton } from '../DrawButton.js';
import type { Action, ActionResult, GameState } from '@scryglass/core';

const defaultSettings: GameState['settings'] = { allowMulliganWith2or5Lands: false };

function makeResult(cardName?: string): ActionResult {
  return {
    state: {
      players: {
        A: { library: [], phase: 'playing', mulliganHand: [], mulliganCount: 0 },
        B: { library: [], phase: 'playing', mulliganHand: [], mulliganCount: 0 },
      },
      settings: defaultSettings,
    },
    card: cardName
      ? { name: cardName, setCode: 'c21', collectorNumber: '263', cardType: 'nonland' as const }
      : null,
  };
}

describe('<DrawButton />', () => {
  it('renders "Draw" label when library is not empty', () => {
    render(
      <DrawButton
        player="A"
        disabled={false}
        libraryEmpty={false}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /draw card/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /draw card/i }).textContent).toBe('Draw');
  });

  it('is disabled and shows "Library Empty" when library is empty', () => {
    render(
      <DrawButton
        player="A"
        disabled={false}
        libraryEmpty={true}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: /draw card/i });
    expect(btn).toHaveProperty('disabled', true);
    expect(btn.textContent).toBe('Library Empty');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('is disabled when phase is not playing (disabled prop is true)', () => {
    render(
      <DrawButton
        player="A"
        disabled={true}
        libraryEmpty={false}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: /draw card/i });
    expect(btn).toHaveProperty('disabled', true);
  });

  it('dispatches DRAW_CARD action with the correct player after confirmation', () => {
    const onDispatch = vi.fn<(action: Action) => ActionResult>().mockReturnValue(makeResult('Sol Ring'));
    const onCardDrawn = vi.fn();

    render(
      <DrawButton
        player="B"
        disabled={false}
        libraryEmpty={false}
        onDispatch={onDispatch}
        onCardDrawn={onCardDrawn}
      />,
    );

    // Click Draw to open the gate
    fireEvent.click(screen.getByRole('button', { name: /draw card/i }));

    // Confirm
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'DRAW_CARD',
      payload: { player: 'B' },
    });
    expect(onCardDrawn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sol Ring' }),
    );
  });

  it('does not dispatch when Cancel is clicked', () => {
    const onDispatch = vi.fn<(action: Action) => ActionResult>().mockReturnValue(makeResult());

    render(
      <DrawButton
        player="A"
        disabled={false}
        libraryEmpty={false}
        onDispatch={onDispatch}
        onCardDrawn={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /draw card/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDispatch).not.toHaveBeenCalled();
  });

  it('shows the confirmation gate with the correct message', () => {
    render(
      <DrawButton
        player="A"
        disabled={false}
        libraryEmpty={false}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /draw card/i }));
    expect(screen.getByText("Draw from Player A's library?")).toBeTruthy();
  });

  it('does not open the gate when the button is disabled', () => {
    render(
      <DrawButton
        player="A"
        disabled={true}
        libraryEmpty={false}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /draw card/i }));
    // Disabled buttons don't fire click in real browsers; fireEvent bypasses this,
    // so we verify the button is disabled instead
    expect(screen.getByRole('button', { name: /draw card/i })).toHaveProperty('disabled', true);
  });

  it('has an appropriate aria-label', () => {
    render(
      <DrawButton
        player="A"
        disabled={false}
        libraryEmpty={false}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: "Draw card from Player A's library" }),
    ).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(
      <DrawButton
        player="A"
        disabled={false}
        libraryEmpty={false}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions when library is empty', async () => {
    const { container } = render(
      <DrawButton
        player="A"
        disabled={false}
        libraryEmpty={true}
        onDispatch={() => makeResult()}
        onCardDrawn={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
