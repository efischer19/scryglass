# Ticket 04 — DeckEditor Card List Keyboard Interaction

> **Priority:** P1 — Critical
> **WCAG Criterion:** 2.1.1 Keyboard (A)
> **Audit Items:** 2.1 — All interactive elements keyboard accessible

## What do you want to build?

The DeckEditor component renders card items with `tabIndex={0}` (making them
focusable) but provides **no keyboard event handlers**. This means keyboard
users can Tab to each card item but cannot interact with it — there is no
Enter, Space, or Arrow key behavior.

This creates a confusing experience: the focus ring suggests the element is
interactive, but pressing Enter or Space does nothing.

The card items currently at `packages/pwa/src/components/DeckEditor.tsx` line
263:

```tsx
<div
  key={card.key}
  class={`deck-editor__card ${complete ? '' : 'deck-editor__card--unresolved'}`}
  role="listitem"
  tabIndex={0}
  aria-label={`${card.name}${complete ? '' : ' (unresolved)'}`}
>
```

## Acceptance Criteria

- [ ] DeckEditor card list items either:
  - **(Option A)** Remove `tabIndex={0}` so they are not focusable (rely on
    the individual input fields and buttons within each card for keyboard
    interaction), **OR**
  - **(Option B)** Add keyboard handlers (Enter/Space) that expand the card
    for editing or focus the first input field within the card
- [ ] Whichever option is chosen, keyboard users can fully interact with the
      deck editor (edit set code, collector number, card type; resolve cards)
      using only the keyboard
- [ ] A vitest-axe regression test is added for DeckEditor in the
      `a11y assertions` pattern used by other components
- [ ] No loss of existing mouse/touch functionality

## Implementation Notes (Optional)

### Recommended: Option A (simpler)

Remove `tabIndex={0}` from the card wrapper `<div>`. The card already contains
focusable children (inputs, selects, buttons) that Tab will reach. The wrapper
`<div>` with `role="listitem"` is semantic and does not need to be
independently focusable.

```tsx
// Before
<div role="listitem" tabIndex={0} aria-label={...}>

// After
<div role="listitem" aria-label={...}>
```

This is the minimal change and aligns with the principle that interactive
elements should be natively focusable (buttons, inputs) rather than `div`
elements with `tabIndex`.

### Alternative: Option B (richer interaction)

If you want the card to be a "collapsible" or "expandable" region, add
keyboard handlers:

```tsx
<div
  role="listitem"
  tabIndex={0}
  aria-label={...}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Focus the first input within this card
      const firstInput = e.currentTarget.querySelector('input, select');
      if (firstInput) (firstInput as HTMLElement).focus();
    }
  }}
>
```

Files to modify:

- `packages/pwa/src/components/DeckEditor.tsx`
- `packages/pwa/src/components/__tests__/DeckEditor.test.tsx` (add axe test)
