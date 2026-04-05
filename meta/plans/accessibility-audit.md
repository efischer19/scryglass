# Accessibility Audit Plan

> **Status:** Draft — to be executed before Scryglass v0.1 public launch

## Goal

Ensure Scryglass meets WCAG 2.2 AA standards (with AAA where practical), is operable by assistive technology (screen readers, refreshable braille displays, screen magnifiers), and is usable by the widest possible audience in a tabletop gaming context.

## Audit Checklist

### 1. Perceivable

#### 1.1 Text Alternatives

- [ ] All card images have descriptive `alt` text (card name, at minimum)
- [ ] Decorative images (backgrounds, dividers) use `alt=""` or `role="presentation"`
- [ ] Icon-only buttons have `aria-label` attributes

#### 1.2 Time-Based Media

- [ ] N/A — Scryglass has no audio/video content

#### 1.3 Adaptable

- [ ] Content is presented in a meaningful sequence when linearized (CSS removed)
- [ ] Reading order matches visual order in the DOM
- [ ] Landmark regions are used (`<main>`, `<nav>`, `<header>`, `<footer>`)
- [ ] Headings follow a logical hierarchy (`h1` → `h2` → `h3`)

#### 1.4 Distinguishable

- [ ] Text color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] UI component contrast meets 3:1 against adjacent colors
- [ ] Text can be resized to 200% without loss of content or functionality
- [ ] No information is conveyed by color alone (e.g., Player A vs. Player B distinction)
- [ ] Tap-to-zoom on card images is intuitive and accessible

### 2. Operable

#### 2.1 Keyboard Accessible

- [ ] All interactive elements are reachable via Tab key
- [ ] Focus order is logical and matches visual layout
- [ ] No keyboard traps (user can always Tab away from any component)
- [ ] Custom components (modals, dropdowns) support Escape to close
- [ ] ScryModal, TutorModal, and FetchLandModal are keyboard-navigable

#### 2.2 Enough Time

- [ ] No time-limited interactions (users can take as long as needed)
- [ ] Background prefetch does not interrupt or time-gate user actions

#### 2.3 Seizures and Physical Reactions

- [ ] No flashing content (>3 flashes per second)
- [ ] No auto-playing animations that can't be paused

#### 2.4 Navigable

- [ ] Pages have descriptive `<title>` elements
- [ ] Focus is visible on all interactive elements (no `outline: none` without replacement)
- [ ] Skip-to-content link is available (or single-page layout makes it unnecessary)
- [ ] Link/button purpose is clear from text or `aria-label`

#### 2.5 Input Modalities

- [ ] Touch targets are at least 44×44 CSS pixels (WCAG 2.5.8 Target Size)
- [ ] Multi-player UI (Player A / Player B zones) has adequate separation to prevent accidental taps
- [ ] Drag-and-drop interactions (if any) have keyboard alternatives

### 3. Understandable

#### 3.1 Readable

- [ ] `<html lang="en">` is set
- [ ] Card names and game terms use consistent vocabulary
- [ ] Abbreviations are expanded on first use or via `<abbr>` tags

#### 3.2 Predictable

- [ ] Navigation is consistent across views (DeckInput → Editor → Game)
- [ ] Form inputs have visible labels (not just placeholders)
- [ ] No unexpected context changes on input

#### 3.3 Input Assistance

- [ ] Form errors are identified and described in text
- [ ] Error messages are associated with the relevant input via `aria-describedby`
- [ ] Deck import errors clearly indicate the line number and problem

### 4. Robust

#### 4.1 Compatible

- [ ] HTML is valid and well-formed (passes HTML validator)
- [ ] ARIA attributes are used correctly (`aria-label`, `role`, `aria-live`)
- [ ] Dynamic content changes announce to screen readers via `aria-live` regions
- [ ] Custom components expose correct ARIA roles (e.g., modal → `role="dialog"`, `aria-modal="true"`)

## Tools & Testing Methodology

### Automated Testing

| Tool | Purpose |
| :--- | :------ |
| **vitest-axe** (already installed) | Component-level a11y assertions in unit tests |
| **Lighthouse** (Chrome DevTools) | Overall accessibility score and audits |
| **axe DevTools** (browser extension) | In-browser accessibility scanning |
| **WAVE** (web accessibility evaluator) | Alternative automated scanning |

### Manual Testing

| Method | Purpose |
| :----- | :------ |
| **VoiceOver** (macOS/iOS) | Screen reader testing on Apple devices |
| **NVDA** (Windows) | Screen reader testing on Windows |
| **TalkBack** (Android) | Screen reader testing on Android |
| **Keyboard-only navigation** | Verify all features work without a mouse/touch |
| **200% zoom** | Verify layout at 200% browser zoom |
| **High contrast mode** | Verify visibility in forced-colors mode |

### Tabletop-Specific Testing

| Scenario | Validation |
| :------- | :--------- |
| Phone lying flat on table | Text readable at arm's length; buttons tappable with finger |
| Bright overhead lighting | Screen content visible without glare issues |
| Player A viewing Player B's zone | No accidental information leakage (hidden cards remain hidden) |
| Fast card operations (rapid draw) | UI remains responsive; no misfire on adjacent buttons |

## Priority Fixes (To Be Identified During Audit)

Issues will be categorized by severity:

- **P0 — Blocker:** Prevents assistive technology users from playing (e.g., unlabeled buttons, keyboard traps)
- **P1 — Critical:** Significantly degrades experience (e.g., poor contrast, missing `alt` text)
- **P2 — Moderate:** Inconvenient but workable (e.g., suboptimal focus order, verbose screen reader output)
- **P3 — Enhancement:** Best-practice improvements (e.g., AAA contrast, semantic improvements)

## Success Criteria

- [ ] Zero P0 issues remain
- [ ] All P1 issues are resolved or have tracked tickets
- [ ] Lighthouse accessibility score ≥ 90
- [ ] Manual screen reader testing completed on at least one platform
- [ ] All interactive components are keyboard-accessible
