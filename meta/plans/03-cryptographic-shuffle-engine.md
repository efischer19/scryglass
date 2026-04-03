# Ticket 03: Cryptographic Shuffle Engine

## What do you want to build?

Implement a TypeScript module in `@scryglass/core` (`packages/core/src/shuffle.ts`) that performs an unbiased Fisher-Yates shuffle using `globalThis.crypto.getRandomValues()` as the entropy source. This is the core randomization engine used every time a deck needs to be shuffled.

## Acceptance Criteria

- [ ] A `shuffle<T>(array: readonly T[]): T[]` function is exported from `packages/core/src/shuffle.ts`
- [ ] The function returns a **new** shuffled array (immutable — does not mutate the input, consistent with the action/reducer pattern in ADR-005)
- [ ] The algorithm is Fisher-Yates (iterating from the last element to the first, swapping with a random index at or before the current position)
- [ ] Random indices are generated using `globalThis.crypto.getRandomValues()` with a `Uint32Array`
- [ ] Modulo bias is avoided (use rejection sampling or an unbiased mapping technique)
- [ ] A helper function `cryptoRandomInt(max: number): number` is exported for generating a random integer in `[0, max)` using crypto
- [ ] The function works correctly for arrays of length 0 and 1 (returns a copy)
- [ ] The module uses `globalThis.crypto` (not `window.crypto`) for Node.js compatibility
- [ ] The module has zero browser dependencies (no DOM, no `window`)
- [ ] Unit tests (Vitest) validate: shuffled array has same elements, shuffled array length matches original, empty/single-element arrays are handled, input array is not mutated, distribution test (run 10,000 shuffles of a small array and verify each permutation appears roughly equally)

## Implementation Notes (Optional)

The rejection sampling technique: generate a random `Uint32` value. If the value falls in the range `[0, Math.floor(2^32 / max) * max)`, use `value % max`. Otherwise, discard and regenerate. This eliminates modulo bias.

Using `globalThis.crypto` ensures this works in both browser (`window.crypto`) and Node.js 19+ (`globalThis.crypto`). For older Node.js, the `crypto` module's `webcrypto` export provides the same API.

**References:** [ADR-004: Fisher-Yates Shuffle with Crypto API](../../meta/adr/ADR-004-cryptographic_shuffle.md)
