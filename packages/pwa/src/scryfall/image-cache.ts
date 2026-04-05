/** IndexedDB image cache for Scryfall card images per ADR-003. */

import { fetchCardImage } from './fetch-wrapper';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/** Cache key in the format `{setCode}:{cardName}`. */
export type CacheKey = `${string}:${string}`;

export interface CacheEntry {
  key: CacheKey;
  blob: Blob;
  cachedAt: number;
}

/** `null` indicates a cache miss. */
export type CacheLookupResult = Blob | null;

/* ------------------------------------------------------------------ */
/*  Internal storage type                                             */
/* ------------------------------------------------------------------ */

/**
 * Blobs do not survive IndexedDB structured-clone round-trips in every
 * environment (e.g. jsdom / fake-indexeddb). Store the raw ArrayBuffer
 * and MIME type instead, then reconstruct a Blob on retrieval.
 */
interface StoredEntry {
  key: CacheKey;
  data: ArrayBuffer;
  type: string;
  cachedAt: number;
}

/* ------------------------------------------------------------------ */
/*  IndexedDB helpers                                                 */
/* ------------------------------------------------------------------ */

const DB_NAME = 'scryglass-image-cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function buildKey(cardName: string, setCode: string): CacheKey {
  return `${setCode.toLowerCase().trim()}:${cardName.toLowerCase().trim()}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);
  });
}

/* ------------------------------------------------------------------ */
/*  Core functions                                                    */
/* ------------------------------------------------------------------ */

export async function getCachedImage(
  cardName: string,
  setCode: string,
): Promise<CacheLookupResult> {
  try {
    const db = await openDB();
    const key = buildKey(cardName, setCode);

    return new Promise<CacheLookupResult>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as StoredEntry | undefined;
        resolve(entry ? new Blob([entry.data], { type: entry.type }) : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    // IndexedDB unavailable — degrade to cache miss
    return null;
  }
}

export async function cacheImage(
  cardName: string,
  setCode: string,
  blob: Blob,
): Promise<void> {
  try {
    const db = await openDB();
    const key = buildKey(cardName, setCode);
    const data = await blob.arrayBuffer();
    const entry: StoredEntry = { key, data, type: blob.type, cachedAt: Date.now() };

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(entry, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // IndexedDB unavailable — silently skip caching
  }
}

export async function getImageUrl(
  cardName: string,
  setCode: string,
): Promise<string | null> {
  const cached = await getCachedImage(cardName, setCode);
  if (cached) {
    return URL.createObjectURL(cached);
  }

  try {
    // NOTE: fetchCardImage expects a collector number, not a card name.
    // A future integration layer will resolve card names to collector
    // numbers before reaching this point. For now, callers who need the
    // fetch fallback should ensure the cardName value is the collector
    // number or provide their own fetch-then-cache logic.
    const blob = await fetchCardImage({
      setCode,
      collectorNumber: cardName,
    });
    if (!blob) {
      return null;
    }

    await cacheImage(cardName, setCode, blob);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // IndexedDB unavailable — nothing to clear
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return 0;
  }
}
