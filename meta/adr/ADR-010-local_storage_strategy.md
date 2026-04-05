---
title: "ADR-010: Local Storage Strategy for Decklists"
status: "Accepted"
date: "2026-04-05"
tags:
  - "storage"
  - "deck-management"
  - "persistence"
  - "pwa"
---

## Context

* **Problem:** Scryglass needs to persist user decklists in the browser so that users can save, name, list, load, and delete decklists without a server. Currently, a user must re-paste their deck list every session. A persistence layer would let users build a personal library of saved decks that survives browser refreshes and returns.
* **Constraints:**
  * The application is entirely client-side — there is no backend to store data ([ADR-007](./ADR-007-monorepo_structure.md)).
  * Decklists are text-based semicolon-delimited strings ([ADR-006](./ADR-006-deck_import_format.md)). A typical 100-card deck is under 5 KB of raw text.
  * [ADR-003](./ADR-003-scryfall_api_integration.md) already commits to IndexedDB for Scryfall image blob caching. The decklist storage strategy must define its relationship to that existing database.
  * All domain schemas must be defined with Zod and validated at boundaries ([ADR-008](./ADR-008-typescript_and_zod.md)).
  * Per [ADR-007](./ADR-007-monorepo_structure.md), pure data schemas belong in `@scryglass/core`, while browser API access belongs in `@scryglass/pwa`.
  * The development philosophy mandates simplicity, YAGNI, and minimal dependencies ([DEVELOPMENT_PHILOSOPHY.md](../DEVELOPMENT_PHILOSOPHY.md)).

## Decision

We will use **`localStorage` with JSON serialization** (Option 1) to persist decklists.

### Storage key

All decklists are stored under a single `localStorage` key: `scryglass:decklists`. The value is a JSON-serialized array of deck objects.

### Data schema

Each saved deck is a JSON object conforming to the following Zod schema (defined in `@scryglass/core`):

```typescript
import { z } from 'zod';

const SavedDeckSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  rawText: z.string(),
  cardCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SavedDeckListSchema = z.array(SavedDeckSchema);
```

* `id` — A UUID v4 generated at save time. Used as a stable key for load/delete operations.
* `name` — A user-provided deck name (required, non-empty).
* `rawText` — The full semicolon-delimited deck text as originally pasted/uploaded by the user. This is the source of truth — the deck can be re-parsed from this field at any time.
* `cardCount` — The number of cards parsed from `rawText` (excluding commander rows). Stored for display purposes so the deck list view does not need to re-parse every deck to show a count.
* `createdAt` — ISO 8601 timestamp of when the deck was first saved.
* `updatedAt` — ISO 8601 timestamp of the most recent save/edit.

### Validation on read

When decklists are loaded from `localStorage`, the JSON is parsed and validated against `SavedDeckListSchema` using Zod's `.safeParse()`. If validation fails (e.g., data was written by an older app version with a different schema, or was manually tampered with), the invalid entries are discarded and a warning is logged to the console. Valid entries are returned normally. This ensures forward compatibility as the schema evolves.

### Storage implementation

The storage read/write functions live in `@scryglass/pwa` because they depend on the `localStorage` browser API. The Zod schema definitions live in `@scryglass/core` because they are pure data definitions with no browser dependency.

### Relationship to Scryfall IndexedDB cache (ADR-003)

Decklists and card image blobs are stored in **completely separate storage backends**:

* **Decklists → `localStorage`** (small text payloads, single key, synchronous access)
* **Card images → IndexedDB** (large binary blobs, per-ADR-003)

This separation is intentional:

1. **Different data profiles:** Decklists are small text (< 5 KB each); card images are large blobs (50–200 KB each). `localStorage` is well-suited for small structured text; IndexedDB is designed for large binary data.
2. **Independent lifecycles:** A user clearing their image cache should not lose their saved decklists, and vice versa.
3. **No coupling:** Keeping the storage backends separate avoids tying decklist persistence to the IndexedDB infrastructure, which is specific to the Scryfall caching layer. If the image cache strategy changes in a future ADR, decklists are unaffected.

### Quota handling

`localStorage` provides approximately 5 MB of storage per origin in most browsers. At ~5 KB per deck, this allows roughly 1,000 saved decklists — far more than any realistic use case.

If a `setItem()` call throws a `QuotaExceededError`:

1. The save operation fails gracefully — the UI displays a user-facing error message (e.g., "Storage is full. Please delete unused decklists to free space.").
2. The existing saved decklists are not corrupted (the failed write is atomic — `localStorage` does not partially write).
3. No data is silently lost.

The save function wraps `localStorage.setItem()` in a `try/catch` and returns a result type indicating success or a quota error.

## Considered Options

1. **Option 1: `localStorage` with JSON Serialization (Chosen)**

    Store all decklists as a single JSON string under one `localStorage` key. Read/write with `JSON.parse()` / `JSON.stringify()`, validated with Zod on read.

    * *Pros:*
      * **Zero dependencies** — uses only native browser APIs, fully aligned with the project's simplicity principle and YAGNI.
      * **Synchronous API** — reads and writes are immediate with no callback/promise complexity. Perfect for small text data.
      * **Trivial implementation** — the entire persistence layer is ~30 lines of TypeScript. Easy to understand, test, and maintain.
      * **Sufficient capacity** — ~5 MB limit accommodates hundreds of decklists. A user will never realistically hit this limit with text-only data.
      * **No coupling to IndexedDB** — decklists and the Scryfall image cache remain independent, with separate lifecycles and failure modes.
    * *Cons:*
      * **~5 MB limit** — smaller than IndexedDB quotas. Not suitable for large binary data, but more than sufficient for text decklists.
      * **Synchronous and blocking** — for very large payloads, serialization could block the main thread. Not a concern at our data sizes (< 100 KB even with hundreds of decks).
      * **No structured queries** — cannot query by individual fields (e.g., "find all decks modified today") without deserializing the entire array. Acceptable given the small data size and simple access patterns (list all, load one, delete one).

2. **Option 2: IndexedDB via a Thin Wrapper**

    Store decklists in the same IndexedDB database used by the Scryfall image cache (ADR-003), or in a separate IndexedDB database. Access via a thin custom wrapper around the raw IndexedDB API.

    * *Pros:*
      * Larger storage quota (typically 50%+ of disk space). Room to grow if decklists ever include binary attachments.
      * Structured storage with indexes — supports querying by individual fields.
      * Reuses the IndexedDB infrastructure already committed to for image caching.
    * *Cons:*
      * **Excessive complexity** — the raw IndexedDB API requires opening databases, managing versions, handling upgrade transactions, and working with request/event-based patterns. This is significant ceremony for storing a small JSON array.
      * **Async-only API** — all operations return via events or promises, adding complexity to the read/write layer for no benefit at our data sizes.
      * **Couples decklists to image cache** — sharing a database means schema versioning, upgrade events, and storage clearing affect both decklists and images. Different lifecycles argue for separation.
      * **Violates YAGNI** — the structured query and large-quota capabilities of IndexedDB are unnecessary for a list of ~100 small text records.

3. **Option 3: `idb-keyval` Library (~600 bytes)**

    Use the [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) library, which wraps IndexedDB in a simple `get(key)` / `set(key, value)` API, similar to `localStorage` but async and backed by IndexedDB.

    * *Pros:*
      * Tiny bundle size (~600 bytes gzipped). Minimal dependency footprint.
      * Simple key-value API hides IndexedDB complexity. Nearly as easy as `localStorage`.
      * Backed by IndexedDB, so benefits from larger storage quotas.
    * *Cons:*
      * **Adds an external dependency** — even a small one — where a native API suffices. The development philosophy says "Code is a Liability" and "every line of code adds to the project's maintenance burden." An npm dependency has upgrade, audit, and supply-chain considerations.
      * **Async API** — all operations return promises. While manageable, this adds unnecessary complexity when the synchronous `localStorage` API is perfectly adequate for our data sizes.
      * **Still uses IndexedDB under the hood** — introduces the same browser quota and storage management considerations as Option 2, just with a friendlier API.
      * **Marginal benefit over `localStorage`** — the larger quota of IndexedDB is unnecessary for text decklists. The simpler API of `idb-keyval` is still more complex than `localStorage` (promises vs. synchronous).

## Consequences

* **Positive:** The persistence layer is trivially simple — a single `localStorage` key, validated with Zod on read, with graceful quota error handling. Zero external dependencies. Decklists and the Scryfall image cache are fully independent, with no shared infrastructure or coupled failure modes. The schema is defined in `@scryglass/core` with Zod, making it available for validation by both the PWA and future consumers (agents, CLI tools).
* **Negative:** If a future requirement adds large binary attachments to decklists (e.g., thumbnail images), `localStorage`'s 5 MB limit could become a constraint. This would require migrating to IndexedDB, which is a manageable migration (read from `localStorage`, write to IndexedDB, delete from `localStorage`).
* **Future Implications:** The `SavedDeckSchema` is the contract for stored decklists. As the schema evolves (e.g., adding a `format` field for Commander vs. Standard), Zod's `.safeParse()` with schema versioning handles backward compatibility — old data that doesn't match the new schema is gracefully discarded or migrated. If storage needs outgrow `localStorage`, a future ADR can supersede this one and migrate to IndexedDB without changing the schema layer in `@scryglass/core`.
