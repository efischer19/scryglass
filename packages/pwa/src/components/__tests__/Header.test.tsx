import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { Header } from '../Header.js';

describe('<Header />', () => {
  it('renders the app name', () => {
    render(<Header onLoadDecks={() => {}} />);
    expect(screen.getByText('Scryglass')).toBeTruthy();
  });

  it('renders a "Load Decks" button', () => {
    render(<Header onLoadDecks={() => {}} />);
    const button = screen.getByRole('button', { name: /load decks/i });
    expect(button).toBeTruthy();
  });

  it('uses a semantic header element', () => {
    const { container } = render(<Header onLoadDecks={() => {}} />);
    expect(container.querySelector('header')).toBeTruthy();
  });

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(<Header onLoadDecks={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
