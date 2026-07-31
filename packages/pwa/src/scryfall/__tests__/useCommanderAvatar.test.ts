import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';

vi.mock('../jit-priority', () => ({
  priorityFetchArtCrop: vi.fn(),
}));

import { useCommanderAvatar } from '../useCommanderAvatar';
import { priorityFetchArtCrop } from '../jit-priority';

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

describe('useCommanderAvatar', () => {
  it('returns status: loading initially', () => {
    vi.mocked(priorityFetchArtCrop).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCommanderAvatar('48', 'c21'));

    expect(result.current.status).toBe('loading');
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.collectorNumber).toBe('48');
  });

  it('transitions to status: loaded with an imageUrl on successful fetch', async () => {
    vi.mocked(priorityFetchArtCrop).mockResolvedValueOnce('blob:mock/1');

    const { result } = renderHook(() => useCommanderAvatar('48', 'c21'));

    await act(async () => {});

    expect(result.current.status).toBe('loaded');
    expect(result.current.imageUrl).toBe('blob:mock/1');
    expect(result.current.collectorNumber).toBe('48');
  });

  it('transitions to status: error when fetch returns null', async () => {
    vi.mocked(priorityFetchArtCrop).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useCommanderAvatar('999', 'set1'));

    await act(async () => {});

    expect(result.current.status).toBe('error');
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.collectorNumber).toBe('999');
  });

  it('revokes the object URL on unmount', async () => {
    vi.mocked(priorityFetchArtCrop).mockResolvedValueOnce('blob:mock/1');

    const { result, unmount } = renderHook(() => useCommanderAvatar('1', 'set1'));

    await act(async () => {});

    expect(result.current.status).toBe('loaded');
    expect(result.current.imageUrl).toBe('blob:mock/1');

    unmount();

    expect(revokedUrls).toContain('blob:mock/1');
  });

  it('revokes object URL if fetch resolves after component unmount', async () => {
    let resolvePromise: (v: string | null) => void = () => {};
    vi.mocked(priorityFetchArtCrop).mockImplementationOnce(
      () => new Promise((r) => { resolvePromise = r; }),
    );

    const { unmount } = renderHook(() => useCommanderAvatar('1', 'set1'));

    unmount();

    await act(async () => {
      resolvePromise('blob:mock/1');
    });

    expect(revokedUrls).toContain('blob:mock/1');
  });

  it('calls priorityFetchArtCrop with correct parameters', () => {
    vi.mocked(priorityFetchArtCrop).mockResolvedValueOnce('blob:mock/1');

    renderHook(() => useCommanderAvatar('48', 'c21'));

    expect(priorityFetchArtCrop).toHaveBeenCalledWith('48', 'c21');
  });
});
