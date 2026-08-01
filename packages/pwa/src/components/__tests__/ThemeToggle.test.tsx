import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle.js';

// Mock the useDarkMode hook
vi.mock('../../utils/useDarkMode.js', () => ({
  useDarkMode: vi.fn(() => ({
    isDark: false,
    toggle: vi.fn(),
  })),
}));

describe('ThemeToggle', () => {
  it('should render a button with accessible label', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
  });

  it('should show moon emoji when light mode is active', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('🌙');
  });

  it('should call toggle when clicked', async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn();
    
    vi.doMock('../../utils/useDarkMode.js', () => ({
      useDarkMode: vi.fn(() => ({
        isDark: false,
        toggle: mockToggle,
      })),
    }));

    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    await user.click(button);
    expect(mockToggle).toHaveBeenCalled();
  });
});
