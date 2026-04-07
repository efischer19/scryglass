# Example Deck Lists

Place deck list files in this directory using the scryglass semicolon-delimited format.

## Format

Each row represents **one card copy** — use multiple rows for multiple copies of the same card (e.g., four copies of Lightning Bolt require four separate rows):

```text
card_name;set_code;collector_number;card_type
```

- **Separator:** Semicolon (`;`)
- **`card_name`:** Display name (not validated against Scryfall)
- **`set_code`:** The set code (e.g., `ltc`, `ltr`, `m21`)
- **`collector_number`:** Collector number within the set (e.g., `498`, `715`)
- **`card_type`:** One of `land`, `nonland`, or `commander` (case-insensitive)

See [ADR-006](../../meta/adr/ADR-006-deck_import_format.md) for the full parsing specification.

## Example

```text
Galadriel, Light of Valinor;LTC;498;commander
Island;LTR;715;land
Andúril, Flame of the West;LTR;687;nonland
```

## Notes

- A header row starting with `card_name` is optional and will be skipped if present.
- Commander cards are recognized but excluded from the shuffleable deck.
- Card images are fetched from Scryfall using `set_code`, `collector_number`, and language (`en` by default).
