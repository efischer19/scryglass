# feat: CI integration for E2E tests with artifact upload

## What do you want to build?

Add a new GitHub Actions job to the CI workflow that runs the Playwright E2E test suite after the build step completes. The job uploads screenshots and game logs as CI artifacts for human review.

This covers the "CI Integration" requirement from the [E2E testing strategy](../e2e-testing-strategy.md) and [ADR-011](../../adr/ADR-011-e2e_testing_strategy.md).

## Acceptance Criteria

- [ ] A new `e2e-tests` job is added to `.github/workflows/ci.yml`
- [ ] The job depends on the existing `build-and-test` job (`needs: [build-and-test]`)
- [ ] The job installs dependencies, builds the project, installs Playwright's Chromium browser, and runs `npx playwright test`
- [ ] On every run (pass or fail), the job uploads the following as GitHub Actions artifacts:
  - `packages/pwa/e2e/screenshots/` — visual regression screenshots
  - `packages/pwa/e2e/test-results/game-log.json` — structured game log
- [ ] The E2E job runs on pushes to `main` and on PRs targeting `main` (matching existing CI triggers)
- [ ] The E2E tests complete within 60 seconds (the performance budget from ADR-011)
- [ ] A failing E2E test blocks the PR from merging (required status check)

## Implementation Notes (Optional)

- Add the following job to `.github/workflows/ci.yml`:

  ```yaml
  e2e-tests:
    name: E2E Tests
    needs: [build-and-test]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test --config=packages/pwa/playwright.config.ts

      - name: Upload E2E artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results
          path: |
            packages/pwa/e2e/screenshots/
            packages/pwa/e2e/test-results/game-log.json
  ```

- Use `if: always()` on the artifact upload step so screenshots and logs are available even when tests fail — this is critical for debugging failures.

- The `needs: [build-and-test]` dependency ensures E2E tests only run after unit tests pass, avoiding wasted CI minutes on known-broken builds.

- Consider caching Playwright browser binaries across CI runs to reduce install time. Playwright provides guidance on caching with GitHub Actions.

- The `--config` flag points to the Playwright config in the pwa package. Alternatively, the `npx playwright test` command can be run from the `packages/pwa` directory.
