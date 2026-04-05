# Ticket 08 — Lighthouse Accessibility Audit & Playwright E2E A11y Tests

> **Priority:** P3 — Enhancement
> **WCAG Criteria:** All (automated regression in CI)
> **Audit Items:** Success criteria — Lighthouse score ≥ 90; all interactive
> components keyboard-accessible

## What do you want to build?

Integrate automated accessibility testing into the CI pipeline using two tools:

1. **Lighthouse CI** — Run Lighthouse accessibility audit on every PR and
   enforce a minimum score of 90
2. **Playwright + axe-core** — Add E2E accessibility tests that exercise the
   full application in a real browser, complementing the unit-level vitest-axe
   tests

This builds on ADR-011 (E2E Testing Strategy) which already establishes
Playwright as the E2E framework.

## Acceptance Criteria

- [ ] A Playwright test file (`e2e/accessibility.spec.ts` or similar) exists
      that:
  - [ ] Loads the app at `#/input` and runs axe-core scan (zero violations)
  - [ ] Navigates to `#/editor` and runs axe-core scan
  - [ ] Navigates to `#/app` (after loading a test deck) and runs axe-core scan
  - [ ] Verifies keyboard Tab order through the DeckInput page
  - [ ] Verifies that modals (Scry, Tutor, FetchLand) trap focus
  - [ ] Verifies that Escape closes modals
- [ ] Lighthouse CI configuration is added (`.lighthouserc.js` or similar)
      with accessibility score threshold ≥ 90
- [ ] CI workflow (GitHub Actions) runs both Playwright a11y tests and
      Lighthouse audit on PRs
- [ ] All tests pass on the current codebase (after tickets 01–07)
- [ ] Test results are surfaced as CI check annotations or artifacts

## Implementation Notes (Optional)

### Playwright + axe-core

Use the `@axe-core/playwright` package:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('accessibility', () => {
  test('deck input page has no a11y violations', async ({ page }) => {
    await page.goto('/#/input');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('game page has no a11y violations', async ({ page }) => {
    // Load a test deck first, then navigate
    await page.goto('/#/input');
    // ... paste deck, click load ...
    await page.waitForURL('/#/app');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### Lighthouse CI

Use `@lhci/cli`:

```javascript
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview --workspace=packages/pwa',
      url: ['http://localhost:4173/'],
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

### Dependency

This ticket depends on:

- **Ticket 05** (axe test coverage) — ensures unit tests are green
- **Ticket 07** (manual testing) — ensures no manual-only issues remain

It also builds on **ADR-011** (E2E Testing Strategy) which establishes the
Playwright infrastructure.

### New dependencies to add

- `@axe-core/playwright` (dev dependency in root or packages/pwa)
- `@lhci/cli` (dev dependency in root, for CI only)

Files to create/modify:

- `e2e/accessibility.spec.ts` (new)
- `.lighthouserc.js` (new)
- `.github/workflows/` — add or update CI workflow
- `package.json` — add dev dependencies
