import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadAllDecks,
  saveDeck,
  getDeckByName,
  overwriteDeck,
  renameDeck,
  deleteDeck,
  saveAutosave,
  loadAutosave,
  clearAutosave,
  seedExampleDecks,
  StorageQuotaError,
} from '../deck-storage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('loadAllDecks', () => {
  it('returns empty array when no data stored', () => {
    expect(loadAllDecks()).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    localStorage.setItem('scryglass:decklists', 'not json');
    expect(loadAllDecks()).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    localStorage.setItem('scryglass:decklists', '{"foo": 1}');
    expect(loadAllDecks()).toEqual([]);
  });

  it('salvages valid entries from partially invalid data', () => {
    const valid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'My Deck',
      rawText: 'Island;ltr;715;land',
      cardCount: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    localStorage.setItem(
      'scryglass:decklists',
      JSON.stringify([valid, { invalid: true }]),
    );
    const result = loadAllDecks();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Deck');
  });
});

describe('saveDeck', () => {
  it('saves a deck and returns it with generated id and timestamps', () => {
    const deck = saveDeck('Test Deck', 'Island;ltr;715;land', 1);
    expect(deck.name).toBe('Test Deck');
    expect(deck.rawText).toBe('Island;ltr;715;land');
    expect(deck.cardCount).toBe(1);
    expect(deck.id).toBeTruthy();
    expect(deck.createdAt).toBeTruthy();
    expect(deck.updatedAt).toBe(deck.createdAt);
  });

  it('persists deck to localStorage', () => {
    saveDeck('Test Deck', 'Island;ltr;715;land', 1);
    const decks = loadAllDecks();
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toBe('Test Deck');
  });

  it('can save multiple decks', () => {
    saveDeck('Deck 1', 'text1', 1);
    saveDeck('Deck 2', 'text2', 2);
    expect(loadAllDecks()).toHaveLength(2);
  });

  it('throws StorageQuotaError when quota exceeded', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    try {
      expect(() => saveDeck('Big Deck', 'data', 1)).toThrow(
        StorageQuotaError,
      );
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('getDeckByName', () => {
  it('returns undefined when no deck matches', () => {
    expect(getDeckByName('nonexistent')).toBeUndefined();
  });

  it('returns the deck with matching name', () => {
    saveDeck('My Deck', 'text', 5);
    const found = getDeckByName('My Deck');
    expect(found).toBeDefined();
    expect(found!.name).toBe('My Deck');
  });
});

describe('overwriteDeck', () => {
  it('returns null for non-existent id', () => {
    expect(
      overwriteDeck('550e8400-e29b-41d4-a716-446655440000', 'new', 2),
    ).toBeNull();
  });

  it('updates rawText, cardCount and updatedAt', () => {
    const deck = saveDeck('Deck', 'old text', 1);
    const updated = overwriteDeck(deck.id, 'new text', 10);
    expect(updated).not.toBeNull();
    expect(updated!.rawText).toBe('new text');
    expect(updated!.cardCount).toBe(10);
    expect(updated!.name).toBe('Deck');
    expect(updated!.updatedAt >= deck.updatedAt).toBe(true);
  });
});

describe('renameDeck', () => {
  it('returns null for non-existent id', () => {
    expect(
      renameDeck('550e8400-e29b-41d4-a716-446655440000', 'new name'),
    ).toBeNull();
  });

  it('updates the name and updatedAt', () => {
    const deck = saveDeck('Old Name', 'text', 1);
    const renamed = renameDeck(deck.id, 'New Name');
    expect(renamed).not.toBeNull();
    expect(renamed!.name).toBe('New Name');
    expect(renamed!.rawText).toBe('text');
  });

  it('persists the rename', () => {
    const deck = saveDeck('Old Name', 'text', 1);
    renameDeck(deck.id, 'New Name');
    const all = loadAllDecks();
    expect(all[0].name).toBe('New Name');
  });
});

describe('deleteDeck', () => {
  it('returns false for non-existent id', () => {
    expect(deleteDeck('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('removes the deck and returns true', () => {
    const deck = saveDeck('To Delete', 'text', 1);
    expect(deleteDeck(deck.id)).toBe(true);
    expect(loadAllDecks()).toHaveLength(0);
  });

  it('only removes the targeted deck', () => {
    const d1 = saveDeck('Keep', 'text1', 1);
    const d2 = saveDeck('Delete', 'text2', 1);
    deleteDeck(d2.id);
    const remaining = loadAllDecks();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(d1.id);
  });
});

describe('autosave', () => {
  it('returns null when no autosave exists', () => {
    expect(loadAutosave()).toBeNull();
  });

  it('saves and loads autosave content', () => {
    saveAutosave('some deck text');
    const result = loadAutosave();
    expect(result).not.toBeNull();
    expect(result!.rawText).toBe('some deck text');
    expect(result!.updatedAt).toBeTruthy();
  });

  it('clears autosave', () => {
    saveAutosave('some deck text');
    clearAutosave();
    expect(loadAutosave()).toBeNull();
  });

  it('silently ignores quota errors', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    try {
      expect(() => saveAutosave('text')).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('returns null for invalid autosave data', () => {
    localStorage.setItem(
      'scryglass:decklists:__autosave__',
      'not json',
    );
    expect(loadAutosave()).toBeNull();
  });
});

describe('seedExampleDecks', () => {
  const EXAMPLES = [
    { name: 'Good', rawText: 'Island;ltr;715;land', cardCount: 1 },
    { name: 'Evil', rawText: 'Swamp;ltr;717;land', cardCount: 1 },
  ];

  it('seeds example decks when no seed flag exists', () => {
    seedExampleDecks(EXAMPLES);
    const decks = loadAllDecks();
    expect(decks).toHaveLength(2);
    expect(decks[0].name).toBe('Good');
    expect(decks[1].name).toBe('Evil');
  });

  it('does not seed when seed flag is already set', () => {
    localStorage.setItem('scryglass:seeded', '1');
    seedExampleDecks(EXAMPLES);
    expect(loadAllDecks()).toHaveLength(0);
  });

  it('does not duplicate seeds on repeated calls', () => {
    seedExampleDecks(EXAMPLES);
    seedExampleDecks(EXAMPLES);
    expect(loadAllDecks()).toHaveLength(2);
  });

  it('prepends example decks before any existing decks', () => {
    saveDeck('Existing', 'Forest;m21;313;land', 1);
    seedExampleDecks(EXAMPLES);
    const decks = loadAllDecks();
    expect(decks).toHaveLength(3);
    expect(decks[0].name).toBe('Good');
    expect(decks[1].name).toBe('Evil');
    expect(decks[2].name).toBe('Existing');
  });

  it('sets the seed flag so later calls are no-ops', () => {
    seedExampleDecks(EXAMPLES);
    expect(localStorage.getItem('scryglass:seeded')).toBe('1');
  });
});
