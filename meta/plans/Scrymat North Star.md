# **Scrymat: Architectural North Star & Pivot Strategy**

## **1\. The Vision**

**Scrymat** (formerly Scryglass) is pivoting from a localized, single-player deck utility into a lightweight, synchronized virtual playmat designed for asynchronous and peer-to-peer (P2P) card play. Scrymat acts as a shared-state sandbox that provides the table, the cards, and the zones, while relying entirely on the players to provide the rules.

## **2\. Core Philosophy: The "Dumb Table"**

Scrymat fundamentally rejects the heavy technical debt of a rigid, encoded rules engine.

* **Player-Initiated State Tracking:** The engine does not enforce turn phases, stack resolution, or state-based actions. All state mutations are handled via generic, player-driven actions (e.g., MOVE\_CARD, CHANGE\_CARD\_STATE).  
* **Frictionless Edge Cases:** Because the platform acts purely as a synchronized tabletop, players can seamlessly unwind complex stacks, take back misclicks, or play custom house rules without fighting the software.  
* **The "Smart Dealer" Exception:** Automated shuffling and mulligan rules are retained purely as a setup macro. Once opening hands are kept, the engine hands off strictly to the sandbox phase.

## **3\. Cryptography & Trust: The Commit-Reveal Scheme**

Scrymat is explicitly engineered for casual, trust-based play between friends, but it mathematically solves the "DevTools snooping" vulnerability inherent to P2P card games.

* **Shared-Seed Deterministic Shuffling:** When a match initializes, players share a cryptographic key. Both clients use this seed to independently and deterministically calculate the exact same resulting deck order.  
* **Commit-Reveal Hashing:** To prevent memory snooping, hidden state is obfuscated. Upon loading a deck for a remote match, a client generates a unique cryptographic salt for each card, hashes the data, and broadcasts *only the hashes* to the opponent.  
* **The Reveal:** The opponent's client holds an array of hashes. When a player moves a card to a public zone (e.g., Battlefield, Graveyard), their client broadcasts the plaintext card data and the original salt. The opponent's client hashes these together to verify they match the committed hash before rendering the card face.

## **4\. P2P Networking & State Synchronization**

Scrymat operates without a centralized, authoritative game server to dictate the outcome.

* **WebRTC Data Channels:** The "virtual playmat" is synchronized via direct P2P data channels.  
* **Stateless Signaling:** A tiny, stateless serverless worker (e.g., Cloudflare Worker) acts purely as a digital handshake, temporarily holding WebRTC SDP Offer/Answer tokens via short-lived room codes before immediately discarding them.  
* **Action Broadcasting & Collision Resolution:** The core state reducer is wrapped in a networking middleware. Local actions update the UI optimistically and broadcast JSON payloads over WebRTC. Simultaneous drag-and-drop collisions are resolved via a simple Last-Write-Wins (LWW) timestamp.  
* **Instant Recovery:** If a connection drops, complex action-replay queues are ignored. The Host simply blasts the entire lightweight GameState JSON tree to the Guest upon reconnection to instantly overwrite and resynchronize the board.

## **5\. The Offline-First Guarantee**

The pivot to remote play must not degrade Scrymat's utility as a local tool for goldfishing or "pass-and-play" couch gaming.

* **Networking as Middleware:** The @scryglass/core reducer remains completely ignorant of the network. Local matches bypass WebRTC and Commit-Reveal hashing entirely.  
* **UI Obfuscation:** The Playmat UI strictly renders opponent's hidden state as generic \<CardBack/\> components. For local same-screen play, the UI provides manual "Peek / Hide" toggles so a device can be handed back and forth safely.

## **6\. AI Agent Extensibility**

The sandbox approach allows for trivial integration of AI opponents. An LLM does not need to navigate a complex rules API; it simply outputs standard JSON state mutations representing its physical "moves" across the board. Future integrations (such as OpenClaw local agents) will connect via local WebSockets, reading the GameState JSON and emitting valid MOVE\_CARD commands.

### **7\. Security Philosophy & Deployment Scope**

Scrymat is explicitly engineered for **casual, trust-based play** between friends.

* **Social Trust Architecture:** The platform intentionally avoids the cryptographic overhead required for sanctioned, high-stakes tournament environments. While it mitigates common vulnerabilities, a determined adversary leveraging browser-level inspection tools could technically influence the local client state.  
* **The Asynchronous Sandbox:** The primary objective is facilitating matches between remote acquaintances who value social cohesion over rigid enforcement. By eliminating the hardware friction of physical camera setups, Scrymat allows for seamless testing of paper-based lists or AI-driven goldfishing within a modern, P2P-synchronized web interface.

