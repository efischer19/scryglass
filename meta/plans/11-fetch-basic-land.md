# Ticket 11: Fetch Basic Land

## What do you want to build?

Implement the "Fetch Land" action button that allows a player to search their library for a basic land card, extract it, and then automatically shuffle the library. This simulates fetch lands and other "search for a basic land" effects in MTG.

## Acceptance Criteria

- [ ] Each player zone has a "Fetch Land" button, enabled only during the `'playing'` phase
- [ ] Clicking "Fetch Land" opens a modal that presents the 5 basic land types: Plains, Island, Swamp, Mountain, Forest
- [ ] Each land type button shows how many copies remain in the library (e.g., "Mountain (3)")
- [ ] Land types with 0 copies remaining are disabled
- [ ] Selecting a land type extracts the first matching card from the library (matching `cardType` containing `Basic Land` and the specific land subtype)
- [ ] The extracted card is displayed in the card display area
- [ ] After extraction, the library is automatically shuffled using the shuffle engine (Ticket 03)
- [ ] The library card count updates to reflect the removal
- [ ] A confirmation gate asks: "Fetch [Land Type] from Player A's library?" before executing
- [ ] If no basic lands of any type remain, the modal shows "No basic lands remaining" and provides a close button
- [ ] Unit test: fetch removes the correct land and reduces library size by 1
- [ ] Unit test: library is shuffled after fetch (verify order changes, or mock the shuffle call)

## Implementation Notes (Optional)

The basic land matching logic: a card is a basic land if `cardType.toLowerCase()` includes both `basic` and `land`. The specific subtype is matched against the card name (e.g., card name "Mountain" or card type containing "Mountain").

Variants such as snow-covered basics (e.g., "Snow-Covered Mountain") or Wastes should also be findable. Match on the land subtype in the type line or name, not just exact card name equality.

**References:** Ticket 03 (Shuffle), Ticket 04 (State Manager — `removeCardByName`), Ticket 05 (UI Shell)
