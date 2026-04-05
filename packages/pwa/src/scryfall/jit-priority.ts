/** JIT priority fetching for card images per ADR-003. */

import { getCachedImage, cacheImage } from './image-cache';
import { fetchCardImage } from './fetch-wrapper';
import { pausePrefetch, resumePrefetch } from './prefetch-coordinator';

export type { PriorityLevel } from './fetch-wrapper';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PriorityFetchRequest {
  cardName: string;
  setCode: string;
  priority: 'jit' | 'background';
}

export interface CardImageState {
  status: 'loading' | 'loaded' | 'error';
  imageUrl: string | null;
  cardName: string;
}

/* ------------------------------------------------------------------ */
/*  JIT active counter                                                */
/* ------------------------------------------------------------------ */

let activeJitCount = 0;

/* ------------------------------------------------------------------ */
/*  Priority fetch                                                    */
/* ------------------------------------------------------------------ */

/**
 * Fetch a card image with JIT priority. Checks the IndexedDB cache
 * first; on a miss, creates a JIT priority request that jumps ahead
 * of background requests in the fetch wrapper's queue.
 *
 * Returns an object URL string on success, or `null` on failure.
 */
export async function priorityFetch(
  cardName: string,
  setCode: string,
): Promise<string | null> {
  // Check cache first
  const cached = await getCachedImage(cardName, setCode);
  if (cached) {
    return URL.createObjectURL(cached);
  }

  // Pause background prefetch while JIT fetch is in progress
  activeJitCount++;
  if (activeJitCount === 1) {
    pausePrefetch();
  }

  try {
    // NOTE: fetchCardImage expects a collector number, not a card name.
    // A future integration layer will resolve card names to collector
    // numbers before reaching this point — see the same note in
    // image-cache.ts getImageUrl().
    const blob = await fetchCardImage(
      { setCode, collectorNumber: cardName },
      'jit',
    );

    if (!blob) {
      return null;
    }

    await cacheImage(cardName, setCode, blob);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  } finally {
    activeJitCount--;
    if (activeJitCount === 0) {
      resumePrefetch();
    }
  }
}

/** Reset internal state — only for use in tests. */
export function _resetForTesting(): void {
  activeJitCount = 0;
}
