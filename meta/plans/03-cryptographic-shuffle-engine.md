# Ticket 03: Cryptographic Shuffle Engine

## What do you want to build?

Implement a JavaScript module (`src/scripts/shuffle.js`) that performs an unbiased Fisher-Yates shuffle using `window.crypto.getRandomValues()` as the entropy source. This is the core randomization engine used every time a deck needs to be shuffled.

## Acceptance Criteria

- [ ] A `shuffle(array)` function is exported from `src/scripts/shuffle.js`
- [ ] The function shuffles the array **in place** and returns it
- [ ] The algorithm is Fisher-Yates (iterating from the last element to the first, swapping with a random index at or before the current position)
- [ ] Random indices are generated using `crypto.getRandomValues()` with a `Uint32Array`
- [ ] Modulo bias is avoided (use rejection sampling or an unbiased mapping technique)
- [ ] A helper function `cryptoRandomInt(max)` is exported for generating a random integer in `[0, max)` using crypto
- [ ] The function works correctly for arrays of length 0 and 1 (no-op)
- [ ] Unit tests validate: shuffled array has same elements, shuffled array length matches original, empty/single-element arrays are handled, distribution test (run 10,000 shuffles of a small array and verify each permutation appears roughly equally)

## Implementation Notes (Optional)

The rejection sampling technique: generate a random `Uint32` value. If the value falls in the range `[0, Math.floor(2^32 / max) * max)`, use `value % max`. Otherwise, discard and regenerate. This eliminates modulo bias.

Keep this module pure and stateless — it depends only on `window.crypto`.

**References:** [ADR-004: Fisher-Yates Shuffle with Web Crypto API](../../meta/adr/ADR-004-cryptographic_shuffle.md)
