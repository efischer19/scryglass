import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { ConfirmationGate } from '../ConfirmationGate.js';

describe('<ConfirmationGate />', () => {
  it('renders the confirmation message', () => {
    render(
      <ConfirmationGate
        message="Draw from Player A's library?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Draw from Player A's library?")).toBeTruthy();
  });

  it('renders Yes and Cancel buttons', () => {
    render(
      <ConfirmationGate
        message="Test message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('calls onConfirm when Yes is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationGate
        message="Test"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationGate
        message="Test"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('dismisses on Escape keypress', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationGate
        message="Test"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('confirms on Enter keypress', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationGate
        message="Test"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('focuses the Yes button on mount', () => {
    render(
      <ConfirmationGate
        message="Test"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Yes' }),
    );
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(
      <ConfirmationGate
        message="Draw from Player A's library?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
