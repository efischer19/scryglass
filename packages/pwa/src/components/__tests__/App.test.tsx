import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { App } from '../App.js';

describe('<App />', () => {
  it('renders a Header and two PlayerZone components', () => {
    render(<App />);

    expect(screen.getByText('Scryglass')).toBeTruthy();
    expect(screen.getByText('Load Decks')).toBeTruthy();
    expect(screen.getByText('Player A')).toBeTruthy();
    expect(screen.getByText('Player B')).toBeTruthy();
  });

  it('renders both player zones inside a main element', () => {
    const { container } = render(<App />);
    const main = container.querySelector('main');
    expect(main).toBeTruthy();

    const sections = main!.querySelectorAll('section');
    expect(sections).toHaveLength(2);
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
