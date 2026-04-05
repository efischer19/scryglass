import { ActionSchema } from './schemas/action.js';
import type { Action, ActionResult } from './schemas/action.js';
import type { GameState } from './schemas/state.js';
import { shuffle, cryptoRandomInt } from './shuffle.js';

/**
 * Create the initial game state with two players in the `loading` phase.
 */
export function createInitialState(): GameState {
  return {
    players: {
      A: { library: [], phase: 'loading', mulliganHand: [], mulliganCount: 0 },
      B: { library: [], phase: 'loading', mulliganHand: [], mulliganCount: 0 },
    },
  };
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

/**
 * Dispatch an action against the current game state, returning a new
 * immutable state and any output (e.g., a drawn card).
 *
 * @see ADR-005: Action/Reducer State Management
 */
export function dispatch(state: GameState, action: Action): ActionResult {
  const parsed = ActionSchema.parse(action);

  switch (parsed.type) {
    case 'LOAD_DECK':
      return handleLoadDeck(state, parsed);
    case 'SHUFFLE_LIBRARY':
      return handleShuffleLibrary(state, parsed);
    case 'DRAW_CARD':
      return handleDrawCard(state, parsed);
    case 'RETURN_TO_LIBRARY':
      return handleReturnToLibrary(state, parsed);
    case 'DEAL_OPENING_HAND':
      return handleDealOpeningHand(state, parsed);
    case 'MULLIGAN':
      return handleMulligan(state, parsed);
    case 'KEEP_HAND':
      return handleKeepHand(state, parsed);
  }
}
