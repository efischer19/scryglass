import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Module mock — must be at top level                                */
/* ------------------------------------------------------------------ */

vi.mock('../fetch-wrapper', () => ({
  fetchCardImage: vi.fn(),
}));

import {
  getCachedImage,
  cacheImage,
  getImageUrl,
  clearCache,
  getCacheSize,
} from '../image-cache';
import { fetchCardImage } from '../fetch-wrapper';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeBlob(content = 'image-data', type = 'image/jpeg'): Blob {
  return new Blob([content], { type });
}

let objectUrlCounter = 0;

/* ------------------------------------------------------------------ */
/*  Reset IndexedDB and mocks between tests                           */
/* ------------------------------------------------------------------ */

beforeEach(async () => {
  await clearCache();
  vi.clearAllMocks();
  objectUrlCounter = 0;

  // URL.createObjectURL is not available in jsdom — provide a stub
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

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('getCachedImage', () => {
  it('returns null on cache miss', async () => {
    const result = await getCachedImage('161', 'lea');
    expect(result).toBeNull();
  });

  it('returns the stored Blob on cache hit', async () => {
    const blob = makeBlob();
    await cacheImage('161', 'lea', blob);

    const result = await getCachedImage('161', 'lea');
    expect(result).not.toBeNull();
    expect(result!.size).toBe(blob.size);
    expect(result!.type).toBe('image/jpeg');
  });
});

describe('cacheImage / getCachedImage round-trip', () => {
  it('round-trips — cacheImage then getCachedImage returns the same blob', async () => {
    const blob = makeBlob('round-trip-data', 'image/png');
    await cacheImage('75', 'tmp', blob);

    const result = await getCachedImage('75', 'tmp');
    expect(result).not.toBeNull();
    expect(result!.size).toBe(blob.size);
    expect(result!.type).toBe('image/png');

    const text = await result!.text();
    expect(text).toBe('round-trip-data');
  });
});

describe('clearCache', () => {
  it('removes all entries and getCacheSize returns 0', async () => {
    await cacheImage('1', 'set1', makeBlob());
    await cacheImage('2', 'set2', makeBlob());
    expect(await getCacheSize()).toBe(2);

    await clearCache();
    expect(await getCacheSize()).toBe(0);
  });
});

describe('getCacheSize', () => {
  it('returns the correct count after multiple inserts', async () => {
    expect(await getCacheSize()).toBe(0);

    await cacheImage('1', 'set1', makeBlob());
    expect(await getCacheSize()).toBe(1);

    await cacheImage('2', 'set2', makeBlob());
    expect(await getCacheSize()).toBe(2);

    await cacheImage('3', 'set3', makeBlob());
    expect(await getCacheSize()).toBe(3);
  });
});

describe('getImageUrl', () => {
  it('returns an object URL for a cached image without calling the fetch wrapper', async () => {
    const blob = makeBlob();
    await cacheImage('1', 'set1', blob);

    const url = await getImageUrl('1', 'set1');
    expect(url).not.toBeNull();
    expect(typeof url).toBe('string');
    expect(url).toContain('blob:');
    expect(fetchCardImage).not.toHaveBeenCalled();
  });

  it('calls the fetch wrapper on a cache miss and caches the result', async () => {
    const blob = makeBlob('fetched-image');
    vi.mocked(fetchCardImage).mockResolvedValueOnce(blob);

    const url = await getImageUrl('42', 'set2');
    expect(url).not.toBeNull();
    expect(typeof url).toBe('string');
    expect(url).toContain('blob:');
    expect(fetchCardImage).toHaveBeenCalledTimes(1);

    // Verify the image was cached
    const cached = await getCachedImage('42', 'set2');
    expect(cached).not.toBeNull();
    expect(cached!.size).toBe(blob.size);
  });

  it('returns null when fetch wrapper returns null (card not found)', async () => {
    vi.mocked(fetchCardImage).mockResolvedValueOnce(null);

    const url = await getImageUrl('999', 'set3');
    expect(url).toBeNull();
    expect(fetchCardImage).toHaveBeenCalledTimes(1);
  });
});

describe('graceful degradation', () => {
  it('falls back to no caching when IndexedDB throws', async () => {
    // Sabotage indexedDB.open to simulate unavailability
    const originalOpen = globalThis.indexedDB.open.bind(globalThis.indexedDB);
    vi.spyOn(globalThis.indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB unavailable');
    });

    // getCachedImage returns null (miss)
    const result = await getCachedImage('1', 'any');
    expect(result).toBeNull();

    // cacheImage does not throw
    await expect(
      cacheImage('1', 'any', makeBlob()),
    ).resolves.toBeUndefined();

    // getCacheSize returns 0
    expect(await getCacheSize()).toBe(0);

    // clearCache does not throw
    await expect(clearCache()).resolves.toBeUndefined();

    // Restore so other tests aren't affected
    vi.mocked(globalThis.indexedDB.open).mockImplementation(originalOpen);
  });
});
