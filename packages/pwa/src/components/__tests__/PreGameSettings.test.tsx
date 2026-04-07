import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { PreGameSettings } from '../PreGameSettings.js';
import type { GameSettings } from '../PreGameSettings.js';

describe('<PreGameSettings />', () => {
  it('renders the Game Settings heading', () => {
    render(<PreGameSettings onConfirm={() => {}} />);
    expect(screen.getByText('Game Settings')).toBeTruthy();
  });

  it('renders a player count selector defaulting to 2', () => {
    render(<PreGameSettings onConfirm={() => {}} />);
    const select = screen.getByRole('combobox', { name: /number of players/i });
    expect(select).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe('2');
  });

  it('renders all player count options (1-4)', () => {
    render(<PreGameSettings onConfirm={() => {}} />);
    const select = screen.getByRole('combobox', { name: /number of players/i });
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(4);
    expect(options[0].value).toBe('1');
    expect(options[1].value).toBe('2');
    expect(options[2].value).toBe('3');
    expect(options[3].value).toBe('4');
  });

  it('renders the mulligan toggle checkbox defaulting to unchecked', () => {
    render(<PreGameSettings onConfirm={() => {}} />);
    const checkbox = screen.getByRole('checkbox', { name: /allow mulligan with 2 or 5 lands/i });
    expect(checkbox).toBeTruthy();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it('renders the Start Game button', () => {
    render(<PreGameSettings onConfirm={() => {}} />);
    expect(screen.getByRole('button', { name: /start game/i })).toBeTruthy();
  });

  it('calls onConfirm with default settings when Start Game is clicked', () => {
    const handleConfirm = vi.fn();
    render(<PreGameSettings onConfirm={handleConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleConfirm).toHaveBeenCalledWith({
      playerCount: 2,
      allowMulliganWith2or5Lands: false,
    } satisfies GameSettings);
  });

  it('calls onConfirm with updated player count', () => {
    const handleConfirm = vi.fn();
    render(<PreGameSettings onConfirm={handleConfirm} />);

    const select = screen.getByRole('combobox', { name: /number of players/i });
    fireEvent.change(select, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ playerCount: 3 }),
    );
  });

  it('calls onConfirm with 1 player when selected', () => {
    const handleConfirm = vi.fn();
    render(<PreGameSettings onConfirm={handleConfirm} />);

    const select = screen.getByRole('combobox', { name: /number of players/i });
    fireEvent.change(select, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ playerCount: 1 }),
    );
  });

  it('calls onConfirm with mulligan setting enabled', () => {
    const handleConfirm = vi.fn();
    render(<PreGameSettings onConfirm={handleConfirm} />);

    const checkbox = screen.getByRole('checkbox', { name: /allow mulligan with 2 or 5 lands/i });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ allowMulliganWith2or5Lands: true }),
    );
  });

  it('shows descriptive hint text for the mulligan setting', () => {
    render(<PreGameSettings onConfirm={() => {}} />);
    expect(screen.getByText(/hands with exactly 2 or 5 lands/i)).toBeTruthy();
  });

  it('uses a semantic section element with aria-label', () => {
    const { container } = render(<PreGameSettings onConfirm={() => {}} />);
    const section = container.querySelector('section[aria-label]');
    expect(section).toBeTruthy();
    expect(section?.getAttribute('aria-label')).toBe('Pre-game settings');
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(<PreGameSettings onConfirm={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
