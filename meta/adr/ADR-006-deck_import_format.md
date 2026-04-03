---
title: "ADR-006: CSV Deck Import Format"
status: "Proposed"
date: "2026-04-03"
tags:
  - "data-format"
  - "import"
  - "deck-management"
---

## Context

* **Problem:** Scryglass needs a way for users to import their deck lists. The issue specifies a CSV format: `card_name,set_code,card_type,mana_cost`. We need to formalize this format, define validation rules, and decide whether to support alternatives.
* **Constraints:** The app is client-side only — parsing must happen in the browser. The format must be simple enough for casual MTG players to create in a spreadsheet or text editor. The `card_type` field is critical because the mulligan engine uses it to count lands.

## Decision

We will support a **single CSV import format** with the following specification:

1. **Columns (in order):** `card_name,set_code,card_type,mana_cost`
2. **No header row required** (but if present, a row starting with `card_name` will be skipped).
3. **One row per card copy.** A deck with 4 copies of "Lightning Bolt" has 4 rows.
4. **Field definitions:**
    * `card_name` (required): The English card name, matching Scryfall's naming.
    * `set_code` (required): The 3–5 character set code (e.g., `m21`, `mh2`). Used with `card_name` to look up the specific printing on Scryfall.
    * `card_type` (required): The full type line (e.g., `Basic Land — Mountain`, `Creature — Goblin`). The mulligan engine checks for the substring `Land` to identify land cards.
    * `mana_cost` (optional): The mana cost string (e.g., `{1}{R}`, `{2}{U}{U}`). Displayed in the UI but not used for game logic in the initial release.
5. **Validation:** The parser will reject files with fewer than 3 columns per row, empty `card_name` or `set_code` fields, or files with zero valid rows. Validation errors will be displayed to the user with the failing row number and reason.
6. **Default Decks:** Two hardcoded default deck lists will be provided as embedded CSV data for quick testing and demo purposes.

## Considered Options

1. **Option 1: Simple 4-Column CSV (Chosen)**
    * *Pros:* Dead simple to create in any spreadsheet app or text editor. No quoting issues for typical MTG card names. Easy to parse with `String.split(',')`. All fields needed by the app are present.
    * *Cons:* Card names with commas (very rare in MTG) would break naive parsing. No support for quantity shorthand (e.g., `4x Lightning Bolt`).

2. **Option 2: MTGO/Arena Text Format (`4 Lightning Bolt (M21)`))**
    * *Pros:* Familiar to competitive players. Widely used in deck-sharing sites.
    * *Cons:* Does not include `card_type`, which is essential for the mulligan engine. Would require an additional Scryfall API call per unique card to fetch type data, adding load time and API usage.

3. **Option 3: JSON Format**
    * *Pros:* Structured, supports nested data, no delimiter issues.
    * *Cons:* Much harder for casual users to create or edit by hand. Overkill for a flat list of cards.

## Consequences

* **Positive:** The format is simple, human-readable, and contains all data the app needs without additional API lookups at import time. Default decks provide an instant onboarding experience.
* **Negative:** Users must prepare their deck lists in this specific format. Card names with commas (extremely rare) may require special handling.
* **Future Implications:** If demand arises, a future ticket could add MTGO/Arena format support as a secondary parser that supplements missing fields via Scryfall API lookups. The CSV format remains the canonical, self-contained format.
