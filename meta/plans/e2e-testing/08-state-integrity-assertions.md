# feat: E2E state integrity assertions after each game action

## What do you want to build?

Create a reusable set of Playwright assertion helpers that verify state integrity after every game action in E2E tests. These assertions ensure that core invariants — card conservation, no duplicate cards, immutability, and cross-player isolation — hold throughout an entire simulated game.

This covers Phase 3 ("State Integrity Checks") of the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] **Card Conservation:** An assertion helper verifies that the total number of cards across all zones (library + drawn/removed cards) equals the original deck size for each player, after every action
- [ ] **No Duplicate Cards:** An assertion helper verifies that no card instance appears in multiple zones simultaneously
- [ ] **Immutability:** An assertion helper captures state snapshots before and after an action and verifies that previous snapshots are not mutated by subsequent actions
- [ ] **Cross-Player Isolation:** An assertion helper verifies that an action targeting Player A does not modify any of Player B's state (library size, phase, hand), and vice versa
- [ ] All four assertion helpers are extracted as reusable functions that can be called after any action in existing E2E tests (tickets 02–07)
- [ ] At least one existing E2E test (from tickets 02–07) is updated to call these assertion helpers after each action, demonstrating the pattern
- [ ] All assertions pass against the production build

## Implementation Notes (Optional)

- These assertions run in the browser context via Playwright, so they need to read state from the UI or from exposed test hooks. Options:

  1. **UI-based assertions:** Read card counts from displayed library sizes, count visible cards in hand/drawn areas, and compare totals. This is the most realistic E2E approach but requires the UI to expose enough information.

  2. **Exposed test state:** If the app exposes `window.__SCRYGLASS_STATE__` in a test/development build, Playwright can use `page.evaluate()` to directly inspect the game state object. This gives precise access to library arrays, phase values, and all zones.

  Option 2 is recommended for state integrity checks because it provides exact card-level inspection. Consider adding a `data-testid="state-debug"` element or `window.__SCRYGLASS_STATE__` export only in test builds (guarded by `import.meta.env.MODE === 'test'` or similar).

- For immutability checks, capture `JSON.stringify(state)` snapshots before each action and compare after the action to verify the old snapshot is unchanged. This catches accidental mutation bugs that are invisible in the UI.

- Cross-player isolation can be checked by recording Player B's full state (library size, phase) before an action on Player A, then asserting Player B's state is byte-for-byte identical after the action.

- Extract these helpers into a shared file (e.g., `packages/pwa/e2e/helpers/state-assertions.ts`) so all E2E tests can import and use them consistently.
