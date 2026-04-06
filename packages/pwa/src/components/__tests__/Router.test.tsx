import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { Router, navigate } from '../Router.js';

beforeEach(() => {
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

  it('has an aria-live region for accessibility', () => {
    const { container } = render(
      <Router
        inputView={<p>Input View</p>}
        editorView={<p>Editor View</p>}
        appView={<p>App View</p>}
      />,
    );
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it.each([
    ['#/input', 'Deck Input — Scryglass'],
    ['#/editor', 'Deck Editor — Scryglass'],
    ['#/app', 'Game — Scryglass'],
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
});

describe('navigate()', () => {
  it('sets window.location.hash', () => {
    navigate('#/app');
    expect(window.location.hash).toBe('#/app');
  });

  it('navigates to input view', () => {
    navigate('#/app');
    navigate('#/input');
    expect(window.location.hash).toBe('#/input');
  });

  it('navigates to editor view', () => {
    navigate('#/editor');
    expect(window.location.hash).toBe('#/editor');
  });
});
