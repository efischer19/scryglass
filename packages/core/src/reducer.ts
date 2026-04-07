import { ActionSchema } from './schemas/action.js';
import type { Action, ActionResult } from './schemas/action.js';
import type { GameState, HistoryEntry } from './schemas/state.js';
import type { Card } from './schemas/card.js';
import { shuffle, cryptoRandomInt } from './shuffle.js';
import { isBasicLandOfType } from './helpers/lands.js';

/**
 * Create the initial game state with two players in the `loading` phase.
 */
export function createInitialState(): GameState {
  return {
    players: {
      A: { library: [], phase: 'loading', mulliganHand: [], mulliganCount: 0 },
      B: { library: [], phase: 'loading', mulliganHand: [], mulliganCount: 0 },
    },
    settings: {
      allowMulliganWith2or5Lands: false,
    },
    history: [],
  };
}

/**
 * Build a human-readable history entry for a dispatched action.
 */
function buildHistoryEntry(action: Action, result: ActionResult): HistoryEntry {
  const player = action.payload.player as 'A' | 'B';
  const cards: Card[] = [];

  if (result.card) {
    cards.push(result.card);
  }
  if (result.cards && result.cards.length > 0) {
    for (const c of result.cards) {
      if (!cards.some(existing => existing.name === c.name && existing.setCode === c.setCode && existing.collectorNumber === c.collectorNumber)) {
        cards.push(c);
      }
    }
  }

  let description: string;
  switch (action.type) {
    case 'LOAD_DECK':
      description = `Player ${player} loaded a deck (${action.payload.cards.length} cards)`;
      break;
    case 'SHUFFLE_LIBRARY':
      description = `Player ${player} shuffled their library`;
      break;
    case 'DRAW_CARD':
      description = `Player ${player} drew a card`;
      break;
    case 'RETURN_TO_LIBRARY':
      description = `Player ${player} returned ${action.payload.card.name} to ${action.payload.position} of library`;
      break;
    case 'DEAL_OPENING_HAND':
      description = `Player ${player} was dealt an opening hand`;
      break;
    case 'MULLIGAN':
      description = `Player ${player} took a mulligan`;
      break;
    case 'KEEP_HAND':
      description = `Player ${player} kept their hand`;
      break;
    case 'SCRY_RESOLVE': {
      const count = action.payload.decisions.length;
      description = `Player ${player} resolved scry (${count} card${count !== 1 ? 's' : ''})`;
      break;
    }
    case 'FETCH_BASIC_LAND':
      description = `Player ${player} fetched a ${action.payload.landType}`;
      break;
    case 'TUTOR_CARD':
      description = `Player ${player} tutored for ${action.payload.cardName}`;
      break;
  }

  const entry: HistoryEntry = { actionType: action.type, player, description };
  if (cards.length > 0) {
    entry.cards = cards;
  }
  return entry;
}

function handleLoadDeck(state: GameState, action: Extract<Action, { type: 'LOAD_DECK' }>): ActionResult {
  const { player, cards } = action.payload;
  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library: [...cards],
          phase: 'mulligan' as const,
        },
      },
    },
    card: null,
  };
}

function handleShuffleLibrary(state: GameState, action: Extract<Action, { type: 'SHUFFLE_LIBRARY' }>): ActionResult {
  const { player } = action.payload;
  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library: shuffle(state.players[player].library),
        },
      },
    },
    card: null,
  };
}

function handleDrawCard(state: GameState, action: Extract<Action, { type: 'DRAW_CARD' }>): ActionResult {
  const { player } = action.payload;
  const library = state.players[player].library;

  if (library.length === 0) {
    throw new Error(
      `Cannot draw: Player ${player}'s library is empty (0 cards remaining)`,
    );
  }

  const [drawn, ...rest] = library;
  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library: rest,
        },
      },
    },
    card: drawn,
  };
}

function handleReturnToLibrary(state: GameState, action: Extract<Action, { type: 'RETURN_TO_LIBRARY' }>): ActionResult {
  const { player, card, position } = action.payload;
  const library = [...state.players[player].library];

  switch (position) {
    case 'top':
      library.unshift(card);
      break;
    case 'bottom':
      library.push(card);
      break;
    case 'random': {
      const index = cryptoRandomInt(library.length + 1);
      library.splice(index, 0, card);
      break;
    }
  }

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library,
        },
      },
    },
    card: null,
  };
}

function requireMulliganPhase(state: GameState, player: 'A' | 'B', actionType: string): void {
  if (state.players[player].phase !== 'mulligan') {
    throw new Error(
      `Cannot ${actionType}: Player ${player} is in '${state.players[player].phase}' phase, but must be in 'mulligan' phase`,
    );
  }
}

function handleDealOpeningHand(state: GameState, action: Extract<Action, { type: 'DEAL_OPENING_HAND' }>): ActionResult {
  const { player } = action.payload;
  requireMulliganPhase(state, player, 'DEAL_OPENING_HAND');

  const library = state.players[player].library;
  const dealCount = Math.min(7, library.length);

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          mulliganHand: library.slice(0, dealCount),
          library: library.slice(dealCount),
        },
      },
    },
    card: null,
  };
}

function handleMulligan(state: GameState, action: Extract<Action, { type: 'MULLIGAN' }>): ActionResult {
  const { player } = action.payload;
  requireMulliganPhase(state, player, 'MULLIGAN');

  const combined = [...state.players[player].mulliganHand, ...state.players[player].library];
  const shuffled = shuffle(combined);
  const dealCount = Math.min(7, shuffled.length);

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library: shuffled.slice(dealCount),
          mulliganHand: shuffled.slice(0, dealCount),
          mulliganCount: state.players[player].mulliganCount + 1,
        },
      },
    },
    card: null,
  };
}

function handleKeepHand(state: GameState, action: Extract<Action, { type: 'KEEP_HAND' }>): ActionResult {
  const { player } = action.payload;
  requireMulliganPhase(state, player, 'KEEP_HAND');

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          mulliganHand: [],
          phase: 'playing' as const,
        },
      },
    },
    card: null,
  };
}

function handleScryResolve(state: GameState, action: Extract<Action, { type: 'SCRY_RESOLVE' }>): ActionResult {
  const { player, decisions } = action.payload;
  const library = state.players[player].library;

  if (decisions.length === 0) {
    throw new Error('SCRY_RESOLVE: decisions array must not be empty');
  }

  // Validate indices — no duplicates, all in range
  const indices = decisions.map(d => d.cardIndex);
  const uniqueIndices = new Set(indices);
  if (uniqueIndices.size !== indices.length) {
    throw new Error('SCRY_RESOLVE: decisions contain duplicate cardIndex values');
  }
  for (const idx of indices) {
    if (idx < 0 || idx >= library.length) {
      throw new Error(
        `SCRY_RESOLVE: cardIndex ${idx} is out of range (library has ${library.length} cards)`,
      );
    }
  }

  // Partition decisions by destination
  const removeDecisions = decisions.filter(d => d.destination === 'remove');
  const bottomDecisions = decisions.filter(d => d.destination === 'bottom');
  const topDecisions = decisions.filter(d => d.destination === 'top');

  // Collect removed cards
  const removedCards = removeDecisions.map(d => library[d.cardIndex]);

  // Build bottom cards in original relative order (sorted by cardIndex ascending)
  const bottomCards = [...bottomDecisions]
    .sort((a, b) => a.cardIndex - b.cardIndex)
    .map(d => library[d.cardIndex]);

  // Build top cards in the order specified by the decisions array
  const topCards = topDecisions.map(d => library[d.cardIndex]);

  // All affected indices
  const affectedIndices = new Set(indices);

  // Remaining library cards (those not affected by scry)
  const remainingLibrary = library.filter((_, i) => !affectedIndices.has(i));

  // New library: top cards first, then remaining, then bottom cards
  const newLibrary = [...topCards, ...remainingLibrary, ...bottomCards];

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library: newLibrary,
        },
      },
    },
    card: removedCards.length > 0 ? removedCards[0] : null,
    cards: removedCards,
  };
}

function handleFetchBasicLand(state: GameState, action: Extract<Action, { type: 'FETCH_BASIC_LAND' }>): ActionResult {
  const { player, landType } = action.payload;
  const library = state.players[player].library;

  const landIndex = library.findIndex(card => isBasicLandOfType(card, landType));

  if (landIndex === -1) {
    throw new Error(`Cannot fetch: no ${landType} found in Player ${player}'s library`);
  }

  const fetchedCard = library[landIndex];
  const remaining = library.filter((_, i) => i !== landIndex);
  const shuffled = shuffle(remaining);

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library: shuffled,
        },
      },
    },
    card: fetchedCard,
  };
}

function handleTutorCard(state: GameState, action: Extract<Action, { type: 'TUTOR_CARD' }>): ActionResult {
  const { player, cardName } = action.payload;
  const library = state.players[player].library;

  const cardIndex = library.findIndex(
    card => card.name.toLowerCase() === cardName.toLowerCase(),
  );

  if (cardIndex === -1) {
    throw new Error(`Cannot tutor: '${cardName}' not found in Player ${player}'s library`);
  }

  const tutoredCard = library[cardIndex];
  const remaining = library.filter((_, i) => i !== cardIndex);
  const shuffled = shuffle(remaining);

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...state.players[player],
          library: shuffled,
        },
      },
    },
    card: tutoredCard,
  };
}

/**
 * Dispatch an action against the current game state, returning a new
 * immutable state and any output (e.g., a drawn card).
 *
 * @see ADR-005: Action/Reducer State Management
 */
export function dispatch(state: GameState, action: Action): ActionResult {
  const parsed = ActionSchema.parse(action);

  let result: ActionResult;
  switch (parsed.type) {
    case 'LOAD_DECK':
      result = handleLoadDeck(state, parsed);
      break;
    case 'SHUFFLE_LIBRARY':
      result = handleShuffleLibrary(state, parsed);
      break;
    case 'DRAW_CARD':
      result = handleDrawCard(state, parsed);
      break;
    case 'RETURN_TO_LIBRARY':
      result = handleReturnToLibrary(state, parsed);
      break;
    case 'DEAL_OPENING_HAND':
      result = handleDealOpeningHand(state, parsed);
      break;
    case 'MULLIGAN':
      result = handleMulligan(state, parsed);
      break;
    case 'KEEP_HAND':
      result = handleKeepHand(state, parsed);
      break;
    case 'SCRY_RESOLVE':
      result = handleScryResolve(state, parsed);
      break;
    case 'FETCH_BASIC_LAND':
      result = handleFetchBasicLand(state, parsed);
      break;
    case 'TUTOR_CARD':
      result = handleTutorCard(state, parsed);
      break;
  }

  const entry = buildHistoryEntry(parsed, result);
  result.state = {
    ...result.state,
    history: [...state.history, entry],
  };

  return result;
}
