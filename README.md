# 🔮 [Scryglass](https://scryglass.cards)

[![CI](https://github.com/efischer19/scryglass/actions/workflows/ci.yml/badge.svg)](https://github.com/efischer19/scryglass/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./packages/core/tsconfig.json)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-brightgreen)](./packages/pwa/public/manifest.json)

> **Scry, shuffle, and goldfish your Magic: The Gathering decks — offline, at the table, no account required.**

Scryglass is a **free, open-source Progressive Web App (PWA)** that replaces physical deck manipulation for MTG goldfishing and casual play. It runs entirely in your browser, works offline after first load, and is designed for use on a phone lying flat on a game store table.

## ✨ Features

- **🔒 Cryptographically fair shuffle** — Fisher-Yates algorithm with `crypto.getRandomValues()` and rejection sampling ([ADR-004](./meta/adr/ADR-004-cryptographic_shuffle.md))
- **📱 Offline-first PWA** — Install to your home screen, play without WiFi after first load
- **🃏 Full library manipulation** — Draw, scry, tutor, fetch basic lands, return to library
- **🔄 Strict mulligan engine** — Auto-mull on 0/1/6/7 lands, hard keep on 3/4, optional choice on 2/5
- **🖼️ Card images via Scryfall** — Background prefetch with IndexedDB caching and JIT priority loading
- **📥 Multi-format import** — Supports Moxfield, Archidekt, and MTGO/Arena deck formats
- **📤 Multi-format export** — Export your deck to any supported format
- **👥 Two-player support** — Dual-deck UI with player isolation (no peeking!)

## 🚀 Quick Start (Play Tonight!)

**No installation. No account. Just open and play.**

1. Visit the app at [`scryglass.cards`](https://scryglass.cards) (or run locally — see below)
2. Paste your deck list (Scryglass CSV format, or import from Moxfield/Archidekt/MTGO)
3. Both players load their decks → automatic shuffle → opening hands dealt
4. Play! Draw, scry, tutor, and fetch — Scryglass handles the library for you

### Run Locally

```bash
git clone https://github.com/efischer19/scryglass.git
cd scryglass
npm install
npm run build
npm run dev --workspace=packages/pwa
# Open http://localhost:5173 in your browser
```

## Architecture

Built as a monorepo with strict separation of concerns:

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

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- npm (v10 or later, included with Node.js)

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Development

```bash
# Run the PWA dev server
npm run dev --workspace=packages/pwa
```

### Local Quality Checks

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run local CI checks
./scripts/local-ci-check.sh
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

## Architecture Decisions

All significant decisions are documented as [Architecture Decision Records](./meta/adr/):

| ADR | Title |
| :-- | :---- |
| [ADR-002](./meta/adr/ADR-002-ui_framework_choice.md) | Preact + Vite for the PWA |
| [ADR-003](./meta/adr/ADR-003-scryfall_api_integration.md) | Scryfall API integration & compliance |
| [ADR-004](./meta/adr/ADR-004-cryptographic_shuffle.md) | Fisher-Yates shuffle with Web Crypto API |
| [ADR-007](./meta/adr/ADR-007-monorepo_structure.md) | Monorepo structure (core/PWA separation) |
| [ADR-008](./meta/adr/ADR-008-typescript_and_zod.md) | TypeScript & Zod for strict typing |

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Scryfall Attribution

Card images and data are provided by [Scryfall](https://scryfall.com/). Scryglass respects Scryfall's API guidelines by rate-limiting requests, caching aggressively, and including a descriptive User-Agent header. See our [ROBOT_ETHICS.md](./meta/ROBOT_ETHICS.md) policy.

## License

This project is licensed under a [GPL License](./LICENSE.md).

---

Scryglass is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
