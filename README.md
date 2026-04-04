# Scryglass

> A static PWA for Magic: The Gathering deck library management — scry, shuffle, and goldfish your decks offline.

## What Is This?

Scryglass is a **Progressive Web App (PWA)** for managing and goldfishing Magic: The Gathering decks. It runs entirely in the browser, works offline, and is designed for use at the game store on spotty WiFi.

Built as a monorepo with two packages:

- **`@scryglass/core`** — Pure game logic: deck parsing, cryptographic shuffle, state management, mulligan rules, and library manipulation (draw, tutor, fetch, scry)
- **`@scryglass/pwa`** — Preact + Vite frontend: UI rendering, Scryfall API integration, IndexedDB caching, Service Worker, and accessibility

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

## Architecture Decisions

All significant decisions are documented as [Architecture Decision Records](./meta/adr/):

- [ADR-002](./meta/adr/ADR-002-ui_framework_choice.md) — Preact + Vite for the PWA
- [ADR-003](./meta/adr/ADR-003-scryfall_api_integration.md) — Scryfall API integration
- [ADR-007](./meta/adr/ADR-007-monorepo_structure.md) — Monorepo structure (core/PWA separation)
- [ADR-008](./meta/adr/ADR-008-typescript_and_zod.md) — TypeScript & Zod for strict typing

## License

This project is licensed under the [MIT License](./LICENSE.md).
