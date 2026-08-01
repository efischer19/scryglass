import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { GameZone } from '../GameZone.js';
import type { Card } from '@scryglass/core';

// Mock CommanderAvatar component to avoid dependency on useCommanderAvatar hook
vi.mock('../CommanderAvatar', () => ({
  CommanderAvatar: ({ card }: { card: Card }) => (
    <div class="commander-avatar-mock">{card.name}</div>
  ),
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

describe('<GameZone />', () => {
  it('renders zone title and card count', () => {
    render(<GameZone zoneName="Battlefield" cards={[testCard]} />);
    expect(screen.getByText('Battlefield')).toBeTruthy();
    expect(screen.getByText('1 card')).toBeTruthy();
  });

  it('displays "cards" (plural) when more than one card', () => {
    const cards = [testCard, testCard];
    render(<GameZone zoneName="Graveyard" cards={cards} />);
    expect(screen.getByText('2 cards')).toBeTruthy();
  });

  it('displays "card" (singular) when exactly one card', () => {
    render(<GameZone zoneName="Exile" cards={[testCard]} />);
    expect(screen.getByText('1 card')).toBeTruthy();
  });

  it('renders empty state when no cards', () => {
    render(<GameZone zoneName="Command Zone" cards={[]} />);
    expect(screen.getByText('No cards in Command Zone')).toBeTruthy();
  });

  it('renders multiple cards in a list', () => {
    const cards = [testCard, testCard, testCard];
    const { container } = render(<GameZone zoneName="Battlefield" cards={cards} />);
    const listItems = container.querySelectorAll('.game-zone__card-item');
    expect(listItems.length).toBe(3);
  });

  it('uses a semantic section element with aria-label', () => {
    const { container } = render(<GameZone zoneName="Battlefield" cards={[]} />);
    const section = container.querySelector('section');
    expect(section).toBeTruthy();
    expect(section?.getAttribute('aria-label')).toBe('Battlefield zone');
  });

  it('has proper aria-label on card list', () => {
    const { container } = render(
      <GameZone zoneName="Graveyard" cards={[testCard, testCard]} />
    );
    const ul = container.querySelector('ul');
    expect(ul?.getAttribute('aria-label')).toBe('Cards in Graveyard');
  });

  it('displays commanders in command zone with special styling', () => {
    const { container } = render(
      <GameZone zoneName="Command Zone" cards={[testCommander]} />
    );
    const list = container.querySelector('.game-zone__card-list--commanders');
    expect(list).toBeTruthy();
    expect(screen.getByText('Teferi, Master of Time')).toBeTruthy();
  });

  it('renders commander items with special CSS class', () => {
    const { container } = render(
      <GameZone zoneName="Command Zone" cards={[testCommander]} />
    );
    const commanderItems = container.querySelectorAll('.game-zone__card-item--commander');
    expect(commanderItems.length).toBe(1);
  });

  it('handles multiple commanders in command zone', () => {
    const { container } = render(
      <GameZone zoneName="Command Zone" cards={[testCommander, testCommander]} />
    );
    const commanderItems = container.querySelectorAll('.game-zone__card-item--commander');
    expect(commanderItems.length).toBe(2);
  });

  it('does not display command zone with special commander styling for other zones', () => {
    const { container } = render(
      <GameZone zoneName="Battlefield" cards={[testCommander]} />
    );
    const list = container.querySelector('.game-zone__card-list--commanders');
    expect(list).toBeNull();
    const commanderItems = container.querySelectorAll('.game-zone__card-item--commander');
    expect(commanderItems.length).toBe(0);
  });

  it('passes vitest-axe a11y assertions with cards', async () => {
    const { container } = render(
      <GameZone zoneName="Battlefield" cards={[testCard]} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions when empty', async () => {
    const { container } = render(<GameZone zoneName="Exile" cards={[]} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions with multiple cards', async () => {
    const cards = [testCard, testCard, testCard];
    const { container } = render(
      <GameZone zoneName="Command Zone" cards={cards} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes vitest-axe a11y assertions with commanders', async () => {
    const { container } = render(
      <GameZone zoneName="Command Zone" cards={[testCommander]} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
