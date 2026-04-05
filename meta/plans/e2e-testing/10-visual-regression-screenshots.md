# feat: visual regression screenshots at key game moments

## What do you want to build?

Add Playwright screenshot captures at key moments during E2E game simulation tests. These screenshots serve as a visual regression audit trail, uploaded as CI artifacts for human review after each test run.

This covers the "Visual Regression Screenshots" requirement from the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] Screenshots are captured at each of the following moments during the E2E game simulation:

  | Moment | Screenshot Name |
  | :----- | :-------------- |
  | After deck load, showing DeckInput | `01-deck-loaded.png` |
  | Opening hand display (both players) | `02-opening-hands.png` |
  | After mulligan decision | `03-post-mulligan.png` |
  | Mid-game board state (~turn 5) | `04-mid-game.png` |
  | Scry modal with card decisions | `05-scry-modal.png` |
  | Tutor search results | `06-tutor-results.png` |
  | Fetch land confirmation | `07-fetch-land.png` |

- [ ] All screenshots are saved to `packages/pwa/e2e/screenshots/` with the names listed above
- [ ] Screenshots are full-page captures (not just viewport) where applicable
- [ ] The screenshot helper is reusable and can be called from any E2E test
- [ ] All 7 screenshots are generated when running the full game simulation test

## Implementation Notes (Optional)

- Use Playwright's `page.screenshot({ path, fullPage: true })` API to capture screenshots. Wrap this in a helper function that prepends the output directory:

  ```typescript
  async function captureScreenshot(page: Page, name: string) {
    await page.screenshot({
      path: `e2e/screenshots/${name}`,
      fullPage: true,
    });
  }
  ```

- Some screenshots require specific timing:
  - `05-scry-modal.png` — capture while the scry modal is open, before confirming decisions
  - `06-tutor-results.png` — capture while the tutor search results are displayed
  - `07-fetch-land.png` — capture during the fetch land confirmation step

  Use Playwright's `waitFor` to ensure the relevant UI elements are visible before capturing.

- The `packages/pwa/e2e/screenshots/` directory should be in `.gitignore` since screenshots are regenerated on every test run and uploaded as CI artifacts (ticket 11).

- Screenshots are not compared pixel-by-pixel in this ticket. Visual regression comparison tooling (e.g., `pixelmatch` or Playwright's built-in snapshot comparison) could be added in a future ticket if needed.
