# Scrymat Documentation

Welcome to the official documentation for **Scrymat** — the renamed and
expanded successor to Scryglass. Scrymat is a free, open-source Progressive Web
App (PWA) for goldfishing, pass-and-play, and lightweight synchronized remote
Magic: The Gathering sessions.

## Overview

Scrymat is built as a **Preact + Vite monorepo** consisting of two packages:

- **`@scryglass/core`** — Pure game logic: deck parsing, deterministic shared
  shuffling, zone-based state management, setup flows, and card movement. No
  DOM or browser dependencies.
- **`@scryglass/pwa`** — Preact + Vite frontend: UI rendering, Scryfall API
  integration, IndexedDB caching, Service Worker, and WebRTC match sync.

## Pivot Highlights

- **Shared playmat state** for moving cards through public and private zones
- **Deterministic shared shuffling** for remote match setup
- **WebRTC match synchronization** with stateless signaling
- **Commit-reveal hidden information** for safer remote play
- **Offline-first local play** that still works for solo goldfishing and couch
  play

## Getting Started

1. **Install dependencies:** `npm install` from the repository root.
2. **Build:** `npm run build` (compiles `@scryglass/core` then builds `@scryglass/pwa` with Vite).
3. **Run the dev server:** `npm run dev --workspace=packages/pwa` then open `http://localhost:5173`.

!!! note
    The repository, package names, and deployed URLs still use the legacy
    `scryglass` identifier while the Scrymat rename is rolling out.

## Project Structure

```text
repository-root/
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
