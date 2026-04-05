import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { CardDisplay } from '../CardDisplay.js';
import type { Card } from '@scryglass/core';

/* ------------------------------------------------------------------ */
/*  Module mock for useCardImage                                      */
/* ------------------------------------------------------------------ */

const mockUseCardImage = vi.fn();

vi.mock('../../scryfall/useCardImage', () => ({
  useCardImage: (...args: unknown[]) => mockUseCardImage(...args),
}));

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const testCard: Card = {
  name: 'Lightning Bolt',
  setCode: 'lea',
  collectorNumber: '161',
  cardType: 'nonland',
};

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('<CardDisplay />', () => {
  it('renders a placeholder state', () => {
    render(<CardDisplay player="A" />);
    expect(screen.getByText('No cards to display')).toBeTruthy();
  });

  it('has an accessible region label', () => {
    render(<CardDisplay player="A" />);
    expect(
      screen.getByRole('region', { name: /Player A card display/i }),
    ).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(<CardDisplay player="A" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders loading indicator while image loads', () => {
    mockUseCardImage.mockReturnValue({
      status: 'loading',
      imageUrl: null,
      cardName: 'Lightning Bolt',
    });

    render(<CardDisplay player="A" card={testCard} />);

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Loading image for Lightning Bolt')).toBeTruthy();
  });

  it('renders image when loaded', () => {
    mockUseCardImage.mockReturnValue({
      status: 'loaded',
      imageUrl: 'blob:mock/1',
      cardName: 'Lightning Bolt',
    });

    render(<CardDisplay player="A" card={testCard} />);

    const img = screen.getByRole('img', { name: 'Lightning Bolt' });
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('blob:mock/1');
  });

  it('renders card name text on error (graceful degradation)', () => {
    mockUseCardImage.mockReturnValue({
      status: 'error',
      imageUrl: null,
      cardName: 'Lightning Bolt',
    });

    render(<CardDisplay player="A" card={testCard} />);

    expect(screen.getByText('Lightning Bolt')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
