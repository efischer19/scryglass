# feat: structured JSON game log output for E2E tests

## What do you want to build?

Add a game log mechanism to E2E tests that produces a structured JSON file recording every dispatched action and its result during a simulated game. This log serves as a debugging artifact and an audit trail, saved as a CI artifact for review.

This covers the "Game Log Output" requirement from the [E2E testing strategy](../e2e-testing-strategy.md).

## Acceptance Criteria

- [ ] Each E2E game simulation produces a `game-log.json` file in the test output directory
- [ ] Each entry in the log contains: `turn` number, `player` identifier, `action` object (type and payload), `result` summary (drawn card, library size, etc.), and ISO 8601 `timestamp`
- [ ] The log format matches the schema defined in the E2E testing strategy:

  ```json
  {
    "turn": 1,
    "player": "A",
    "action": { "type": "DRAW_CARD", "payload": { "player": "A" } },
    "result": { "card": { "name": "...", "setCode": "..." }, "librarySize": 92 },
    "timestamp": "2026-04-05T12:00:00.000Z"
  }
  ```

- [ ] The game log is written to a known path (`packages/pwa/e2e/test-results/game-log.json`) that can be uploaded as a CI artifact
- [ ] The log helper is reusable — it can be imported by any E2E test to log actions during game simulation
- [ ] The game log file is generated when running the full game simulation test

## Implementation Notes (Optional)

- Implement the game log as a test utility class (e.g., `GameLogger`) that E2E tests instantiate at the start of a simulation. The logger collects entries in memory and writes the JSON file at the end of the test (in an `afterAll` or `test.afterEach` hook).

- The logger needs access to the action and result after each game action. If using the exposed test state approach from ticket 08, the logger can capture pre/post state and extract the result. Alternatively, the logger can accept manually-provided action/result pairs from the test code.

- Example usage in a test:

  ```typescript
  const logger = new GameLogger('game-log.json');
  // ... perform draw action ...
  logger.log({ turn: 1, player: 'A', action, result });
  // ... at end of test ...
  await logger.flush();
  ```

- Add `packages/pwa/e2e/test-results/` to `.gitignore` to avoid committing generated logs.

- The game log path should align with the CI artifact upload path defined in ticket 11.
