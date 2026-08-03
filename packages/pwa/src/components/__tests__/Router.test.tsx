import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { Router, navigate, navigateHome, navigateToMatch } from '../Router.js';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  window.location.hash = '';
});

describe('<Router />', () => {
  it('renders the input view by default when no hash is set', () => {
    render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    expect(screen.getByText('Input View')).toBeTruthy();
    expect(screen.queryByText('App View')).toBeNull();
    expect(screen.queryByText('Editor View')).toBeNull();
  });

  it('renders the app view when hash is #/app', () => {
    window.location.hash = '#/app';
    render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    expect(screen.getByText('App View')).toBeTruthy();
    expect(screen.queryByText('Input View')).toBeNull();
    expect(screen.queryByText('Editor View')).toBeNull();
  });

  it('renders the editor view when hash is #/editor', () => {
    window.location.hash = '#/editor';
    render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    expect(screen.getByText('Editor View')).toBeTruthy();
    expect(screen.queryByText('Input View')).toBeNull();
    expect(screen.queryByText('App View')).toBeNull();
  });

  it('renders the match view for /match/:roomCode paths', () => {
    window.history.replaceState({}, '', '/match/ROOM123');
    render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
        matchView={(roomCode) => <p>Match View {roomCode}</p>}
      />,
    );
    expect(screen.getByText('Match View ROOM123')).toBeTruthy();
  });

  it('defaults to input view for invalid hashes', () => {
    window.location.hash = '#/invalid';
    render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    expect(screen.getByText('Input View')).toBeTruthy();
  });

  it('has a visually-hidden assertive aria-live announcement region', () => {
    const { container } = render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    const liveRegion = container.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.className).toContain('sr-only');
  });

  it.each([
    ['#/input', 'Navigated to Deck Input'],
    ['#/editor', 'Navigated to Deck Editor'],
    ['#/app', 'Navigated to Game'],
  ] as const)(
    'announces "%s" when navigating to %s',
    (hash, expectedAnnouncement) => {
      window.location.hash = hash;
      const { container } = render(
        <Router
          inputView={<p>Input View</p>}
          editorView={<p>Editor View</p>}
          appView={<p>App View</p>}
        />,
      );
      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion?.textContent).toBe(expectedAnnouncement);
    },
  );

  it('updates announcement text when route changes', async () => {
    window.location.hash = '#/input';
    const { container } = render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    const liveRegion = container.querySelector('[aria-live="assertive"]');
    expect(liveRegion?.textContent).toBe('Navigated to Deck Input');

    await act(async () => {
      window.location.hash = '#/app';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(liveRegion?.textContent).toBe('Navigated to Game');
    expect(document.title).toBe('Game — Scrymat');
  });

  it('updates to the match view when pathname changes', async () => {
    const { container } = render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
        matchView={(roomCode) => <p>Match View {roomCode}</p>}
      />,
    );

    await act(async () => {
      navigateToMatch('ROOM999');
    });

    expect(screen.getByText('Match View ROOM999')).toBeTruthy();
    expect(document.title).toBe('Match ROOM999 — Scrymat');
    const liveRegion = container.querySelector('[aria-live="assertive"]');
    expect(liveRegion?.textContent).toBe('Navigated to Match ROOM999');
  });

  it.each([
    ['#/input', 'Deck Input — Scrymat'],
    ['#/editor', 'Deck Editor — Scrymat'],
    ['#/app', 'Game — Scrymat'],
  ] as const)(
    'sets document.title to "%s" for route %s',
    (hash, expectedTitle) => {
      window.location.hash = hash;
      render(
        <Router
          inputView={<p>Input View</p>}
          editorView={<p>Editor View</p>}
          appView={<p>App View</p>}
        />,
      );
      expect(document.title).toBe(expectedTitle);
    },
  );

  it('passes vitest-axe a11y assertions', async () => {
    const { container } = render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('navigation helpers', () => {
  it('sets window.location.hash', () => {
    navigate('#/app');
    expect(window.location.hash).toBe('#/app');
  });

  it('navigates to a match route', () => {
    navigateToMatch('ROOM123');
    expect(window.location.pathname).toBe('/match/ROOM123');
  });

  it('returns home to the input route', () => {
    navigateToMatch('ROOM123');
    navigateHome();
    expect(window.location.pathname).toBe('/');
    expect(window.location.hash).toBe('#/input');
  });
});
