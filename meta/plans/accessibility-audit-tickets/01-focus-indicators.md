# Ticket 01 — Add Focus Indicators to All Interactive Elements

> **Priority:** P0 — Blocker
> **WCAG Criterion:** 2.4.7 Focus Visible (AA)
> **Audit Items:** 2.4 — Focus visible on all interactive elements

## What do you want to build?

Several interactive elements in the PWA lack visible focus indicators, making
the app unusable for keyboard-only users. The following CSS classes have
`:hover` styles but no corresponding `:focus` styles:

- `.action-btn` (Draw, Fetch Land, Tutor, Scry buttons in PlayerZone)
- `.app-header__btn` (Load Decks button in Header)
- `.deck-input__storage-btn` (Load, Save, Rename, Delete buttons in DeckInput)
- `.export-dropdown__btn` (Copy/Export button in ExportDropdown)
- `.mulligan-hand__action-btn` (Keep Hand, Mulligan buttons)
- `.deck-editor__resolve-btn`, `.deck-editor__resolve-all-btn` (Resolve buttons)

Currently only these elements have explicit `:focus` rules:

- `.mulligan-hand__gate:focus` ✅
- `.deck-input__textarea:focus` ✅
- `.deck-editor__card:focus` ✅
- `.deck-editor__input:focus`, `.deck-editor__select:focus` ✅

## Acceptance Criteria

- [ ] Every interactive element (buttons, links, inputs, selects) shows a
      visible focus indicator when focused via keyboard
- [ ] Focus indicators use `outline` (not `box-shadow`) for forced-colors
      mode compatibility
- [ ] Focus indicators have at least 2px width and sufficient contrast against
      adjacent backgrounds
- [ ] A `:focus-visible` selector is used instead of `:focus` where possible,
      so that mouse clicks don't trigger focus rings (progressive enhancement)
- [ ] Existing `:focus` rules are preserved or upgraded to `:focus-visible`
- [ ] A vitest-axe regression test in at least one affected component validates
      focus visibility (or a new test file covers this)

## Implementation Notes (Optional)

Recommended CSS pattern to add:

```css
/* Global focus-visible baseline for all buttons and links */
button:focus-visible,
a:focus-visible,
select:focus-visible,
input:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

This provides a universal fallback. Component-specific focus rules can override
this if a different color or offset is desired.

Consider also adding `:focus-visible` variants for the existing `:focus` rules
on `.mulligan-hand__gate`, `.deck-input__textarea`, `.deck-editor__card`, etc.

Reference: The `src/index.html` static site already has good focus indicator
patterns that can serve as a model.

Files to modify:

- `packages/pwa/src/assets/styles.css`
