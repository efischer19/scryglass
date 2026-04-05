# feat: E2E test for loading both decks via DeckInput

## What do you want to build?

Write a Playwright E2E test that loads the `good.txt` (Fellowship) deck for Player A and the `evil.txt` (Sauron) deck for Player B via the DeckInput component, then verifies both decks are loaded successfully and the app transitions to the shuffler view.

This corresponds to Phase 1, Step 1 ("Load Both Decks") of the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] Test fixture files exist at `packages/pwa/e2e/fixtures/good.txt` and `packages/pwa/e2e/fixtures/evil.txt` (symlinks to `examples/decklists/good.txt` and `examples/decklists/evil.txt`)
- [ ] A Playwright test loads `good.txt` for Player A via the DeckInput component's file upload or text paste mechanism
- [ ] The same test loads `evil.txt` for Player B via the DeckInput component
- [ ] After both decks are loaded, the test asserts the app has navigated to the shuffler view (`#/app` route per ADR-009)
- [ ] The test verifies both players' libraries are populated (non-zero card count displayed in the UI)
- [ ] The test passes against the production build (`npm run build && npm run test:e2e`)

## Implementation Notes (Optional)

- Use symlinks for fixture files rather than copying, so fixtures stay in sync with the canonical example decklists. If symlinks cause issues on Windows CI runners, copy the files instead and add a note about keeping them in sync.

- The DeckInput component handles file upload. Use Playwright's `page.setInputFiles()` or `locator.setInputFiles()` to upload the deck files.

- After loading, the app should transition from `#/input` to `#/app` (per ADR-009). Wait for the hash to change before asserting the shuffler view is visible.

- This test establishes the "deck load" helper that subsequent E2E tests (mulligan, gameplay) will reuse. Consider extracting the deck loading logic into a shared test utility or Playwright fixture.
