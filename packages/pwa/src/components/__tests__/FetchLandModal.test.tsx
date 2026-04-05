import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { FetchLandModal } from '../FetchLandModal.js';
import type { Action, ActionResult, Card } from '@scryglass/core';

function makeBasicLand(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'land' };
}

function makeCard(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'nonland' };
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

function makeResult(library: Card[], fetchedCard: Card | null = null): ActionResult {
  return {
    state: makeGameState(library),
    card: fetchedCard,
  };
}

describe('<FetchLandModal />', () => {
  it('renders five land type buttons with correct counts', () => {
    const library = [
      makeBasicLand('Mountain'),
      makeBasicLand('Mountain'),
      makeBasicLand('Mountain'),
      makeBasicLand('Island'),
      makeBasicLand('Island'),
      makeBasicLand('Swamp'),
      makeBasicLand('Forest'),
      makeBasicLand('Plains'),
      makeCard('Sol Ring'),
    ];

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Fetch Mountain, 3 remaining' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fetch Island, 2 remaining' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fetch Swamp, 1 remaining' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fetch Forest, 1 remaining' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fetch Plains, 1 remaining' })).toBeTruthy();
  });

  it('shows 0 count and disables buttons for absent land types', () => {
    const library = [makeBasicLand('Mountain')];

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    const islandBtn = screen.getByRole('button', { name: 'Fetch Island, 0 remaining' });
    expect(islandBtn).toHaveProperty('disabled', true);
    expect(islandBtn.getAttribute('aria-disabled')).toBe('true');

    const mountainBtn = screen.getByRole('button', { name: 'Fetch Mountain, 1 remaining' });
    expect(mountainBtn).toHaveProperty('disabled', false);
    expect(mountainBtn.getAttribute('aria-disabled')).toBe('false');
  });

  it('shows "No basic lands remaining" when library has no basic lands', () => {
    const library = [makeCard('Sol Ring'), makeCard('Counterspell')];

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('No basic lands remaining')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('selecting a land type opens the ConfirmationGate', () => {
    const mountain = makeBasicLand('Mountain');
    const library = [mountain];

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([], mountain)}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fetch Mountain, 1 remaining' }));

    expect(screen.getByText("Fetch Mountain from Player A's library?")).toBeTruthy();
  });

  it('dispatches FETCH_BASIC_LAND after confirmation', () => {
    const mountain = makeBasicLand('Mountain');
    const library = [mountain];
    const onDispatch = vi.fn<(action: Action) => ActionResult>().mockReturnValue(makeResult([], mountain));

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={onDispatch}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fetch Mountain, 1 remaining' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'FETCH_BASIC_LAND',
      payload: { player: 'A', landType: 'Mountain' },
    });
  });

  it('displays the fetched card in CardDisplay after confirmation', () => {
    const mountain = makeBasicLand('Mountain');
    const library = [mountain];

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([], mountain)}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fetch Mountain, 1 remaining' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(screen.getByText('Mountain')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const library = [makeBasicLand('Island')];
    const onClose = vi.fn();

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('cancelling confirmation gate returns to land selection', () => {
    const library = [makeBasicLand('Forest')];

    render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fetch Forest, 1 remaining' }));
    expect(screen.getByText("Fetch Forest from Player A's library?")).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Fetch Forest, 1 remaining' })).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions on land selection view', async () => {
    const library = [makeBasicLand('Mountain'), makeBasicLand('Island')];

    const { container } = render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions on confirmation gate', async () => {
    const library = [makeBasicLand('Mountain')];

    const { container } = render(
      <FetchLandModal
        player="A"
        library={library}
        onDispatch={() => makeResult([])}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fetch Mountain, 1 remaining' }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
