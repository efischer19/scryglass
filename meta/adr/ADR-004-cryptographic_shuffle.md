---
title: "ADR-004: Fisher-Yates Shuffle with Web Crypto API"
status: "Proposed"
date: "2026-04-03"
tags:
  - "algorithm"
  - "randomness"
  - "gameplay"
---

## Context

* **Problem:** Scryglass replaces the physical act of shuffling a Magic: The Gathering deck. Players must trust that the digital shuffle is truly random and unbiased. Using `Math.random()` is insufficient because it is a PRNG (pseudorandom number generator) with predictable seeding in some browser implementations, and it does not provide uniform distribution guarantees when used naively for shuffling.
* **Constraints:** The solution must run entirely in the browser with no server-side component. It must be fast enough to shuffle a 100-card deck without perceptible delay.

## Decision

We will implement the **Fisher-Yates (Knuth) shuffle algorithm** using `window.crypto.getRandomValues()` as the entropy source.

* The Fisher-Yates algorithm iterates through the array from the last element to the first, swapping each element with a randomly chosen element at or before its current index. This produces a uniformly random permutation in O(n) time.
* `crypto.getRandomValues()` provides cryptographically strong random numbers, eliminating concerns about PRNG bias or predictability.
* The random index for each swap will be derived from a `Uint32Array` value, mapped to the valid range using rejection sampling (not modulo) to avoid modulo bias.

## Considered Options

1. **Option 1: Fisher-Yates with `crypto.getRandomValues()` (Chosen)**
    * *Pros:* Mathematically proven to produce uniform permutations. Cryptographic randomness eliminates bias concerns. O(n) time complexity. `crypto.getRandomValues()` is supported in all modern browsers. Rejection sampling avoids modulo bias.
    * *Cons:* Slightly more complex than a naive `Math.random()` sort. Rejection sampling wastes a tiny number of random values (negligible for a 100-card deck).

2. **Option 2: `Array.sort(() => Math.random() - 0.5)`**
    * *Pros:* One line of code. Simple.
    * *Cons:* Provably biased — `sort()` comparators must be consistent, but `Math.random()` is not. Some permutations are more likely than others. Not suitable for any application where fairness matters.

3. **Option 3: Fisher-Yates with `Math.random()`**
    * *Pros:* Correct algorithm, simpler random source.
    * *Cons:* `Math.random()` is a PRNG. While adequate for many purposes, players may (justifiably) question whether the shuffle is truly random. Using `crypto` is trivially more complex and eliminates this concern entirely.

## Consequences

* **Positive:** Players can trust the shuffle is fair. The implementation is well-understood and auditable. Performance is excellent (sub-millisecond for 100 cards).
* **Negative:** None significant. The added complexity over `Math.random()` is minimal (a few extra lines for the crypto-based random index function).
* **Future Implications:** The shuffle module will be a self-contained utility (`shuffle.js`) that can be unit-tested independently. If the app ever needs other randomness (e.g., coin flips), the same crypto-based utility can be reused.
