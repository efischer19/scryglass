# Ticket 06: CSV Uploader & Default Decks

## What do you want to build?

Add the ability for users to load decks into the app — either by uploading a `.csv` file or by selecting from hardcoded default deck lists. This connects the CSV parser (Ticket 02) to the UI (Ticket 05) and the state manager (Ticket 04).

## Acceptance Criteria

- [ ] A "Load Decks" button in the header opens a deck loading modal/panel
- [ ] The modal presents two options per player: "Upload CSV" and "Use Default Deck"
- [ ] The "Upload CSV" option opens a file picker that accepts only `.csv` files
- [ ] After file selection, the CSV is parsed using the parser from Ticket 02
- [ ] Parsing errors are displayed inline with the row number and reason (not a generic "invalid file" message)
- [ ] The "Use Default Deck" option presents a dropdown of at least 2 default decks (e.g., "Red Aggro Starter" and "Green Ramp Starter")
- [ ] Default deck data is embedded in a `src/scripts/default-decks.js` module as CSV strings or card arrays
- [ ] After both players have loaded decks, the decks are shuffled (using Ticket 03's shuffle engine) and the game transitions to the mulligan phase
- [ ] The UI prevents starting the game until both players have a loaded deck
- [ ] The library card count in each player zone updates to reflect the loaded deck size
- [ ] A confirmation gate asks "Are you sure?" before replacing a previously loaded deck

## Implementation Notes (Optional)

Use the `FileReader` API to read the uploaded CSV file as text. The default decks should include a variety of card types to exercise the mulligan logic in testing.

Example default deck structure (60 cards, typical casual):

- 24 Basic Lands
- 20 Creatures
- 10 Instants/Sorceries
- 6 Other spells

**References:** Ticket 02 (CSV Parser), Ticket 04 (State Manager), Ticket 05 (UI Shell)
