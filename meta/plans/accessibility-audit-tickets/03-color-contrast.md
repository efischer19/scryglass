# Ticket 03 — Color Contrast & Non-Color Distinction

> **Priority:** P1 — Critical
> **WCAG Criteria:** 1.4.3 Contrast Minimum (AA), 1.4.11 Non-text Contrast
> (AA), 1.4.1 Use of Color (A)
> **Audit Items:** 1.4 — Text/UI contrast; information not conveyed by color
> alone

## What do you want to build?

Audit and fix color contrast issues across the PWA, focusing on two areas:

### 1. Disabled button contrast

Multiple button classes use `opacity: 0.4` for their disabled state:

- `.action-btn:disabled` (line 175)
- `.deck-input__parse-btn:disabled` (line 414)
- `.deck-input__storage-btn:disabled` (line 479)
- `.deck-editor__resolve-btn:disabled` (line 682)
- `.deck-editor__resolve-all-btn:disabled` (line 876)
- `.mulligan-hand__action-btn:disabled` (line 918)

At `opacity: 0.4`, white text (`#ffffff`) on blue (`#2563eb`) yields
approximately `rgba(146, 177, 243)` on the light background (`#f8fafc`),
which may fail the 3:1 non-text contrast requirement (WCAG 1.4.11).

### 2. Player A vs Player B color-only distinction

Player A uses blue (`--player-a-accent: #2563eb`) and Player B uses red
(`--player-b-accent: #dc2626`). While these colors are distinct, the
distinction is **color-only** — there is no secondary visual indicator
(pattern, icon, or spatial label) to differentiate the two zones for
colorblind users.

The `<h2>` heading ("Player A" / "Player B") provides a text label, which
partially addresses this. However, the action buttons within each zone are
color-coded with no additional text or icon distinction.

## Acceptance Criteria

- [ ] All disabled buttons maintain at least 3:1 contrast ratio against their
      background (WCAG 1.4.11)
- [ ] Disabled state uses `opacity: 0.5` or higher (or an alternative approach
      like desaturated background color with sufficient contrast)
- [ ] Player A and Player B zones have a non-color visual distinction beyond
      the heading text (e.g., an icon, border style, or textual label on the
      zone container)
- [ ] Contrast ratios are documented / verified using a tool (e.g., Chrome
      DevTools color picker contrast checker, or WebAIM Contrast Checker)
- [ ] A comment in the CSS documents the contrast ratios for the primary
      color combinations

## Implementation Notes (Optional)

### Disabled contrast fix

Change all `opacity: 0.4` rules to `opacity: 0.55` (or calculate the exact
minimum). A better approach might be to use explicit disabled colors instead
of opacity:

```css
.action-btn:disabled {
  background-color: #94a3b8; /* neutral gray, 4.5:1 on white */
  color: #ffffff;
  cursor: not-allowed;
}
```

### Player distinction

Add a subtle border or pattern difference:

```css
.player-zone--a {
  border-left: 4px solid var(--player-a-accent);
}

.player-zone--b {
  border-left: 4px double var(--player-b-accent);
}
```

Or add a small icon/emoji prefix to the player name heading.

Files to modify:

- `packages/pwa/src/assets/styles.css`
- Possibly `packages/pwa/src/components/PlayerZone.tsx` (if adding non-color
  indicators to the component)
