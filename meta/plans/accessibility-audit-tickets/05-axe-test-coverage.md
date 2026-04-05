# Ticket 05 — Expand vitest-axe Regression Coverage to All Components

> **Priority:** P1 — Critical
> **WCAG Criterion:** All (regression prevention)
> **Audit Items:** All automated testing items in the audit plan

## What do you want to build?

Currently only 5 of 14 PWA components have vitest-axe accessibility regression
tests. Add `axe()` assertions to the remaining 9 components to prevent
accessibility regressions.

### Components WITH axe tests (keep as-is)

1. ✅ `ConfirmationGate.test.tsx` — 1 axe test
2. ✅ `DeckInput.test.tsx` — 2 axe tests (empty state + with saved decks)
3. ✅ `CardDisplay.test.tsx` — 1 axe test
4. ✅ `ScryModal.test.tsx` — 2 axe tests (count phase + resolve phase)
5. ✅ `MulliganHand.test.tsx` — 2 axe tests (gate hidden + hand revealed)

### Components MISSING axe tests (add)

1. ❌ `Header.test.tsx`
2. ❌ `App.test.tsx`
3. ❌ `ExportDropdown.test.tsx`
4. ❌ `Router.test.tsx`
5. ❌ `TutorModal.test.tsx`
6. ❌ `DrawButton.test.tsx`
7. ❌ `PlayerZone.test.tsx`
8. ❌ `FetchLandModal.test.tsx`
9. ❌ `DeckEditor.test.tsx`

## Acceptance Criteria

- [ ] All 14 component test files include at least one `it('passes vitest-axe
      a11y assertions', ...)` test
- [ ] Each axe test renders the component in a representative state (not just
      default/empty)
- [ ] All new axe tests pass without violations
- [ ] For modal components (TutorModal, FetchLandModal), the axe test renders
      the modal in its open/visible state
- [ ] For PlayerZone, axe tests cover both the `mulligan` phase and `playing`
      phase states
- [ ] No existing tests are removed or modified (only additions)
- [ ] All tests pass: `npm run test --workspace=packages/pwa`

## Implementation Notes (Optional)

Follow the existing pattern from `ConfirmationGate.test.tsx`:

```tsx
import { axe } from 'vitest-axe';

it('passes vitest-axe a11y assertions', async () => {
  const { container } = render(<ComponentUnderTest {...requiredProps} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Notes per component

- **Header**: Simple — render with `onLoadDecks` callback
- **App**: May need mocking of `@scryglass/core` and `window.location.hash`
- **ExportDropdown**: Render with a mock `cards` array
- **Router**: Render with three stub views; may need `location.hash` mocking
- **TutorModal**: Render with mock library, dispatch, and onClose
- **DrawButton**: Render with player, disabled, libraryEmpty, callbacks
- **PlayerZone**: Render in `playing` phase with mock state
- **FetchLandModal**: Render with mock library containing basic lands
- **DeckEditor**: Render with a `ConvertResult` containing unresolved cards

### Dependency

This ticket should be done **after** tickets 01–04 so that the axe tests
validate the fixes made in those tickets. If done before, some axe tests may
fail due to the issues being fixed.

Files to modify:

- `packages/pwa/src/components/__tests__/Header.test.tsx`
- `packages/pwa/src/components/__tests__/App.test.tsx`
- `packages/pwa/src/components/__tests__/ExportDropdown.test.tsx`
- `packages/pwa/src/components/__tests__/Router.test.tsx`
- `packages/pwa/src/components/__tests__/TutorModal.test.tsx`
- `packages/pwa/src/components/__tests__/DrawButton.test.tsx`
- `packages/pwa/src/components/__tests__/PlayerZone.test.tsx`
- `packages/pwa/src/components/__tests__/FetchLandModal.test.tsx`
- `packages/pwa/src/components/__tests__/DeckEditor.test.tsx`
