# Accessibility Audit Epic — Executive Summary

> **Epic:** Perform Accessibility Audit & Remediation before v0.1 Launch
> **Source:** `meta/plans/accessibility-audit.md`
> **Date:** 2026-04-05
> **Relevant ADRs:** ADR-002 (UI Framework), ADR-009 (Client-Side Routing)

## Current State

The Scryglass PWA has **strong accessibility foundations**. A thorough audit
against the checklist in `meta/plans/accessibility-audit.md` reveals that many
WCAG 2.2 AA requirements are already met:

### Passing (no changes needed)

| Audit Item | Status |
| :--------- | :----- |
| 1.1 — Card images have `alt` text (card name) | ✅ Pass |
| 1.1 — Decorative images use `alt=""` / `role="presentation"` | ✅ Pass |
| 1.1 — Icon-only buttons have `aria-label` | ✅ Pass |
| 1.2 — No audio/video content | ✅ N/A |
| 1.3 — Landmark regions (`<main>`, `<header>`, `<section>`) | ✅ Pass |
| 1.3 — Headings follow logical hierarchy | ✅ Pass |
| 2.1 — All interactive elements reachable via Tab | ✅ Pass |
| 2.1 — No keyboard traps (modals have focus-trap + Escape) | ✅ Pass |
| 2.1 — Modals support Escape to close | ✅ Pass |
| 2.1 — ScryModal, TutorModal, FetchLandModal keyboard-navigable | ✅ Pass |
| 2.2 — No time-limited interactions | ✅ Pass |
| 2.2 — Background prefetch does not gate user actions | ✅ Pass |
| 2.3 — No flashing content | ✅ Pass |
| 2.3 — No auto-playing animations | ✅ Pass |
| 2.4 — Link/button purpose clear from text or `aria-label` | ✅ Pass |
| 2.5 — Drag-and-drop has keyboard alternatives (N/A) | ✅ N/A |
| 3.1 — `<html lang="en">` is set | ✅ Pass |
| 3.2 — No unexpected context changes on input | ✅ Pass |
| 3.3 — Form errors identified and described in text | ✅ Pass |
| 3.3 — Errors associated via `aria-describedby` | ✅ Pass |
| 3.3 — Deck import errors indicate line number and problem | ✅ Pass |
| 4.1 — ARIA attributes used correctly | ✅ Pass |
| 4.1 — Dynamic changes announced via `aria-live` | ✅ Pass |
| 4.1 — Modals expose `role="dialog"` + `aria-modal="true"` | ✅ Pass |

### Needs Work (tickets below)

| Audit Item | Priority | Ticket |
| :--------- | :------- | :----- |
| 2.4 — Focus visible on all interactive elements | P0 | #01 |
| 4.1 — HTML valid / well-formed (PWA shell) | P1 | #02 |
| 1.4 — UI component contrast (disabled states) | P1 | #03 |
| 2.1 — DeckEditor card list keyboard interaction | P1 | #04 |
| 2.4 — Skip-to-content link available | P2 | #02 |
| 2.4 — Pages have descriptive `<title>` | P2 | #02 |
| 1.3 — Reading order matches visual order (verify) | P2 | #05 |
| 1.4 — Color-alone distinction (Player A vs B) | P2 | #03 |
| 3.1 — Abbreviations expanded | P3 | #05 |
| 3.2 — Form inputs have visible labels (verify) | P2 | #05 |
| 1.4 — Text resizable to 200% without loss | P3 | #07 |
| 1.4 — Tap-to-zoom intuitive and accessible | P3 | #07 |
| 2.5 — Touch targets ≥ 44×44px | P2 | #07 |
| 2.5 — Player zone separation prevents accidental taps | P2 | #07 |

### Needs Manual Testing (cannot be verified by automated tools)

| Audit Item | Ticket |
| :--------- | :----- |
| Screen reader (VoiceOver/NVDA/TalkBack) | #07 |
| Keyboard-only complete walkthrough | #07 |
| 200% browser zoom | #07 |
| High contrast / forced-colors mode | #07 |
| Phone lying flat, bright lighting | #07 |
| Player zone visibility & accidental taps | #07 |
| Fast card operations (rapid draw) | #07 |
| Route change announcements to screen readers | #06 |

## Ticket Sequence

The tickets are ordered by dependency and priority:

| # | Title | Priority | Depends On |
| :-- | :---- | :------- | :--------- |
| 01 | Add focus indicators to all interactive elements | P0 | — |
| 02 | PWA shell accessibility improvements | P1 | — |
| 03 | Color contrast & non-color distinction | P1 | — |
| 04 | DeckEditor card list keyboard interaction | P1 | — |
| 05 | Expand vitest-axe regression coverage to all components | P1 | 01–04 |
| 06 | Router route-change screen reader announcements | P2 | — |
| 07 | Manual accessibility testing & tabletop scenarios | P2 | 01–06 |
| 08 | Lighthouse a11y audit & Playwright E2E a11y tests | P3 | 05, 07 |

## Estimated Effort

- **Tickets 01–04**: Small — CSS/HTML/component changes, ~1–2 hours each
- **Ticket 05**: Medium — add axe tests to ~10 components, ~3–4 hours
- **Ticket 06**: Small — router announcement enhancement, ~1 hour
- **Ticket 07**: Medium — manual testing checklist, requires device access, ~4 hours
- **Ticket 08**: Medium — Playwright integration + CI, ~4 hours

**Total estimated effort:** ~18–22 hours

## ADR Consideration

No new ADR is required. The accessibility approach is an implementation concern
within the existing architectural decisions:

- **ADR-002** (Preact + Vite) already supports accessible component patterns
- **ADR-009** (Hash-based routing) acknowledges `aria-live` announcements
- **ADR-011** (E2E testing) provides the framework for Playwright a11y tests

If manual testing reveals that accessibility requires a fundamentally different
UI framework or routing approach, a new ADR should be proposed at that time.
