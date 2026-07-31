---
title: "ADR-014: WebRTC Data Channels & Stateless Signaling"
status: "Accepted"
date: "2026-07-31"
tags:
  - "networking"
  - "p2p"
  - "webrtc"
  - "cryptography"
---

## Context

* **Problem:** Scrymat needs remote shared-state play without introducing a centralized authoritative game server. Peers must exchange actions, hidden-state commitments, reveal payloads, and recovery snapshots with low enough latency to feel like a shared table. They also need a practical way to find each other through NATs and browsers.
* **Constraints:**
  * The core reducer from `@scryglass/core` must remain network-agnostic and pure. Transport logic belongs in `@scryglass/pwa` or a future dedicated networking package.
  * The system should store no persistent match state on a backend. A small helper service is acceptable only for connection bootstrapping.
  * Local matches must continue to work with zero network dependency.
  * Hidden cards cannot be sent as plaintext to the remote peer until the owning player intentionally reveals them.

## Decision

We will synchronize remote matches over **WebRTC data channels** and use a **stateless signaling service** only to exchange the connection handshake.

1. **Connection model**
   * A match has a Host and a Guest for connection setup.
   * The Host creates a short-lived room code or match URL and publishes a WebRTC offer through the signaling service.
   * The Guest retrieves that offer, posts an answer, and both peers complete ICE candidate exchange through the same ephemeral signaling channel.

2. **Transport responsibilities**
   * Match traffic flows over a reliable, ordered WebRTC data channel using JSON envelopes.
   * Envelope types include reducer actions, hidden-state commitment payloads, reveal payloads, presence/heartbeat messages, and full-state snapshots for recovery.
   * Local actions are applied optimistically and then broadcast. The reducer itself is unchanged; networking is middleware around `dispatch(state, action)`.

3. **Conflict and recovery policy**
   * Concurrent manipulations of the same object are resolved with Last-Write-Wins metadata attached in the networking layer.
   * On reconnect or suspected divergence, the Host sends the Guest a full serialized game-state snapshot plus the current commitment set for hidden information. The Guest replaces its mirrored remote state instead of replaying an unbounded action log.

4. **Signaling service scope**
   * The signaling worker stores SDP and ICE handshake material only long enough to establish a peer connection.
   * It does not persist game state, card identities, or match history.
   * Once the data channel is established, gameplay proceeds peer-to-peer.

## Considered Options

1. **Option 1: WebRTC data channels with stateless signaling (Chosen)**

    Use a short-lived worker only for WebRTC offer/answer exchange, then move all match traffic onto direct peer connections.

    * *Pros:*
      * Preserves the project's offline-first and server-light philosophy.
      * Low-latency direct transport fits drag-and-drop shared-state interactions well.
      * Keeps hidden card data between peers rather than a central backend.
      * Lets the reducer stay pure and reusable because transport is isolated in middleware.
    * *Cons:*
      * WebRTC setup, ICE handling, and browser support are more complex than a simple socket client.
      * Some networks may still require TURN infrastructure later if direct connections fail.

2. **Option 2: Central authoritative WebSocket server**

    Route every action through a backend that stores the canonical match state and broadcasts updates to clients.

    * *Pros:*
      * Simpler client networking model once connected.
      * Easier to debug central logs and implement server-driven recovery.
    * *Cons:*
      * Violates the desired stateless, peer-first architecture.
      * Increases hosting cost and operational complexity.
      * Makes the backend a custodian of hidden information and match history.

3. **Option 3: Polling or shared URL/storage synchronization**

    Synchronize matches indirectly through periodic HTTP polling, browser storage, or shareable serialized URLs.

    * *Pros:*
      * Potentially simpler than WebRTC to bootstrap.
      * Could reuse very simple infrastructure primitives.
    * *Cons:*
      * Too high-latency and too awkward for an interactive playmat.
      * Poor fit for continuous drag/drop actions and reveal events.
      * Makes recovery and conflict handling harder, not easier.

## Consequences

* **Positive:** Scrymat gains true peer-to-peer remote play while keeping the core reducer local, deterministic, and offline-capable. The transport naturally supports action sync, commit-reveal message types, and snapshot recovery without inventing a heavy backend.
* **Negative:** Networking code becomes one of the most operationally complex parts of the app. Browser compatibility, ICE failures, and reconnect handling need focused testing.
* **Future Implications:** If two-player matches later expand to larger pods, this ADR may need a follow-up decision for mesh limits, TURN usage, or a relay topology. The signaling layer can evolve independently so long as it stays stateless with respect to gameplay.
