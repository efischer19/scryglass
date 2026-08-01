import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';

// Mock the useDarkMode hook
const mockToggle = vi.fn();
vi.mock('../../utils/useDarkMode.js', () => ({
  useDarkMode: vi.fn(() => ({
    isDark: false,
    toggle: mockToggle,
  })),
}));

import { ThemeToggle } from '../ThemeToggle.js';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a button with accessible label when light mode is active', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeDefined();
  });

  it('should show moon emoji when light mode is active', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('🌙');
  });

  it('should have correct title attribute', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.title).toBe('Switch to dark mode');
  });

  it('should call toggle when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    await user.click(button);
    expect(mockToggle).toHaveBeenCalled();
  });
});
