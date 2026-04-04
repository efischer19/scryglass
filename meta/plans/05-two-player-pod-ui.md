# Ticket 05: Two-Player Pod UI Shell

## What do you want to build?

Create the root Preact component tree in `@scryglass/pwa` (`packages/pwa/src/`) that renders the two-player pod layout. This is the visual foundation that all subsequent UI tickets build upon — every game action, card display, and deck-loading flow mounts inside this shell.

The layout must make it unmistakably clear which player's library is being interacted with at all times. Each player zone reads its `library.length` from `@scryglass/core`'s `GameState` (via `dispatch()`) and houses the action buttons (Draw, Scry, Tutor, Fetch) that will be wired up in later tickets.

## Acceptance Criteria

### Component Structure

- [ ] An `<App />` root component is exported from `packages/pwa/src/components/App.tsx` and serves as the application entry point
- [ ] A `<Header />` component (`packages/pwa/src/components/Header.tsx`) renders the app name ("Scryglass") and a "Load Decks" button
- [ ] A `<PlayerZone />` component (`packages/pwa/src/components/PlayerZone.tsx`) accepts a `player` prop (`"A" | "B"`) and renders that player's zone
- [ ] A `<CardDisplay />` component (`packages/pwa/src/components/CardDisplay.tsx`) renders a placeholder area for showing card images when drawn/tutored (empty state initially)
- [ ] `<App />` holds `GameState` from `@scryglass/core` in component state and passes the relevant `PlayerState` slice to each `<PlayerZone />`

### Layout & Visual Design

- [ ] The page is divided into two visually distinct player zones (Player A and Player B)
- [ ] Each zone is clearly labeled with the player name and uses a distinct CSS custom property accent color (e.g., `--player-a-accent: #2563eb` blue, `--player-b-accent: #dc2626` red)
- [ ] Each zone displays the current library card count derived from `state.players[player].library.length` (shows `0` until decks are loaded)
- [ ] Each zone contains placeholder action buttons: "Draw", "Fetch Land", "Tutor", "Scry" — disabled when the player's phase is not `'playing'`
- [ ] A per-player `<CardDisplay />` area exists inside each `<PlayerZone />` for showing card images (shows a placeholder state initially)
- [ ] The layout is responsive — side-by-side zones on tablet landscape, stacked zones on phone portrait (mobile-first CSS)
- [ ] CSS custom properties are defined in `packages/pwa/src/assets/styles.css` for player accent colors and shared spacing/typography tokens

### State Integration

- [ ] `<App />` initializes state via `createInitialState()` from `@scryglass/core`
- [ ] State mutations flow through a local `handleDispatch` wrapper that calls `dispatch(state, action)` from `@scryglass/core` and updates component state with the returned `ActionResult.state`
- [ ] Button disabled states are derived from `state.players[player].phase` — buttons are disabled unless phase is `'playing'`

### Accessibility

- [ ] All interactive elements have appropriate `aria-label` attributes (e.g., `aria-label="Draw card from Player A's library"`)
- [ ] Color contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- [ ] The component tree uses semantic HTML (`<main>`, `<section>`, `<header>`, `<button>`)
- [ ] Focus order follows a logical reading sequence: header → Player A zone → Player B zone
- [ ] Automated a11y tests using `vitest-axe` validate each component against WCAG AA

### Testing

- [ ] Component tests (`packages/pwa/src/components/__tests__/`) use `@testing-library/preact` and Vitest
- [ ] Test: `<App />` renders two `<PlayerZone />` components and a `<Header />`
- [ ] Test: `<PlayerZone />` displays the correct library count from `GameState`
- [ ] Test: action buttons are disabled when the player phase is `'loading'` and enabled when phase is `'playing'`
- [ ] Test: `<Header />` renders the app name and "Load Decks" button
- [ ] Test: each component passes `vitest-axe` a11y assertions (`expect(container).toHaveNoViolations()`)

## Implementation Notes (Optional)

All game logic lives in `@scryglass/core` — the PWA components are thin views that read `GameState` and call `dispatch()`. No game rules or card mutations should exist in `packages/pwa/`.

Consider a layout like:

```text
┌─────────────────────────────────────────┐
│  <Header />                             │
│         Scryglass  [Load Decks]         │
├───────────────────┬─────────────────────┤
│ <PlayerZone A />  │ <PlayerZone B />    │
│  Player A         │  Player B           │
│  Cards: 93        │  Cards: 88          │
│                   │                     │
│ [Draw] [Fetch]    │  [Draw] [Fetch]     │
│ [Tutor] [Scry]    │  [Tutor] [Scry]     │
│                   │                     │
│ <CardDisplay />   │  <CardDisplay />    │
│  ┌──────────────┐ │  ┌──────────────┐   │
│  │  (empty)     │ │  │  (empty)     │   │
│  └──────────────┘ │  └──────────────┘   │
└───────────────────┴─────────────────────┘
```

Example component wiring in `<App />`:

```tsx
import { createInitialState, dispatch } from '@scryglass/core';
import type { Action } from '@scryglass/core';
import { useState } from 'preact/hooks';

export function App() {
  const [state, setState] = useState(createInitialState());

  const handleDispatch = (action: Action) => {
    const result = dispatch(state, action);
    setState(result.state);
    return result;
  };

  return (
    <main>
      <Header onLoadDecks={() => { /* Ticket 06 */ }} />
      <div class="pod-layout">
        <PlayerZone player="A" playerState={state.players.A} onDispatch={handleDispatch} />
        <PlayerZone player="B" playerState={state.players.B} onDispatch={handleDispatch} />
      </div>
    </main>
  );
}
```

Use CSS custom properties for theming — accent colors, spacing, and typography should all be tokens so that future tickets don't hard-code values.

**References:** [ADR-002: UI Framework Choice (Preact + Vite)](../../meta/adr/ADR-002-ui_framework_choice.md), [ADR-005: Action/Reducer State Management](../../meta/adr/ADR-005-client_state_management.md), Ticket 04 (game engine / `dispatch`)
