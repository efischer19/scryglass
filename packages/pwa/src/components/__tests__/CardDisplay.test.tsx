import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { CardDisplay } from '../CardDisplay.js';

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
});
