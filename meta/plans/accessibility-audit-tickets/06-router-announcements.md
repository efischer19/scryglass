# Ticket 06 — Router Route-Change Screen Reader Announcements

> **Priority:** P2 — Moderate
> **WCAG Criteria:** 4.1.3 Status Messages (AA), 2.4.2 Page Titled (A)
> **Audit Items:** 4.1 — Dynamic content changes announced via `aria-live`;
> 2.4 — Pages have descriptive titles

## What do you want to build?

The Router component (`packages/pwa/src/components/Router.tsx`) wraps its
content in an `aria-live="polite"` region, but route changes do not produce an
explicit announcement. When the entire view swaps (e.g., from DeckInput to
DeckEditor to Game), the screen reader may not announce what happened — the
user just hears silence or a flood of new content.

Enhance the Router to:

1. Announce route changes via a dedicated screen-reader-only live region
2. Move focus to the `<main>` element of the new view
3. Update `document.title` to reflect the current route

## Acceptance Criteria

- [ ] When navigating between routes, a screen reader announcement is made
      (e.g., "Navigated to Deck Input", "Navigated to Game")
- [ ] The announcement uses `aria-live="assertive"` with a visually hidden
      element (not the existing `aria-live="polite"` wrapper, which would
      announce all content changes)
- [ ] Focus moves to the `<main>` element (or skip-link target) after route
      change
- [ ] `document.title` updates to reflect the current view
- [ ] A vitest test validates the announcement text and title update on route
      change
- [ ] No regressions in existing Router tests

## Implementation Notes (Optional)

### Announcement pattern

Add a `useEffect` in `Router.tsx` that fires on `route` changes:

```tsx
const ROUTE_LABELS: Record<Route, string> = {
  '#/input': 'Deck Input',
  '#/editor': 'Deck Editor',
  '#/app': 'Game',
};

const [announcement, setAnnouncement] = useState('');

useEffect(() => {
  const label = ROUTE_LABELS[route];
  setAnnouncement(`Navigated to ${label}`);
  document.title = `${label} — Scryglass`;

  // Move focus to main content
  const main = document.getElementById('main-content');
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus();
  }
}, [route]);
```

And in the JSX:

```tsx
<>
  <div class="sr-only" role="status" aria-live="assertive" aria-atomic="true">
    {announcement}
  </div>
  <div aria-label="Application view">
    {view}
  </div>
</>
```

### Why not just use the existing `aria-live="polite"` wrapper?

The current wrapper announces **all** content changes within the view, which
would be excessively verbose. A dedicated announcement region allows a brief,
targeted message when the route changes, without interfering with content
updates within a view.

### ADR-009 reference

ADR-009 (Client-Side Routing) explicitly mentions "manages focus and
`aria-live` announcements on navigation" as a feature. This ticket implements
that stated intent.

Files to modify:

- `packages/pwa/src/components/Router.tsx`
- `packages/pwa/src/components/__tests__/Router.test.tsx`
- `packages/pwa/src/assets/styles.css` (if `.sr-only` class is missing — it
  already exists)
