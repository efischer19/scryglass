import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';

/* ------------------------------------------------------------------ */
/*  Module mocks — must be at top level                               */
/* ------------------------------------------------------------------ */

vi.mock('../jit-priority', () => ({
  priorityFetch: vi.fn(),
}));

import { useCardImage } from '../useCardImage';
import { priorityFetch } from '../jit-priority';

/* ------------------------------------------------------------------ */
/*  URL stub                                                          */
/* ------------------------------------------------------------------ */

let revokedUrls: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  revokedUrls = [];

  vi.stubGlobal(
    'URL',
    new Proxy(globalThis.URL, {
      get(target, prop) {
        if (prop === 'createObjectURL') {
          return () => 'blob:mock/1';
        }
        if (prop === 'revokeObjectURL') {
          return (url: string) => { revokedUrls.push(url); };
        }
        return Reflect.get(target, prop) as unknown;
      },
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('useCardImage', () => {
  it('returns status: loading initially', () => {
    vi.mocked(priorityFetch).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCardImage('161', 'lea'));

    expect(result.current.status).toBe('loading');
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.collectorNumber).toBe('161');
  });

  it('transitions to status: loaded with an imageUrl on successful fetch', async () => {
    vi.mocked(priorityFetch).mockResolvedValueOnce('blob:mock/1');

    const { result } = renderHook(() => useCardImage('161', 'lea'));

    // Wait for the effect to settle
    await act(async () => {});

    expect(result.current.status).toBe('loaded');
    expect(result.current.imageUrl).toBe('blob:mock/1');
    expect(result.current.collectorNumber).toBe('161');
  });

  it('transitions to status: error when fetch returns null', async () => {
    vi.mocked(priorityFetch).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useCardImage('999', 'set1'));

    await act(async () => {});

    expect(result.current.status).toBe('error');
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.collectorNumber).toBe('999');
  });

  it('revokes the object URL on unmount', async () => {
    vi.mocked(priorityFetch).mockResolvedValueOnce('blob:mock/1');

    const { result, unmount } = renderHook(() => useCardImage('1', 'set1'));

    await act(async () => {});

    expect(result.current.status).toBe('loaded');
    expect(result.current.imageUrl).toBe('blob:mock/1');

    unmount();

    expect(revokedUrls).toContain('blob:mock/1');
  });

  it('revokes object URL if fetch resolves after component unmount', async () => {
    let resolvePromise: (v: string | null) => void = () => {};
    vi.mocked(priorityFetch).mockImplementationOnce(
      () => new Promise((r) => { resolvePromise = r; }),
    );

    const { unmount } = renderHook(() => useCardImage('1', 'set1'));

    // Unmount before fetch resolves
    unmount();

    // Resolve the fetch — the cleanup closure should revoke the URL
    await act(async () => {
      resolvePromise('blob:mock/1');
    });

    expect(revokedUrls).toContain('blob:mock/1');
  });
});
