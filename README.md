# 🔮 Scrymat

[![CI](https://github.com/efischer19/scrymat/actions/workflows/ci.yml/badge.svg)](https://github.com/efischer19/scrymat/actions/workflows/ci.yml)
[![License: GPL](https://img.shields.io/badge/License-GPL-blue.svg)](./LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./packages/core/tsconfig.json)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-brightgreen)](./packages/pwa/public/manifest.json)

**Scrymat turns your Magic: The Gathering decks into a shared virtual playmat — offline, at the table, or remotely with no account required.**

---

Scrymat (formerly Scryglass) is a **free, open-source Progressive Web App
(PWA)** for MTG goldfishing, couch play, and casual remote games. It runs
entirely in your browser, works offline after first load, and is designed for
use on a phone lying flat on a game store table.

> [!NOTE]
> The production TLD and some AWS infrastructure may still use the legacy
> `scryglass` identifier until the final DNS and deploy cutover is complete.

## 🚀 Quick Start (Play Tonight!)

**No installation. No account. Just open and play.**

### Local / pass-and-play

1. Open the deployed app (today that is still [`scryglass.cards`](https://scryglass.cards)).
2. Paste your deck list (Scrymat format, or import from Moxfield/Archidekt/MTGO).
3. Load each deck, deal opening hands, and start moving cards around the table.

### Remote Host / Join

1. One player clicks **Generate Room Code** to host a match.
2. Share the room code or `/match/:roomCode` invite URL with the guest.
3. The guest enters the code, Scrymat completes the WebRTC handshake, and both
   browsers connect peer-to-peer.
4. Once connected, the host can resync the guest with a full `GameState`
   snapshot after reconnects or divergence.

## ✨ Features

- **🃏 Shared virtual playmat** — The Scrymat pivot expands the state engine from
  library-only actions to generic card movement across public and private zones
  ([ADR-012](./meta/adr/ADR-012-expand_state_engine_to_full_playmat.md))
- **🪑 Dumb Table philosophy** — Scrymat gives you zones, cards, and movement,
  but it does **not** enforce turn structure or comprehensive Magic rules. You
  stay in control of takes-backs, shortcuts, and house rules.
- **🤝 Peer-to-peer remote play** — WebRTC data channels plus stateless signaling
  synchronize matches without a central game server
  ([ADR-014](./meta/adr/ADR-014-webrtc_data_channels_and_stateless_signaling.md))
- **🔐 Hidden-information protection** — Commit-reveal hashing keeps opponents from
  trivially peeking at concealed cards during remote games. Hidden cards stay
  committed until you intentionally reveal them.
- **🎲 Deterministic shared shuffling** — Seeded PRNG support lets every client
  derive the same deck order for a match
  ([ADR-013](./meta/adr/ADR-013-deterministic_seeded_prng_for_shared_shuffling.md))
- **📱 Offline-first local play** — Install to your home screen and keep using it
  for goldfishing or pass-and-play even without WiFi
- **🖼️ Card images via Scryfall** — Background prefetch with IndexedDB caching and
  JIT priority loading
- **📥 Multi-format import** — Supports Moxfield, Archidekt, and MTGO/Arena deck
  formats
- **📤 Multi-format export** — Export your deck to any supported format

## 💭 Why Scrymat?

Scrymat started life as Scryglass, a simple answer to the frustration that
shuffling takes too long. I originally built it so I could play Magic with my
kids. Previously, I was spending half of our "playtime" physically manipulating
our cards. I wanted a way to let the computer handle the mechanics of the
library so we could focus on actually playing the game together.

The pivot to Scrymat keeps that original goal, then pushes further into shared
remote play:

- **Protecting High-Value Collectibles**: Play with your physical dual lands, foils, and reserved list cards without subjecting them to the wear and tear of constant mash-shuffling.
- **Accessibility**: 100-card Commander decks are physically difficult to manipulate. Scrymat removes the physical barrier of dexterity required to shuffle, fetch, and handle a massive deck.
- **Frictionless Goldfishing**: Test your latest brews instantly. Just paste your Moxfield link and start drawing hands without needing to sleeve up a single card.
- **Remote Table Presence**: Share a synchronized tabletop over the web without a
  full rules engine or webcam rig.

## 🤝 Trust Model

Scrymat is designed for **trusted casual play**, not for adversarial tournament
enforcement:

- **The table is dumb by design.** Scrymat tracks where cards are, not whether a
  play was legal.
- **Private information uses commit-reveal.** Remote peers receive commitments
  for hidden cards first, then the real card only when it becomes public.
- **Reconnects prefer snapshots over logs.** When peers reconnect, the host can
  send the guest the current serialized `GameState` so both sides converge
  quickly.

---

# 🛠️ For Builders

## Architecture Decisions

All significant decisions are documented as [Architecture Decision Records](./meta/adr/):

| ADR | Title |
| :-- | :---- |
| [ADR-001](./meta/adr/ADR-001-use_adrs.md) | Use Architecture Decision Records (ADRs) to Document Decisions |
| [ADR-002](./meta/adr/ADR-002-ui_framework_choice.md) | Preact + Vite for the PWA |
| [ADR-003](./meta/adr/ADR-003-scryfall_api_integration.md) | Scryfall API integration & compliance |
| [ADR-004](./meta/adr/ADR-004-cryptographic_shuffle.md) | Fisher-Yates shuffle with Web Crypto API |
| [ADR-005](./meta/adr/ADR-005-client_state_management.md) | Action/Reducer state management — agent-ready game engine |
| [ADR-006](./meta/adr/ADR-006-deck_import_format.md) | Semicolon-delimited deck import format |
| [ADR-007](./meta/adr/ADR-007-monorepo_structure.md) | Monorepo structure (core/PWA separation) |
| [ADR-008](./meta/adr/ADR-008-typescript_and_zod.md) | TypeScript & Zod for strict typing |
| [ADR-009](./meta/adr/ADR-009-client_side_routing.md) | Client-side routing strategy |
| [ADR-010](./meta/adr/ADR-010-local_storage_strategy.md) | Local storage strategy for decklists |
| [ADR-011](./meta/adr/ADR-011-e2e_testing_strategy.md) | End-to-end testing strategy |
| [ADR-012](./meta/adr/ADR-012-expand_state_engine_to_full_playmat.md) | Expand state engine to full playmat |
| [ADR-013](./meta/adr/ADR-013-deterministic_seeded_prng_for_shared_shuffling.md) | Deterministic seeded PRNG for shared shuffling |
| [ADR-014](./meta/adr/ADR-014-webrtc_data_channels_and_stateless_signaling.md) | WebRTC data channels & stateless signaling |
| [ADR-015](./meta/adr/ADR-015-url_based_match_routing.md) | URL-based match routing |

## Architecture

Scrymat is built as a monorepo with strict separation of concerns:

| Package | Purpose | Browser Dependencies |
| :------ | :------ | :------------------- |
| **`@scrymat/core`** | Pure game logic: deck parsing, shared shuffling, zone-based state management, mulligan/setup flows, and card movement | ❌ None — runs in Node.js and browsers |
| **`@scrymat/pwa`** | Preact + Vite frontend: UI rendering, Scryfall API integration, IndexedDB caching, Service Worker, and WebRTC match sync | ✅ Browser APIs required |

The `@scrymat/core` module uses a strict **JSON-in/JSON-out action-reducer pattern** with Zod schema validation, making it suitable for consumption by AI agents, CLI tools, or any TypeScript/JavaScript consumer.

## Monorepo Structure

```text
repository-root/
├── packages/
│   ├── core/             # @scrymat/core — game logic library
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── pwa/              # @scrymat/pwa — Preact + Vite frontend
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── meta/                 # Development philosophy, ADRs, and plans
│   ├── adr/              # Architecture Decision Records
│   └── plans/            # Implementation plans and roadmaps
├── docs-src/             # Documentation source files (MkDocs)
├── scripts/              # Utility and automation scripts
├── .github/              # GitHub-specific configuration
└── package.json          # Root workspace configuration
```

## Deployment (AWS S3 + CloudFront)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy-aws.yml`) that builds the PWA and deploys it to AWS S3, fronted by CloudFront.

**Required AWS resources:**

- S3 bucket (static site hosting)
- CloudFront distribution (CDN, HTTPS, custom error pages for SPA routing)
- GitHub OIDC identity provider in IAM
- IAM role with S3 put/delete and CloudFront invalidation permissions

**Required GitHub repository variables** (Settings → Secrets and variables → Actions → Variables):

| Variable                     | Description                                    |
| :--------------------------- | :--------------------------------------------- |
| `AWS_ROLE_ARN`               | ARN of the IAM deploy role                     |
| `AWS_REGION`                 | AWS region of the S3 bucket                    |
| `S3_BUCKET_NAME`             | Name of the S3 bucket                          |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID                     |
| `CLOUDFRONT_DOMAIN`          | *(optional)* Domain for post-deploy smoke test |

The workflow runs automatically on push to `main` and can be triggered manually via `workflow_dispatch`. See [docs-src/deployment.md](./docs-src/deployment.md) for the full step-by-step setup guide, including the IAM policy JSON and CloudFront configuration.

> [!IMPORTANT]
> Final Scrymat cutover still requires **manual infrastructure follow-up**:
> rename or redeploy the AWS bucket / CloudFront resources as desired, update
> GitHub Actions variables if those names change, rotate any environment-specific
> tokens tied to the legacy identifier, and repoint the public TLD when the new
> deployment is ready.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
Note that this is primarily a hobby project for my own benefit - if there's
something you'd like to see improved please LMK, but also know that maintaining
Scrymat isn't my day job.

## Scryfall Attribution

Card images and data are provided by [Scryfall](https://scryfall.com/). Scrymat
respects Scryfall's API guidelines by rate-limiting requests, caching
aggressively, and including a descriptive User-Agent header. See our
[ROBOT_ETHICS.md](./meta/ROBOT_ETHICS.md) policy.

## License

This project is licensed under a [GPL License](./LICENSE.md).

## Fan Content

Scrymat is unofficial Fan Content permitted under the
[Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not
approved/endorsed by Wizards. Portions of the materials used are property of
Wizards of the Coast. ©Wizards of the Coast LLC.
