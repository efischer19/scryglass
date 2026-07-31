---
title: "ADR-013: Deterministic Seeded PRNG for Shared Shuffling"
status: "Accepted"
date: "2026-07-31"
supersedes: "ADR-004"
tags:
  - "randomness"
  - "cryptography"
  - "gameplay"
  - "p2p"
---

## Context

* **Problem:** ADR-004 chose Fisher-Yates plus `crypto.getRandomValues()` for fair local shuffling. That works when one client owns the only game state, but Scrymat remote matches require two peers to independently derive the exact same deck order without shipping the full hidden library over the network. We need shuffling that is both deterministic from a shared seed and still auditable for fairness.
* **Constraints:**
  * The shuffle logic still lives in `@scryglass/core`, so it must remain platform-agnostic and deterministic in both browser and Node.js test environments.
  * Repeated shuffles in the same match must produce fresh results, not reuse the same permutation forever.
  * Index generation must remain unbiased; modulo bias is still unacceptable.
  * Local-only matches should keep the same shuffle implementation path so behavior stays consistent between offline and remote modes.

## Decision

We will keep **Fisher-Yates** as the shuffle algorithm, but replace per-call `crypto.getRandomValues()` entropy with a **deterministic seeded random stream** derived from shared match data.

1. **All shuffles consume a seed context.**
   * Remote matches use a shared 256-bit match seed established during session setup.
   * Local matches generate an ephemeral seed locally and never share it, but still call the same seeded shuffle code path.

2. **Random values come from a counter-based cryptographic derivation.**
   * The shuffle stream is derived from `SHA-256` blocks over `{matchSeed, zoneId, shuffleSequence, counter}` (or an equivalent counter-based cryptographic derivation with the same determinism guarantees).
   * `zoneId` and `shuffleSequence` ensure the first shuffle of a library and the fifth shuffle of that same library do not replay the same swap stream.
   * The reducer consumes 32-bit values from that derived stream and continues to use rejection sampling when mapping them into swap indices.

3. **The result is deterministic and reproducible.**
   * Given the same seed context and same ordered input zone, every peer computes the same permutation locally.
   * Given a different shuffle sequence or different seed, the resulting order changes predictably and testably.

## Considered Options

1. **Option 1: Seeded Fisher-Yates with counter-based cryptographic derivation (Chosen)**

    Continue using Fisher-Yates, but feed it deterministic 32-bit values derived from a shared seed and shuffle metadata.

    * *Pros:*
      * Preserves the mathematically correct shuffle algorithm from ADR-004.
      * Lets both peers derive the same order without transmitting hidden card identities.
      * Easy to unit-test because the same inputs always produce the same permutation.
      * Keeps rejection sampling, so the range-mapping remains unbiased.
    * *Cons:*
      * Introduces seed lifecycle metadata (`zoneId`, `shuffleSequence`) that must be maintained correctly.
      * Slightly more complex than sampling directly from `crypto.getRandomValues()`.

2. **Option 2: Keep nondeterministic crypto randomness and broadcast final deck order**

    One peer performs the shuffle and sends the resulting library order to the other peer.

    * *Pros:*
      * Minimal change to the existing shuffle implementation.
      * Straightforward mental model for the peer performing the shuffle.
    * *Cons:*
      * Reveals hidden deck order to the transport layer unless extra obfuscation is layered on immediately.
      * Makes the remote peer trust networked results instead of independently verifying them.
      * Couples shuffling to networking instead of keeping it a core-domain primitive.

3. **Option 3: Use a small non-cryptographic seeded PRNG (e.g. xorshift, mulberry32)**

    Replace the entropy source with a tiny deterministic algorithm and keep Fisher-Yates unchanged.

    * *Pros:*
      * Very small implementation footprint.
      * Fast and trivially seedable.
    * *Cons:*
      * Weaker statistical and audit properties than a cryptographic derivation.
      * Harder to justify for a product already centered on trust and hidden information.
      * Creates avoidable "is this random enough?" ambiguity for contributors and players.

## Consequences

* **Positive:** Remote peers can independently compute identical shuffles without a server, while local matches continue to use the same reducer-facing API. Deterministic seeds make shuffle behavior reproducible in tests and easier to debug when matches desynchronize.
* **Negative:** Match setup now owns seed management and shuffle sequence bookkeeping. Bugs in seed lifecycle code can cause peer divergence even when the shuffle algorithm itself is correct.
* **Future Implications:** Commit-reveal state syncing can assume the hidden library order is already synchronized locally on each peer. If future requirements need stronger multi-party fairness guarantees around seed generation, that can evolve in the session setup layer without changing the Fisher-Yates core.
