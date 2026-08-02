import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { DndContext } from '@dnd-kit/core';
import { axe } from 'vitest-axe';
import { GameZone } from '../GameZone.js';
import type { Card, CardHash, HiddenCard } from '@scryglass/core';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: unknown }) => <>{children}</>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
  }),
}));

// Mock CommanderAvatar component to avoid dependency on useCommanderAvatar hook
vi.mock('../CommanderAvatar', () => ({
  CommanderAvatar: ({ card }: { card: Card }) => (
    <div class="commander-avatar-mock">{card.name}</div>
  ),
}));

vi.mock('../../scryfall/useCardImage', () => ({
  useCardImage: () => ({
    status: 'loaded',
    imageUrl: 'blob:mock/1',
    collectorNumber: '263',
  }),
}));

const testCard: Card = {
  name: 'Sol Ring',
  setCode: 'c21',
  collectorNumber: '263',
  cardType: 'nonland',
};

const testCommander: Card = {
  name: 'Teferi, Master of Time',
  setCode: 'c21',
  collectorNumber: '48',
  cardType: 'commander',
};

const hiddenCard: CardHash = {
  hash: 'b'.repeat(64),
};

describe('<GameZone />', () => {
  function renderGameZone(zoneName: string, zone: 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'commandZone', cards: HiddenCard[]) {
    return render(
      <DndContext>
        <GameZone player="A" zone={zone} zoneName={zoneName} cards={cards} />
      </DndContext>,
    );
  }

  it('renders zone title and card count', () => {
    renderGameZone('Battlefield', 'battlefield', [testCard]);
    expect(screen.getByText('Battlefield')).toBeTruthy();
    expect(screen.getByText('1 card')).toBeTruthy();
  });

  it('displays "cards" (plural) when more than one card', () => {
    const cards = [testCard, testCard];
    renderGameZone('Graveyard', 'graveyard', cards);
    expect(screen.getByText('2 cards')).toBeTruthy();
  });

  it('displays "card" (singular) when exactly one card', () => {
    renderGameZone('Exile', 'exile', [testCard]);
    expect(screen.getByText('1 card')).toBeTruthy();
  });

  it('renders empty state when no cards', () => {
    renderGameZone('Command Zone', 'commandZone', []);
    expect(screen.getByText('No cards in Command Zone')).toBeTruthy();
  });

  it('renders multiple cards in a list', () => {
    const cards = [testCard, testCard, testCard];
    const { container } = renderGameZone('Battlefield', 'battlefield', cards);
    const listItems = container.querySelectorAll('.game-zone__card-item');
    expect(listItems.length).toBe(3);
  });

  it('renders hidden card hashes as generic card backs', () => {
    renderGameZone('Hand', 'hand', [hiddenCard]);

    expect(screen.getByRole('img', { name: 'Hidden card 1 in Hand' })).toBeTruthy();
  });

  it('renders a remote cursor and card highlight on the battlefield', () => {
    const { container } = render(
      <DndContext>
        <GameZone
          player="A"
          zone="battlefield"
          zoneName="Battlefield"
          cards={[testCard]}
          remotePresence={{
            player: 'A',
            zone: 'battlefield',
            cardId: 'battlefield:c21:263:Sol Ring:0',
            interaction: 'drag',
            position: { x: 48, y: 72 },
            cleared: false,
          }}
        />
      </DndContext>,
    );

    expect(container.querySelector('.game-zone__remote-cursor')).toBeTruthy();
    expect(container.querySelector('.game-zone__card-item--remote-active')).toBeTruthy();
  });

  it('emits hover presence updates with battlefield-relative coordinates', () => {
    const onPresenceChange = vi.fn();
    render(
      <DndContext>
        <GameZone
          player="A"
          zone="battlefield"
          zoneName="Battlefield"
          cards={[testCard]}
          onPresenceChange={onPresenceChange}
        />
      </DndContext>,
    );

    const surface = document.getElementById('zone-surface-A-battlefield');
    expect(surface).toBeTruthy();
    Object.defineProperty(surface, 'getBoundingClientRect', {
      value: () => ({
        left: 10,
        top: 20,
        width: 200,
        height: 120,
      }),
    });

    fireEvent.pointerMove(screen.getByRole('button', { name: 'Sol Ring in Battlefield' }), {
      clientX: 64,
      clientY: 52,
    });

    expect(onPresenceChange).toHaveBeenLastCalledWith({
      player: 'A',
      zone: 'battlefield',
      cardId: 'battlefield:c21:263:Sol Ring:0',
      interaction: 'hover',
      position: { x: 54, y: 32 },
    });
  });

  it('requires an explicit peek before showing visible hand card faces', () => {
    renderGameZone('Hand', 'hand', [testCard]);

    expect(screen.getByRole('img', { name: 'Hidden card 1 in Hand' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Sol Ring' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Peek at Hand' }));

    expect(screen.getByRole('img', { name: 'Sol Ring' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Hidden card 1 in Hand' })).toBeNull();
  });

  it('uses a semantic section element with aria-label', () => {
    const { container } = renderGameZone('Battlefield', 'battlefield', []);
    const section = container.querySelector('section');
    expect(section).toBeTruthy();
    expect(section?.getAttribute('aria-label')).toBe('Battlefield zone');
  });

  it('has proper aria-label on card list', () => {
    const { container } = render(
      <DndContext>
        <GameZone player="A" zone="graveyard" zoneName="Graveyard" cards={[testCard, testCard]} />
      </DndContext>
    );
    const ul = container.querySelector('ul');
    expect(ul?.getAttribute('aria-label')).toBe('Cards in Graveyard');
  });

  it('displays commanders in command zone with special styling', () => {
    const { container } = render(
      <DndContext>
        <GameZone player="A" zone="commandZone" zoneName="Command Zone" cards={[testCommander]} />
      </DndContext>
    );
    const list = container.querySelector('.game-zone__card-list--commanders');
    expect(list).toBeTruthy();
    expect(screen.getByText('Teferi, Master of Time')).toBeTruthy();
  });

  it('renders commander items with special CSS class', () => {
    const { container } = render(
      <DndContext>
        <GameZone player="A" zone="commandZone" zoneName="Command Zone" cards={[testCommander]} />
      </DndContext>
    );
    const commanderItems = container.querySelectorAll('.game-zone__card-item--commander');
    expect(commanderItems.length).toBe(1);
  });

  it('handles multiple commanders in command zone', () => {
    const { container } = render(
      <DndContext>
        <GameZone player="A" zone="commandZone" zoneName="Command Zone" cards={[testCommander, testCommander]} />
      </DndContext>
    );
    const commanderItems = container.querySelectorAll('.game-zone__card-item--commander');
    expect(commanderItems.length).toBe(2);
  });

  it('does not display command zone with special commander styling for other zones', () => {
    const { container } = render(
      <DndContext>
        <GameZone player="A" zone="battlefield" zoneName="Battlefield" cards={[testCommander]} />
      </DndContext>
    );
    const list = container.querySelector('.game-zone__card-list--commanders');
    expect(list).toBeNull();
    const commanderItems = container.querySelectorAll('.game-zone__card-item--commander');
    expect(commanderItems.length).toBe(0);
  });

  it('passes vitest-axe a11y assertions with cards', async () => {
    const { container } = renderGameZone('Battlefield', 'battlefield', [testCard]);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions when empty', async () => {
    const { container } = renderGameZone('Exile', 'exile', []);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions with multiple cards', async () => {
    const cards = [testCard, testCard, testCard];
    const { container } = renderGameZone('Command Zone', 'commandZone', cards);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions with commanders', async () => {
    const { container } = renderGameZone('Command Zone', 'commandZone', [testCommander]);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
