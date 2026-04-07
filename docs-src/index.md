# scryglass Documentation

Welcome to the official documentation for **scryglass** — a free, open-source Progressive Web App (PWA) for goldfishing and casual play of Magic: The Gathering decks offline, at the table, no account required.

## Overview

scryglass is built as a **Preact + Vite monorepo** consisting of two packages:

- **`@scryglass/core`** — Pure game logic: deck parsing, cryptographic shuffle, state management, mulligan rules, and library manipulation. No DOM or browser dependencies.
- **`@scryglass/pwa`** — Preact + Vite frontend: UI rendering, Scryfall API integration, IndexedDB caching, and Service Worker.

## Getting Started

1. **Install dependencies:** `npm install` from the repository root.
2. **Build:** `npm run build` (compiles `@scryglass/core` then builds `@scryglass/pwa` with Vite).
3. **Run the dev server:** `npm run dev --workspace=packages/pwa` then open `http://localhost:5173`.

## Project Structure

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
├── meta/             # Development philosophy, ADRs, and plans
├── docs-src/         # Documentation source files (MkDocs)
├── scripts/          # Utility and automation scripts
└── .github/          # GitHub-specific configuration
```

## Development Philosophy

All work in this project follows the
[Development Philosophy](DEVELOPMENT_PHILOSOPHY.md), which emphasizes:

- **Code is for Humans First** — Clarity over cleverness
- **Favor Simplicity** — Static-first design with minimal complexity
- **Confidence Through Testing** — Comprehensive automated tests
- **Clean Commit History** — Atomic commits with descriptive messages

## Contributing

For information on contributing to this project, see the
[Contributing Guidelines](CONTRIBUTING.md).

## Getting Help

- Check the documentation pages listed in the navigation
- Review the [Architecture Decision Records](https://github.com/efischer19/scryglass/tree/main/meta/adr)
  for context on past decisions
- [Open an issue](https://github.com/efischer19/scryglass/issues)
  if you find a bug or want to suggest a feature
