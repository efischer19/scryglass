---
title: "ADR-006: Semicolon-Delimited Deck Import Format"
status: "Proposed"
date: "2026-04-05"
tags:
  - "data-format"
  - "import"
  - "deck-management"
  - "scryfall"
---

## Context

* **Problem:** Scryglass needs a way for users to import their deck lists. The original version of this ADR specified a comma-separated format (`card_name,set_code,card_type,mana_cost`), but real-world use revealed two critical issues: (1) commas appear frequently in MTG card names (e.g., "Galadriel, Light of Valinor"), breaking naive `split(',')` parsing, and (2) the full type line is unnecessary — only the land/nonland distinction matters for the mulligan engine.
* **Constraints:** The app is client-side only — parsing must happen in the browser. The format must be simple enough for casual MTG players to create in a spreadsheet or text editor. Card images are fetched from Scryfall's [`/cards/:set/:number/:lang`](https://scryfall.com/docs/api/cards/collector) endpoint, so each row must supply the `set_code` and `collector_number` needed for that lookup. The `card_type` field is critical because the mulligan engine uses it to count lands.

## Decision

We will support a **single semicolon-delimited import format** with the following specification:

1. **Columns (in order):** `card_name;set_code;collector_number;card_type`
2. **Separator:** Semicolon (`;`). This avoids conflicts with commas in card names.
3. **No header row required** (but if present, a row starting with `card_name` — case-insensitive — will be skipped).
4. **One row per card copy.** A deck with 4 copies of "Lightning Bolt" has 4 rows.
5. **Field definitions:**
    * `card_name` (required, unvalidated): The card name as the user wants it displayed. Not validated against Scryfall — whatever the user provides is stored and shown. Used for display purposes only.
    * `set_code` (required): The set code (e.g., `ltc`, `ltr`, `m21`). Used together with `collector_number` and `lang` to fetch the card image from Scryfall's `/cards/:set/:number/:lang` endpoint.
    * `collector_number` (required): The collector number within the set (e.g., `498`, `715`, `687`). Used together with `set_code` and `lang` to identify the exact card printing on Scryfall.
    * `card_type` (required): One of three values — `land`, `nonland`, or `commander`. Case-insensitive. The mulligan engine uses this to count lands. See "Commander handling" below for special behavior.
6. **Language:** Defaults to `en` (English). This is not a column in the import format — it is a configuration default used when constructing the Scryfall image URL. Documented here for completeness; future work may allow per-card or per-deck language overrides.
7. **Casing:** All field values are parsed case-insensitively. `set_code` and `card_type` are normalized to lowercase internally.
8. **Commander handling:** Rows with `card_type` of `commander` are recognized as valid but are **not included in the shuffleable deck**. The parser emits a warning (not an error) for each commander row, indicating the card was recognized but excluded. This supports Commander/EDH deck lists where the commander exists in the list but is never shuffled into the library.
9. **Validation rules:**
    * Rows with fewer than 4 columns produce a parse error referencing the row number.
    * Empty `card_name`, `set_code`, or `collector_number` fields produce a parse error referencing the row number.
    * Invalid `card_type` values (anything other than `land`, `nonland`, or `commander`, case-insensitive) produce a hard parse error referencing the row number.
    * Commander rows produce a warning (included in the result's `warnings` array) but are not treated as errors.
    * Validation errors are displayed to the user with the failing row number and reason.
10. **Example rows:**

    ```text
    Galadriel, Light of Valinor;LTC;498;commander
    Island;LTR;715;land
    Andúril, Flame of the West;LTR;687;nonland
    ```

11. **Example deck lists:** The `examples/decklists/` directory in the repository root contains sample deck list files in the scryglass format for testing and reference.

## Considered Options

1. **Option 1: 4-Column Semicolon-Delimited Format (Chosen)**
    * *Pros:* Semicolons avoid comma conflicts in card names. Collector number maps directly to Scryfall's image API with no ambiguity. Simplified `card_type` enum (`land`/`nonland`/`commander`) is easy to produce and sufficient for the mulligan engine. No mana cost field to maintain — KISS.
    * *Cons:* Less familiar than comma-separated values. Users must look up collector numbers (but these are printed on every physical card).

2. **Option 2: Original Comma-Separated Format (`card_name,set_code,card_type,mana_cost`)**
    * *Pros:* CSV is universally familiar. Easy to create in spreadsheet apps.
    * *Cons:* Commas in card names (e.g., "Galadriel, Light of Valinor") break naive parsing. Full type line is unnecessary for game logic. `mana_cost` field was unused. Required card name matching against Scryfall, which is fragile.

3. **Option 3: MTGO/Arena Text Format (`4 Lightning Bolt (M21)`)**
    * *Pros:* Familiar to competitive players. Widely used in deck-sharing sites.
    * *Cons:* Does not include `card_type` or `collector_number`. Would require additional Scryfall API calls per unique card to fetch type data and resolve collector numbers, adding load time and API usage.

4. **Option 4: JSON Format**
    * *Pros:* Structured, supports nested data, no delimiter issues.
    * *Cons:* Much harder for casual users to create or edit by hand. Overkill for a flat list of cards.

## Consequences

* **Positive:** The format is simple, human-readable, and contains exactly the data the app needs: a display name, Scryfall image lookup keys (`set_code` + `collector_number`), and land/nonland classification. No additional API lookups are needed at import time beyond image fetching. Commander cards are gracefully handled.
* **Negative:** Users must prepare their deck lists in this specific format, including looking up collector numbers. The semicolon delimiter is less conventional than commas.
* **Future Implications:** Conversion utilities from popular deck list formats (MTGO/Arena text, Moxfield export, etc.) to scryglass format would be valuable follow-up work — each converter would be a separate ticket. The scryglass format remains the canonical, self-contained format that the parser consumes.
