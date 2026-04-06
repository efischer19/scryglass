import goodRaw from '../../../../examples/decklists/good.txt?raw';
import evilRaw from '../../../../examples/decklists/evil.txt?raw';
import { parseDeck } from '@scryglass/core';

export const GOOD_DECK_NAME = 'Good';
export const GOOD_DECK_TEXT = goodRaw;
export const GOOD_DECK_CARD_COUNT = parseDeck(goodRaw).cards.length;

export const EVIL_DECK_NAME = 'Evil';
export const EVIL_DECK_TEXT = evilRaw;
export const EVIL_DECK_CARD_COUNT = parseDeck(evilRaw).cards.length;
