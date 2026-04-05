# Ticket 07 — Manual Accessibility Testing & Tabletop Scenarios

> **Priority:** P2 — Moderate
> **WCAG Criteria:** All (manual validation)
> **Audit Items:** All manual testing items + tabletop-specific testing

## What do you want to build?

Create and execute a structured manual testing checklist covering all items
from the accessibility audit that **cannot be verified by automated tools**.
This includes screen reader testing, keyboard-only navigation, zoom/magnification,
high contrast mode, and the tabletop-specific scenarios unique to Scryglass.

This ticket produces a **test report** (markdown document) with pass/fail
results and any newly discovered issues.

## Acceptance Criteria

- [ ] Keyboard-only navigation: complete a full game flow (load deck → mulligan
      → draw → scry → fetch land → tutor) using only keyboard
- [ ] Screen reader testing on at least one platform (VoiceOver on macOS/iOS,
      NVDA on Windows, or TalkBack on Android):
  - [ ] All buttons announce their purpose
  - [ ] Route changes are announced
  - [ ] Modal open/close is announced
  - [ ] Card draw result is announced
  - [ ] Mulligan hand content is readable
  - [ ] Scry card destinations are announced
- [ ] 200% browser zoom: verify no content is clipped, truncated, or
      inaccessible at 200% zoom
- [ ] High contrast / forced-colors mode: verify all interactive elements are
      visible and distinguishable
- [ ] Tabletop scenarios:
  - [ ] Phone flat on table: text readable, buttons tappable
  - [ ] Bright lighting: screen content visible
  - [ ] Player B zone: no accidental information leakage
  - [ ] Rapid draw: UI responsive, no misfires on adjacent buttons
- [ ] Touch target size: verify all buttons/links meet 44×44 CSS pixel minimum
      (WCAG 2.5.8)
- [ ] Player zone separation: verify adequate spacing to prevent accidental
      taps in the opposite player's zone
- [ ] All results are documented in a test report markdown file
- [ ] Any new issues discovered are filed as separate tickets

## Implementation Notes (Optional)

### Test report template

Create `meta/plans/accessibility-audit-tickets/07-manual-test-report.md` with
the results. Structure:

```markdown
# Manual Accessibility Test Report

**Date:** YYYY-MM-DD
**Tester:** [name]
**Platform:** [device, OS, browser, screen reader version]

## Keyboard Navigation
| Test Case | Result | Notes |
| :-------- | :----- | :---- |
| Tab through all interactive elements | ✅/❌ | |
| ...

## Screen Reader
...

## Zoom & Magnification
...

## High Contrast Mode
...

## Tabletop Scenarios
...

## Issues Discovered
| # | Description | Severity | Ticket |
| :-- | :--------- | :------- | :----- |
```

### Testing tools

- **iOS:** VoiceOver (Settings → Accessibility → VoiceOver)
- **macOS:** VoiceOver (Cmd+F5)
- **Windows:** NVDA (free download from nvaccess.org)
- **Android:** TalkBack (Settings → Accessibility → TalkBack)
- **Zoom:** Ctrl/Cmd + (browser zoom to 200%)
- **High contrast:** Windows High Contrast Mode, or Chrome DevTools
  → Rendering → Emulate CSS media `forced-colors: active`
- **Touch targets:** Chrome DevTools mobile emulation, or physical device

### Dependency

This ticket should be done **after** tickets 01–06 so that the manual testing
validates all automated fixes. Issues found during manual testing should be
filed as new tickets.

### Note on scope

This ticket requires **human testing** — it cannot be completed by an LLM
agent alone. The LLM's role is to create the checklist and report template;
a human must execute the tests on actual devices with actual assistive
technology.
