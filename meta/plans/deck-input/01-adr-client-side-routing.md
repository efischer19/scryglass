# feat: ADR — client-side routing strategy

## What do you want to build?

Propose and accept an ADR that defines how scryglass navigates between distinct
views (at minimum: the **deck input page** and the **main app/shuffler page**).

The issue calls for `scryglass/app` and `scryglass/input` as separate paths,
but alternatives (hash-based routing, tab/modal pattern, etc.) should be
evaluated. The decision must account for:

- Static PWA hosting on S3 (no server-side routing)
- Accessibility (focus management on navigation, screen-reader announcements)
- Deep-linking and browser back-button expectations
- Preact + Vite build constraints (ADR-002)

## Acceptance Criteria

- [ ] A new ADR document exists at `meta/adr/ADR-009-client_side_routing.md` (or next available number) with status `Proposed`
- [ ] The ADR evaluates at least three options: (a) hash-based routing (`#/input`, `#/app`), (b) a lightweight client-side router library (e.g., `preact-router`), (c) tab/panel UI within a single page
- [ ] The ADR addresses S3 static hosting constraints (no server rewrites)
- [ ] The ADR addresses accessibility: focus management, `aria-live` announcements, and keyboard navigation across views
- [ ] The ADR addresses deep-linking and shareable URLs
- [ ] The chosen option is justified against the project's development philosophy (simplicity, YAGNI, static-first)

## Implementation Notes (Optional)

- Hash-based routing (`window.location.hash`) is the simplest option that works
  on S3 without server configuration, but may feel less "native."
- `preact-router` is a minimal dependency (~1.5 KB) and integrates cleanly with
  Preact, but adds a dependency where vanilla hash listeners might suffice.
- A tab/panel UI avoids routing entirely but makes deep-linking impossible and
  may not satisfy the issue's preference for separate paths.
- Whichever option is chosen, the ADR should specify how the `LOAD_DECK` action
  (ADR-005) triggers the transition from input view to shuffler view.
- Review ADR-002 (Preact + Vite) to ensure compatibility with the chosen
  routing approach.
