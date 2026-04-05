# Ticket 02 — PWA Shell Accessibility Improvements

> **Priority:** P1 — Critical
> **WCAG Criteria:** 2.4.1 Bypass Blocks (A), 2.4.2 Page Titled (A),
> 4.1.1 Parsing (A)
> **Audit Items:** 2.4 — Skip-to-content link, descriptive `<title>`;
> 4.1 — HTML valid / well-formed

## What do you want to build?

The PWA HTML shell (`packages/pwa/index.html`) is minimal and missing several
baseline accessibility features. The `src/index.html` static site already
implements these correctly and can serve as a reference.

### Missing items

1. **Skip-to-content link** — Keyboard users navigating the app have no way to
   bypass the header and jump directly to the main content area. The static
   site has a `<a href="#main-content" class="skip-link">` that should be
   replicated in the PWA.

2. **Descriptive `<title>`** — The current `<title>Scryglass</title>` is
   acceptable, but it should dynamically update (or include a description) to
   reflect the current view (e.g., "Deck Input — Scryglass",
   "Game — Scryglass"). At minimum, add a `<meta name="description">` tag.

3. **`<meta name="description">`** — Missing entirely. Add a brief description
   for search engines and assistive tech.

## Acceptance Criteria

- [ ] A visually hidden skip-to-content link is the first focusable element in
      the PWA (`<a href="#main-content" class="skip-link">Skip to main
      content</a>`)
- [ ] The skip link becomes visible when focused (matching the pattern in
      `src/assets/styles.css`)
- [ ] Each `<main>` element rendered by `App.tsx` has `id="main-content"` so
      the skip link target works
- [ ] `packages/pwa/index.html` includes a `<meta name="description">` tag
- [ ] The `<title>` element updates based on the current route (e.g.,
      "Deck Input — Scryglass", "Deck Editor — Scryglass", "Game — Scryglass")
      via `document.title` in Router.tsx, or at minimum a static descriptive
      title is set
- [ ] HTML passes the W3C HTML validator with zero errors
- [ ] A vitest-axe test validates the PWA shell structure

## Implementation Notes (Optional)

### Skip link

Add to `packages/pwa/index.html` just inside `<body>`:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

Or, since the app is Preact-rendered, add it as the first child of the `App`
component:

```tsx
<a href="#main-content" class="skip-link">Skip to main content</a>
```

The `.skip-link` CSS class should be:

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 0.5rem 1rem;
  background: var(--color-surface);
  color: var(--color-text);
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Dynamic title

In `Router.tsx`, add a `useEffect` that updates `document.title`:

```tsx
const ROUTE_TITLES: Record<Route, string> = {
  '#/input': 'Deck Input — Scryglass',
  '#/editor': 'Deck Editor — Scryglass',
  '#/app': 'Game — Scryglass',
};

useEffect(() => {
  document.title = ROUTE_TITLES[route];
}, [route]);
```

Files to modify:

- `packages/pwa/index.html`
- `packages/pwa/src/components/App.tsx` (or Router.tsx)
- `packages/pwa/src/assets/styles.css`
