# End-to-End Testing Strategy

> **Status:** Draft — pending [ADR-011](../adr/ADR-011-e2e_testing_strategy.md) acceptance

## Goal

Simulate a complete 2-player initial draw/mulligan and ~10 turns of gameplay using the `good.txt` (Fellowship) and `evil.txt` (Sauron) sample decks, automated to run on every push to `main`.

## Test Scenarios

### Phase 1: Deck Load & Mulligan

1. **Load Both Decks** — Upload `good.txt` for Player A and `evil.txt` for Player B via the DeckInput component.
2. **Verify Opening Hands** — Both players receive 7-card opening hands. Assert hand sizes and that cards are removed from libraries.
3. **Mulligan Flow** — Trigger a mulligan for one player (if hand qualifies). Verify:
   - Hand is returned to library, library is shuffled, new 7-card hand is dealt.
   - Mulligan count increments.
   - The other player's state is unaffected.
4. **Keep Hands** — Both players keep. Verify transition from `mulligan` → `playing` phase.

### Phase 2: Gameplay (~10 Turns)

For each turn:

5. **Draw** — Each player draws a card. Verify library size decreases by 1 and the drawn card matches the previous top-of-library.
6. **Scry** — Player A scries 2. Verify peek shows correct cards. Send one to top and one to bottom. Verify library order.
7. **Tutor** — Player B tutors for a specific card (e.g., "Nazgûl"). Verify:
   - The card is found and returned.
   - The remaining library is shuffled (order changed).
   - Library size decreases by 1.
8. **Fetch Basic Land** — Player A fetches a Forest. Verify:
   - A Forest is removed from the library.
   - Library is shuffled.
   - The returned card has `cardType: 'land'` and name containing "Forest".
9. **Return to Library** — Return a previously drawn card to a random position. Verify library size increases by 1.

### Phase 3: State Integrity Checks

After each action, verify:

10. **Card Conservation** — Total cards across all zones (library + hand + graveyard + removed) equals the original deck size.
11. **No Duplicate Cards** — No card object exists in two zones simultaneously.
12. **Immutability** — Previous state snapshots are not mutated by subsequent actions.
13. **Cross-Player Isolation** — Actions on Player A never modify Player B's state.

## Visual Regression Screenshots

Capture Playwright screenshots at these key moments:

| Moment | Screenshot Name |
| :----- | :-------------- |
| After deck load, showing DeckInput | `01-deck-loaded.png` |
| Opening hand display (both players) | `02-opening-hands.png` |
| After mulligan decision | `03-post-mulligan.png` |
| Mid-game board state (~turn 5) | `04-mid-game.png` |
| Scry modal with card decisions | `05-scry-modal.png` |
| Tutor search results | `06-tutor-results.png` |
| Fetch land confirmation | `07-fetch-land.png` |

## Implementation Plan

### Step 1: Install Playwright

```bash
npm install -D @playwright/test --workspace=packages/pwa
npx playwright install chromium
```

### Step 2: Create Test File

```text
packages/pwa/e2e/
├── full-game.spec.ts     # Main game simulation test
├── fixtures/
│   ├── good.txt          # Symlink to examples/decklists/good.txt
│   └── evil.txt          # Symlink to examples/decklists/evil.txt
└── playwright.config.ts  # Playwright configuration
```

### Step 3: CI Integration

Add a new job to `.github/workflows/ci.yml`:

```yaml
e2e-tests:
  needs: [build-and-test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm ci
    - run: npm run build
    - run: npx playwright install --with-deps chromium
    - run: npx playwright test
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: e2e-results
        path: |
          packages/pwa/e2e/screenshots/
          packages/pwa/e2e/game-log.json
```

### Step 4: Game Log Format

Each action is logged as:

```json
{
  "turn": 1,
  "player": "A",
  "action": { "type": "DRAW_CARD", "payload": { "player": "A" } },
  "result": { "card": { "name": "...", "setCode": "..." }, "librarySize": 92 },
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

## Success Criteria

- [ ] Full 2-player game simulation passes on every push to `main`
- [ ] Screenshots are captured and uploaded as CI artifacts
- [ ] Game log JSON is produced and reviewable
- [ ] Total CI time increase is <60 seconds
- [ ] No flaky tests (randomized game actions should not cause non-deterministic failures — seed the shuffle for E2E tests)
