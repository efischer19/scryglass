# Ticket 01: Project Scaffolding & Monorepo Setup

## What do you want to build?

Transform the template repository into the Scryglass monorepo. This is the first ticket and establishes the project identity, package structure, toolchain, and CI configuration.

Set up npm workspaces with two packages (`@scryglass/core` and `@scryglass/pwa`), install TypeScript and Zod, configure Vitest for testing, and replace all template placeholders with Scryglass-specific content.

## Acceptance Criteria

- [ ] All `{{PROJECT_NAME}}` placeholders are replaced with `scryglass`
- [ ] All `{{GITHUB_OWNER}}` placeholders are replaced with `efischer19`
- [ ] All `{{PROJECT_URL}}` placeholders are replaced with `https://github.com/efischer19/scryglass`
- [ ] `README.md` is rewritten with a Scryglass project description, monorepo structure overview, and getting started instructions
- [ ] A root `package.json` is created with `"workspaces": ["packages/*"]` and `"private": true`
- [ ] `packages/core/package.json` defines `@scryglass/core` with TypeScript and Zod as dependencies
- [ ] `packages/core/tsconfig.json` targets ESM output with `.d.ts` declarations
- [ ] `packages/pwa/package.json` defines `@scryglass/pwa` with a dependency on `@scryglass/core` (workspace link)
- [ ] `packages/pwa/tsconfig.json` extends the core config for browser-targeted output
- [ ] Vitest is configured in both packages for unit testing (`npm test` works from root)
- [ ] A minimal `packages/core/src/index.ts` barrel export exists (can be empty)
- [ ] A minimal `packages/pwa/src/main.ts` entry point exists
- [ ] CI workflow (`ci.yml`) is updated to run `npm ci`, `npm run build`, and `npm test` across both packages
- [ ] The `.gitignore` is updated to exclude `node_modules/`, `dist/`, and build artifacts
- [ ] `meta/plans/README.md` and `meta/DEVELOPMENT_PHILOSOPHY.md` have placeholders replaced
- [ ] No template-specific instructions remain in any committed file

## Implementation Notes (Optional)

Root `package.json` structure:

```json
{
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  }
}
```

The PWA uses Preact + Vite ([ADR-002](../../meta/adr/ADR-002-ui_framework_choice.md)). Vite scaffolding happens here — use `npm create vite@latest` with the `preact-ts` template as a starting point, then adjust to fit the monorepo workspace structure.

For the core package, use `tsc` to compile TypeScript to ESM JavaScript with declaration files. The `exports` field in `package.json` should point to the compiled output.

**References:** [ADR-007: Monorepo Structure](../../meta/adr/ADR-007-monorepo_structure.md), [ADR-008: TypeScript & Zod](../../meta/adr/ADR-008-typescript_and_zod.md)
