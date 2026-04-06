import { SavedDeckListSchema } from '@scryglass/core';
import type { SavedDeck } from '@scryglass/core';

const STORAGE_KEY = 'scryglass:decklists';
const AUTOSAVE_KEY = '__autosave__';
const SEED_KEY = 'scryglass:seeded';

/** Error thrown when localStorage quota is exceeded. */
export class StorageQuotaError extends Error {
  constructor() {
    super(
      'Storage quota exceeded. Delete some saved decks to free up space.',
    );
    this.name = 'StorageQuotaError';
  }
}

/** Read all saved decks from localStorage, discarding invalid entries. */
export function loadAllDecks(): SavedDeck[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = SavedDeckListSchema.safeParse(parsed);
    if (result.success) return result.data;

    // If the array as a whole fails, try to salvage individual items
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => {
        const single = SavedDeckListSchema.element.safeParse(item);
        return single.success ? [single.data] : [];
      });
    }
    return [];
  } catch {
    return [];
  }
}

function writeDecks(decks: SavedDeck[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    throw new StorageQuotaError();
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Save a new deck. Throws StorageQuotaError on quota exceeded. */
export function saveDeck(
  name: string,
  rawText: string,
  cardCount: number,
): SavedDeck {
  const decks = loadAllDecks();
  const now = nowISO();
  const deck: SavedDeck = {
    id: generateId(),
    name,
    rawText,
    cardCount,
    createdAt: now,
    updatedAt: now,
  };
  decks.push(deck);
  writeDecks(decks);
  return deck;
}

/** Find a saved deck by name (case-sensitive). */
export function getDeckByName(name: string): SavedDeck | undefined {
  return loadAllDecks().find((d) => d.name === name);
}

/** Overwrite an existing deck's content. Returns the updated deck or null. */
export function overwriteDeck(
  id: string,
  rawText: string,
  cardCount: number,
): SavedDeck | null {
  const decks = loadAllDecks();
  const idx = decks.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  decks[idx] = { ...decks[idx], rawText, cardCount, updatedAt: nowISO() };
  writeDecks(decks);
  return decks[idx];
}

/** Rename a saved deck. Returns the updated deck or null. */
export function renameDeck(
  id: string,
  newName: string,
): SavedDeck | null {
  const decks = loadAllDecks();
  const idx = decks.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  decks[idx] = { ...decks[idx], name: newName, updatedAt: nowISO() };
  writeDecks(decks);
  return decks[idx];
}

/** Delete a saved deck by id. Returns true if found and deleted. */
export function deleteDeck(id: string): boolean {
  const decks = loadAllDecks();
  const filtered = decks.filter((d) => d.id !== id);
  if (filtered.length === decks.length) return false;
  writeDecks(filtered);
  return true;
}

/** Save current textarea content as autosave (debounce externally). */
export function saveAutosave(rawText: string): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY}:${AUTOSAVE_KEY}`,
      JSON.stringify({ rawText, updatedAt: nowISO() }),
    );
  } catch {
    // Silently ignore quota errors for autosave
  }
}

/** Load autosaved content, if any. */
export function loadAutosave(): { rawText: string; updatedAt: string } | null {
  const raw = localStorage.getItem(`${STORAGE_KEY}:${AUTOSAVE_KEY}`);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { rawText?: string; updatedAt?: string };
    if (typeof parsed.rawText === 'string' && typeof parsed.updatedAt === 'string') {
      return { rawText: parsed.rawText, updatedAt: parsed.updatedAt };
    }
    return null;
  } catch {
    return null;
  }
}

/** Clear the autosave entry. */
export function clearAutosave(): void {
  localStorage.removeItem(`${STORAGE_KEY}:${AUTOSAVE_KEY}`);
}

/**
 * Seed default decks into localStorage on first use.
 * A "seeded" flag prevents the decks from being re-added after the user
 * deletes them. Calling this function more than once is safe.
 */
export function seedExampleDecks(
  decks: { name: string; rawText: string; cardCount: number }[],
): void {
  if (localStorage.getItem(SEED_KEY) !== null) return;
  const existing = loadAllDecks();
  const now = new Date().toISOString();
  const seeded: SavedDeck[] = decks.map((d) => ({
    id: crypto.randomUUID(),
    name: d.name,
    rawText: d.rawText,
    cardCount: d.cardCount,
    createdAt: now,
    updatedAt: now,
  }));
  writeDecks([...seeded, ...existing]);
  localStorage.setItem(SEED_KEY, '1');
}
