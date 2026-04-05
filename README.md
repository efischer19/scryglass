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

- [ADR-002](./meta/adr/ADR-002-ui_framework_choice.md) — Preact + Vite for the PWA
- [ADR-003](./meta/adr/ADR-003-scryfall_api_integration.md) — Scryfall API integration
- [ADR-007](./meta/adr/ADR-007-monorepo_structure.md) — Monorepo structure (core/PWA separation)
- [ADR-008](./meta/adr/ADR-008-typescript_and_zod.md) — TypeScript & Zod for strict typing

## License

This project is licensed under the [MIT License](./LICENSE.md).
