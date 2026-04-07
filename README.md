# 🔮 [Scryglass](https://scryglass.cards)

[![CI](https://github.com/efischer19/scryglass/actions/workflows/ci.yml/badge.svg)](https://github.com/efischer19/scryglass/actions/workflows/ci.yml)
[![License: GPL](https://img.shields.io/badge/License-GPL-blue.svg)](./LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./packages/core/tsconfig.json)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-brightgreen)](./packages/pwa/public/manifest.json)

**Scry, shuffle, and goldfish your Magic: The Gathering decks — offline, at the table, no account required.**

---

Scryglass is a **free, open-source Progressive Web App (PWA)** that replaces physical deck manipulation for MTG goldfishing and casual play. It runs entirely in your browser, works offline after first load, and is designed for use on a phone lying flat on a game store table.

## 🚀 Quick Start (Play Tonight!)

**No installation. No account. Just open and play.**

1. Visit the app at [`scryglass.cards`](https://scryglass.cards)
2. Paste your deck list (Scryglass CSV format, or import from Moxfield/Archidekt/MTGO)
3. All players load their decks → automatic shuffle → opening hands dealt
4. Play! Draw, scry, tutor, and fetch — Scryglass handles the library for you

## ✨ Features

- **🔒 Cryptographically fair shuffle** — Fisher-Yates algorithm with `crypto.getRandomValues()` and rejection sampling ([ADR-004](./meta/adr/ADR-004-cryptographic_shuffle.md))
- **📱 Offline-first PWA** — Install to your home screen, play without WiFi after first load
- **🃏 Full library manipulation** — Draw, scry, tutor, fetch basic lands, return to library
- **🔄 Strict mulligan engine** — Auto-mull on 0/1/6/7 lands, hard keep on 3/4, optional choice on 2/5
- **🖼️ Card images via Scryfall** — Background prefetch with IndexedDB caching and JIT priority loading
- **📥 Multi-format import** — Supports Moxfield, Archidekt, and MTGO/Arena deck formats
- **📤 Multi-format export** — Export your deck to any supported format
- **👥 Multiplayer support** — multiple-deck UI with player isolation (no peeking!)

## 💭 Why Scryglass?

Scryglass was born out of a simple frustration: shuffling takes too long. I originally built this so I could play Magic with my kids. Previously, I was spending half of our "playtime" physically manipulating our cards. I wanted a way to let the computer handle the mechanics of the library so we could focus on actually playing the game together.

Beyond saving time at the kitchen table, Scryglass is built to solve a few specific problems:

- **Protecting High-Value Collectibles**: Play with your physical dual lands, foils, and reserved list cards without subjecting them to the wear and tear of constant mash-shuffling.
- **Accessibility**: 100-card Commander decks are physically difficult to manipulate. Scryglass removes the physical barrier of dexterity required to shuffle, fetch, and handle a massive deck.
- **Frictionless Goldfishing**: Test your latest brews instantly. Just paste your Moxfield link and start drawing hands without needing to sleeve up a single card.

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

## Architecture

Scryglass is built as a monorepo with strict separation of concerns:

| Package | Purpose | Browser Dependencies |
| :------ | :------ | :------------------- |
| **`@scryglass/core`** | Pure game logic: deck parsing, cryptographic shuffle, state management, mulligan rules, library manipulation | ❌ None — runs in Node.js and browsers |
| **`@scryglass/pwa`** | Preact + Vite frontend: UI rendering, Scryfall API integration, IndexedDB caching, Service Worker | ✅ Browser APIs required |

The `@scryglass/core` module uses a strict **JSON-in/JSON-out action-reducer pattern** with Zod schema validation, making it suitable for consumption by AI agents, CLI tools, or any TypeScript/JavaScript consumer.

## Monorepo Structure

```text
scryglass/
├── packages/
│   ├── core/             # @scryglass/core — game logic library
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── pwa/              # @scryglass/pwa — Preact + Vite frontend
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

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
Note that this is primarily a hobby project for my own benefit - if there's something you'd like to see improved please LMK, but also know that maintaining Scryglass isn't my day job.

## Scryfall Attribution

Card images and data are provided by [Scryfall](https://scryfall.com/). Scryglass respects Scryfall's API guidelines by rate-limiting requests, caching aggressively, and including a descriptive User-Agent header. See our [ROBOT_ETHICS.md](./meta/ROBOT_ETHICS.md) policy.

## License

This project is licensed under a [GPL License](./LICENSE.md).

## Fan Content

Scryglass is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
