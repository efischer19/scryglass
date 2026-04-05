import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { TutorModal } from '../TutorModal.js';
import type { Action, ActionResult, Card } from '@scryglass/core';

function makeCard(name: string, cardType: Card['cardType'] = 'nonland'): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType };
}

function makeGameState(library: Card[]) {
  return {
    players: {
      A: { library, phase: 'playing' as const, mulliganHand: [], mulliganCount: 0 },
      B: { library: [], phase: 'playing' as const, mulliganHand: [], mulliganCount: 0 },
    },
    settings: { allowMulliganWith2or5Lands: false },
  };
}

function makeResult(library: Card[], card: Card | null = null): ActionResult {
  return { state: makeGameState(library), card };
}

const defaultLibrary: Card[] = [
  makeCard('Sol Ring'),
  makeCard('Counterspell'),
  makeCard('Lightning Bolt'),
  makeCard('Bolt of Thunder'),
];

function getCardOption(cardName: string): HTMLElement {
  const option = screen.getAllByRole('option').find(
    el => el.textContent?.includes(cardName),
  );
  if (!option) throw new Error(`No option found for card: ${cardName}`);
  return option;
}

describe('<TutorModal />', () => {
  it('renders the search input and card list', () => {
    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('textbox', { name: "Search Player A's library" })).toBeTruthy();
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(defaultLibrary.length);
  });

  it('shows all library cards when query is empty', () => {
    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    defaultLibrary.forEach(card => {
      expect(screen.getByText(card.name)).toBeTruthy();
    });
  });

  it('filters cards in real time as the user types', () => {
    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    const input = screen.getByRole('textbox', { name: "Search Player A's library" });
    fireEvent.input(input, { target: { value: 'bolt' } });

    expect(screen.queryByText('Sol Ring')).toBeNull();
    expect(screen.queryByText('Counterspell')).toBeNull();
    expect(screen.getByText('Lightning Bolt')).toBeTruthy();
    expect(screen.getByText('Bolt of Thunder')).toBeTruthy();
  });

  it('shows "No matching cards" when no cards match the query', () => {
    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    const input = screen.getByRole('textbox', { name: "Search Player A's library" });
    fireEvent.input(input, { target: { value: 'Demonic Tutor' } });

    expect(screen.getByText('No matching cards')).toBeTruthy();
  });

  it('selecting a card opens the ConfirmationGate', () => {
    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([], makeCard('Sol Ring'))}
        onClose={() => {}}
      />,
    );

    fireEvent.click(getCardOption('Sol Ring'));

    expect(screen.getByText("Tutor Sol Ring from Player A's library?")).toBeTruthy();
  });

  it('dispatches TUTOR_CARD with correct payload after confirmation', () => {
    const solRing = makeCard('Sol Ring');
    const onDispatch = vi.fn<(action: Action) => ActionResult>().mockReturnValue(
      makeResult([], solRing),
    );

    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={onDispatch}
        onClose={() => {}}
      />,
    );

    fireEvent.click(getCardOption('Sol Ring'));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'TUTOR_CARD',
      payload: { player: 'A', cardName: 'Sol Ring' },
    });
  });

  it('displays the tutored card in CardDisplay after confirmation', () => {
    const solRing = makeCard('Sol Ring');

    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([], solRing)}
        onClose={() => {}}
      />,
    );

    fireEvent.click(getCardOption('Sol Ring'));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(screen.getByText('Sol Ring')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('cancelling confirmation returns to the search view', () => {
    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    fireEvent.click(getCardOption('Sol Ring'));
    expect(screen.getByText("Tutor Sol Ring from Player A's library?")).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('textbox', { name: "Search Player A's library" })).toBeTruthy();
  });

  it('calls onClose when Cancel button is clicked in search view', () => {
    const onClose = vi.fn();

    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Close is clicked in done view', () => {
    const solRing = makeCard('Sol Ring');
    const onClose = vi.fn();

    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([], solRing)}
        onClose={onClose}
      />,
    );

    fireEvent.click(getCardOption('Sol Ring'));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('uses arrow key navigation to select an option and Enter to confirm selection', () => {
    const onDispatch = vi.fn<(action: Action) => ActionResult>().mockReturnValue(
      makeResult([], makeCard('Sol Ring')),
    );

    render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={onDispatch}
        onClose={() => {}}
      />,
    );

    const modal = screen.getByRole('dialog');

    // Navigate down to first item
    fireEvent.keyDown(modal, { key: 'ArrowDown' });
    // Navigate down again to second item
    fireEvent.keyDown(modal, { key: 'ArrowDown' });
    // Back up to first item
    fireEvent.keyDown(modal, { key: 'ArrowUp' });
    // Press Enter to select first item (Sol Ring)
    fireEvent.keyDown(modal, { key: 'Enter' });

    expect(screen.getByText("Tutor Sol Ring from Player A's library?")).toBeTruthy();
  });

  it('shows card types alongside card names', () => {
    const library = [makeCard('Sol Ring', 'nonland'), makeCard('Forest', 'land')];

    render(
      <TutorModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('nonland')).toBeTruthy();
    expect(screen.getByText('land')).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions on the search view', async () => {
    const { container } = render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions on the confirmation view', async () => {
    const { container } = render(
      <TutorModal
        player="A"
        library={defaultLibrary}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    fireEvent.click(getCardOption('Sol Ring'));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
