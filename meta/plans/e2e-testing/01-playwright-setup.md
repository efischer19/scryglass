# feat: install Playwright and create E2E test scaffolding

## What do you want to build?

Install Playwright as a dev dependency in `@scryglass/pwa` and create the base directory structure, configuration, and a smoke test that verifies the PWA loads in a headless browser.

This is the foundation ticket for the E2E testing epic described in [ADR-011](../../adr/ADR-011-e2e_testing_strategy.md). All subsequent E2E tickets depend on this setup.

## Acceptance Criteria

- [ ] `@playwright/test` is installed as a devDependency in `packages/pwa/package.json`
- [ ] A `playwright.config.ts` exists at `packages/pwa/playwright.config.ts` configured for headless Chromium, with `webServer` pointing to `vite preview`
- [ ] The E2E test directory structure is created: `packages/pwa/e2e/`
- [ ] A smoke test (`packages/pwa/e2e/smoke.spec.ts`) loads the PWA and asserts the page title or a known root element is present
- [ ] An npm script `test:e2e` is added to `packages/pwa/package.json` that runs `playwright test`
- [ ] The smoke test passes locally after `npm run build` in the pwa workspace

## Implementation Notes (Optional)

- Install Playwright and Chromium only:

  ```bash
  npm install -D @playwright/test --workspace=packages/pwa
  npx playwright install chromium
  ```

- The `playwright.config.ts` should:
  - Use `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]` — no need for Firefox/WebKit in v0
  - Set `webServer.command` to `npm run preview` (Vite's static preview server) so E2E tests run against the production build
  - Set a `testDir` of `./e2e`
  - Configure `outputDir` for test artifacts (traces, screenshots)

- The smoke test should be minimal — just navigate to the app URL and confirm the page rendered. This validates the Playwright ↔ Vite integration before writing complex game tests.

- Add `test-results/` and `playwright-report/` to `.gitignore` if not already excluded.
