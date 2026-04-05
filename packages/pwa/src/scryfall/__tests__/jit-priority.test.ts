import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Module mocks — must be at top level                               */
/* ------------------------------------------------------------------ */

vi.mock('../fetch-wrapper', () => ({
  fetchCardImage: vi.fn(),
  getQueueLength: vi.fn(() => 0),
  _resetForTesting: vi.fn(),
}));

vi.mock('../prefetch-coordinator', () => ({
  pausePrefetch: vi.fn(),
  resumePrefetch: vi.fn(),
}));

import { priorityFetch, _resetForTesting } from '../jit-priority';
import {
  getCachedImage,
  cacheImage,
  clearCache,
} from '../image-cache';
import { fetchCardImage } from '../fetch-wrapper';
import { pausePrefetch, resumePrefetch } from '../prefetch-coordinator';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeBlob(content = 'image-data', type = 'image/jpeg'): Blob {
  return new Blob([content], { type });
}

let objectUrlCounter = 0;

/* ------------------------------------------------------------------ */
/*  Setup / teardown                                                  */
/* ------------------------------------------------------------------ */

beforeEach(async () => {
  await clearCache();
  vi.clearAllMocks();
  _resetForTesting();
  objectUrlCounter = 0;

  vi.stubGlobal(
    'URL',
    new Proxy(globalThis.URL, {
      get(target, prop) {
        if (prop === 'createObjectURL') {
          return (_blob: Blob) => `blob:mock/${String(++objectUrlCounter)}`;
        }
        if (prop === 'revokeObjectURL') {
          return () => {};
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

describe('priorityFetch', () => {
  it('returns immediately from cache without calling the fetch wrapper', async () => {
    const blob = makeBlob();
    await cacheImage('Lightning Bolt', 'lea', blob);

    const url = await priorityFetch('Lightning Bolt', 'lea');

    expect(url).not.toBeNull();
    expect(url).toContain('blob:');
    expect(fetchCardImage).not.toHaveBeenCalled();
  });

  it('calls fetchCardImage and caches the result on a cache miss', async () => {
    const blob = makeBlob('fetched-data');
    vi.mocked(fetchCardImage).mockResolvedValueOnce(blob);

    const url = await priorityFetch('Counterspell', 'tmp');

    expect(url).not.toBeNull();
    expect(url).toContain('blob:');
    expect(fetchCardImage).toHaveBeenCalledTimes(1);
    expect(fetchCardImage).toHaveBeenCalledWith(
      { setCode: 'tmp', collectorNumber: 'Counterspell' },
      'jit',
    );

    // Verify the image was cached
    const cached = await getCachedImage('Counterspell', 'tmp');
    expect(cached).not.toBeNull();
  });

  it('passes jit priority to fetchCardImage', async () => {
    vi.mocked(fetchCardImage).mockResolvedValueOnce(makeBlob());

    await priorityFetch('Card A', 'set1');

    expect(fetchCardImage).toHaveBeenCalledWith(
      expect.objectContaining({ setCode: 'set1' }),
      'jit',
    );
  });

  it('returns null when the card is not found (404)', async () => {
    vi.mocked(fetchCardImage).mockResolvedValueOnce(null);

    const url = await priorityFetch('Missing Card', 'set1');

    expect(url).toBeNull();
  });

  it('returns null when fetch throws a network error', async () => {
    vi.mocked(fetchCardImage).mockRejectedValueOnce(new Error('Network error'));

    const url = await priorityFetch('Error Card', 'set1');

    expect(url).toBeNull();
  });

  it('pauses the background prefetch worker during JIT fetch and resumes after', async () => {
    vi.mocked(fetchCardImage).mockResolvedValueOnce(makeBlob());

    await priorityFetch('Card A', 'set1');

    expect(pausePrefetch).toHaveBeenCalledTimes(1);
    expect(resumePrefetch).toHaveBeenCalledTimes(1);
  });

  it('resumes the background prefetch worker even when fetch fails', async () => {
    vi.mocked(fetchCardImage).mockRejectedValueOnce(new Error('fail'));

    await priorityFetch('Card A', 'set1');

    expect(pausePrefetch).toHaveBeenCalledTimes(1);
    expect(resumePrefetch).toHaveBeenCalledTimes(1);
  });

  it('pauses once and resumes once for multiple simultaneous JIT requests', async () => {
    let resolveA: (v: Blob | null) => void = () => {};
    let resolveB: (v: Blob | null) => void = () => {};

    vi.mocked(fetchCardImage)
      .mockImplementationOnce(() => new Promise((r) => { resolveA = r; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveB = r; }));

    const p1 = priorityFetch('Card A', 'set1');
    const p2 = priorityFetch('Card B', 'set2');

    // Let the cache checks (async) settle so pausePrefetch is called
    await new Promise((r) => setTimeout(r, 0));

    // After both start, pause should have been called once (first JIT)
    // but not yet resumed
    expect(pausePrefetch).toHaveBeenCalledTimes(1);
    expect(resumePrefetch).not.toHaveBeenCalled();

    resolveA(makeBlob());
    await p1;

    // Still one JIT active (Card B), so no resume yet
    expect(resumePrefetch).not.toHaveBeenCalled();

    resolveB(makeBlob());
    await p2;

    // Both done — resume called once
    expect(resumePrefetch).toHaveBeenCalledTimes(1);
  });

  it('does not pause prefetch when the result is cached', async () => {
    await cacheImage('Cached Card', 'set1', makeBlob());

    await priorityFetch('Cached Card', 'set1');

    expect(pausePrefetch).not.toHaveBeenCalled();
    expect(resumePrefetch).not.toHaveBeenCalled();
  });
});
