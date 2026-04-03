# Ticket 05: Two-Player Pod UI Shell

## What do you want to build?

Create the main application layout in `src/index.html` and `src/assets/styles.css` that clearly delineates **Player A** and **Player B** zones. This is the visual foundation that all subsequent UI tickets build upon.

The layout must make it unmistakably clear which player's library is being interacted with at all times. Each player zone displays the library card count and houses the action buttons (Draw, Scry, Tutor, Fetch) that will be wired up in later tickets.

## Acceptance Criteria

- [ ] The page is divided into two visually distinct player zones (Player A and Player B)
- [ ] Each zone is clearly labeled with the player name and uses a distinct color accent (e.g., blue for Player A, red for Player B)
- [ ] Each zone displays the current library card count (placeholder `0` until decks are loaded)
- [ ] Each zone contains placeholder action buttons: "Draw", "Fetch Land", "Tutor", "Scry" (disabled/greyed out until the game is in the `'playing'` phase)
- [ ] A shared top bar or header displays the app name ("Scryglass") and a "New Game" / "Load Decks" button
- [ ] The layout is responsive — usable on both a tablet in landscape and a phone in portrait
- [ ] All interactive elements have appropriate `aria-label` attributes
- [ ] Color contrast ratios meet WCAG AA standards
- [ ] A central "card display" area (or per-player overlay) exists for showing card images when drawn/tutored (shows a placeholder state initially)
- [ ] The page uses semantic HTML (`<main>`, `<section>`, `<header>`, `<button>`)

## Implementation Notes (Optional)

The exact framework/approach depends on the outcome of [ADR-002](../../meta/adr/ADR-002-ui_framework_choice.md). If vanilla JS is chosen, this ticket creates the static HTML structure and CSS. If a framework is chosen, this ticket creates the root component(s).

Consider a layout like:

```text
┌─────────────────────────────────────────┐
│              Scryglass                  │
│           [Load Decks]                  │
├───────────────────┬─────────────────────┤
│    Player A       │     Player B        │
│  Cards: 93        │   Cards: 88         │
│                   │                     │
│ [Draw] [Fetch]    │  [Draw] [Fetch]     │
│ [Tutor] [Scry]    │  [Tutor] [Scry]     │
│                   │                     │
│  ┌─Card Display─┐ │  ┌─Card Display─┐  │
│  │              │ │  │              │  │
│  └──────────────┘ │  └──────────────┘  │
└───────────────────┴─────────────────────┘
```

Use CSS custom properties for player accent colors to keep theming centralized.

**References:** [ADR-002: UI Framework Choice](../../meta/adr/ADR-002-ui_framework_choice.md), [ADR-005: Client-Side State Management](../../meta/adr/ADR-005-client_state_management.md)
