import { ActionSchema } from './schemas/action.js';
import type { Action, ActionResult, Zone } from './schemas/action.js';
import { PLAYER_IDS } from './schemas/state.js';
import type { GameState, HistoryCardDetail, HistoryEntry, PlayerId } from './schemas/state.js';
import { createCardCommitments, hashCard } from './commit-reveal.js';
import { isCard, isCardHash } from './schemas/card.js';
import type { Card, HiddenCard } from './schemas/card.js';
import { shuffle, cryptoRandomInt } from './shuffle.js';
import { isBasicLandOfType } from './helpers/lands.js';

/**
 * Create the initial game state.
 *
 * @param playerCount Number of players (1–4). Defaults to 2.
 * @param settings Optional initial settings overrides.
 */
export function createInitialState(
  playerCount = 2,
  settings?: Partial<GameState['settings']>,
): GameState {
  if (playerCount < 1 || playerCount > 4) {
    throw new Error(`playerCount must be between 1 and 4, got ${playerCount}`);
  }
  const players: Record<string, GameState['players'][PlayerId]> = {};
  for (let i = 0; i < playerCount; i++) {
    players[PLAYER_IDS[i]] = {
      library: [],
      hand: [],
      battlefield: [],
      graveyard: [],
      exile: [],
      commandZone: [],
      phase: 'loading',
      mulliganHand: [],
      mulliganCount: 0,
    };
  }
  return {
    players: players as GameState['players'],
    settings: {
      allowMulliganWith2or5Lands: false,
      localMode: false,
      ...settings,
    },
    history: [],
  };
}

function requirePlayerState(
  state: GameState,
  player: PlayerId,
): NonNullable<GameState['players'][PlayerId]> {
  const playerState = state.players[player];
  if (!playerState) {
    throw new Error(`Player ${player} is not part of this game state`);
  }

  return playerState;
}

/**
 * Build a human-readable history entry for a dispatched action.
 */
function buildHistoryEntry(
  state: GameState,
  action: Exclude<Action, { type: 'SYNC_STATE' }>,
  result: ActionResult,
): HistoryEntry {
  const player = action.payload.player;
  const previousPlayerState = requirePlayerState(state, player);
  const nextPlayerState = requirePlayerState(result.state, player);
  let description = '';
  let cardDetails: HistoryCardDetail[] | undefined;

  switch (action.type) {
    case 'LOAD_DECK':
      description = `Player ${player} loaded a deck (${action.payload.cards.length} cards)`;
      break;
    case 'SHUFFLE_LIBRARY':
      description = `Player ${player} shuffled their library`;
      break;
    case 'DRAW_CARD':
      description = `Player ${player} drew a card`;
      if (result.card) {
        cardDetails = [{ card: result.card, destination: 'hand' }];
      }
      break;
    case 'RETURN_TO_LIBRARY':
      description = `Player ${player} returned ${action.payload.card.name} to ${action.payload.position} of library`;
      cardDetails = [{ card: action.payload.card, destination: action.payload.position }];
      break;
    case 'DEAL_OPENING_HAND':
      description = `Player ${player} was dealt an opening hand`;
      cardDetails = nextPlayerState.hand.map((card) => ({
        card,
        destination: 'opening hand',
      }));
      break;
    case 'MULLIGAN':
      description = `Player ${player} took a mulligan`;
      cardDetails = nextPlayerState.hand.map((card) => ({
        card,
        destination: 'mulligan hand',
      }));
      break;
    case 'KEEP_HAND':
      description = `Player ${player} kept their hand`;
      cardDetails = previousPlayerState.hand.map((card) => ({
        card,
        destination: 'kept hand',
      }));
      break;
    case 'SCRY_RESOLVE': {
      const count = action.payload.decisions.length;
      description = `Player ${player} resolved scry (${count} card${count !== 1 ? 's' : ''})`;
      cardDetails = action.payload.decisions.map((decision) => ({
        card: previousPlayerState.library[decision.cardIndex],
        destination: decision.destination,
      }));
      break;
    }
    case 'FETCH_BASIC_LAND':
      description = `Player ${player} fetched a ${action.payload.landType}`;
      if (result.card) {
        cardDetails = [{ card: result.card, destination: 'fetched' }];
      }
      break;
    case 'TUTOR_CARD':
      description = `Player ${player} tutored for ${action.payload.cardName}`;
      if (result.card) {
        cardDetails = [{ card: result.card, destination: 'tutored' }];
      }
      break;
    case 'MOVE_CARD':
      description = `Player ${player} moved ${action.payload.cardName} from ${action.payload.fromZone} to ${action.payload.toZone}`;
      if (result.card) {
        cardDetails = [{ card: result.card, destination: action.payload.toZone }];
      }
      break;
    case 'CHANGE_CARD_STATE': {
      const states: string[] = [];
      if (action.payload.tapped !== undefined) {
        states.push(`tapped: ${action.payload.tapped}`);
      }
      if (action.payload.faceDown !== undefined) {
        states.push(`faceDown: ${action.payload.faceDown}`);
      }
      description = `Player ${player} changed state of ${action.payload.cardName} (${states.join(', ')})`;
      break;
    }
  }

  const entry: HistoryEntry = { actionType: action.type, player, description };
  if (cardDetails && cardDetails.length > 0) {
    entry.cardDetails = cardDetails;
    const seen = new Set<string>();
    entry.cards = cardDetails.reduce<HiddenCard[]>((cards, detail) => {
      const key = isCard(detail.card)
        ? `${detail.card.setCode}:${detail.card.collectorNumber}:${detail.card.name}`
        : detail.card.hash;
      if (!seen.has(key)) {
        seen.add(key);
        cards.push(detail.card);
      }
      return cards;
    }, []);
  }
  return entry;
}

function handleLoadDeck(state: GameState, action: Extract<Action, { type: 'LOAD_DECK' }>): ActionResult {
  const { player, cards, mode = 'local' } = action.payload;
  const playerState = requirePlayerState(state, player);
  const library = mode === 'remote'
    ? createCardCommitments(cards).map(({ cardHash }) => cardHash)
    : [...cards];
  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...playerState,
          library,
          phase: 'mulligan' as const,
        },
      },
    },
    card: null,
  };
}

function requireVisibleCard(card: HiddenCard, actionDescription: string): Card {
  if (!isCard(card)) {
    throw new Error(`Cannot ${actionDescription}: hidden card identities are hashed in remote mode`);
  }

  return card;
}

const HIDDEN_ZONES: readonly Zone[] = ['library', 'hand', 'mulliganHand'];
const PUBLIC_ZONES: readonly Zone[] = ['battlefield', 'graveyard', 'exile', 'commandZone'];

function isHiddenZone(zone: Zone): boolean {
  return HIDDEN_ZONES.includes(zone);
}

function isPublicZone(zone: Zone): boolean {
  return PUBLIC_ZONES.includes(zone);
}

function createRevealValidationError(reason: string): Error {
  return new Error(`Cheat Detected / State Desync: ${reason}`);
}

function createActionCardId(card: Card, zone: Zone, index: number): string {
  return `${zone}:${card.setCode}:${card.collectorNumber}:${card.name}:${index}`;
}

function matchesCardReference(card: HiddenCard, zone: Zone, index: number, cardName: string, cardId?: string): boolean {
  if (!isCard(card)) {
    return false;
  }

  if (cardId != null) {
    return createActionCardId(card, zone, index) === cardId || card.instanceId === cardId;
  }

  return card.name === cardName;
}

function handleShuffleLibrary(state: GameState, action: Extract<Action, { type: 'SHUFFLE_LIBRARY' }>): ActionResult {
  const { player } = action.payload;
  const playerState = requirePlayerState(state, player);
  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...playerState,
          library: shuffle(playerState.library),
        },
      },
    },
    card: null,
  };
}

function handleReturnToLibrary(state: GameState, action: Extract<Action, { type: 'RETURN_TO_LIBRARY' }>): ActionResult {
  const { player, card, position } = action.payload;
  const playerState = requirePlayerState(state, player);
  const library = [...playerState.library];

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
          ...playerState,
          library,
        },
      },
    },
    card: null,
  };
}

function requireMulliganPhase(state: GameState, player: PlayerId, actionType: string): void {
  const playerState = requirePlayerState(state, player);
  if (playerState.phase !== 'mulligan') {
    throw new Error(
      `Cannot ${actionType}: Player ${player} is in '${playerState.phase}' phase, but must be in 'mulligan' phase`,
    );
  }
}

function handleDealOpeningHand(state: GameState, action: Extract<Action, { type: 'DEAL_OPENING_HAND' }>): ActionResult {
  const { player } = action.payload;
  requireMulliganPhase(state, player, 'DEAL_OPENING_HAND');

  const playerState = requirePlayerState(state, player);
  const library = playerState.library;
  const dealCount = Math.min(7, library.length);

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...playerState,
          hand: library.slice(0, dealCount),
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

  const playerState = requirePlayerState(state, player);
  const combined = [...playerState.hand, ...playerState.library];
  const shuffled = shuffle(combined);
  const dealCount = Math.min(7, shuffled.length);

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...playerState,
          library: shuffled.slice(dealCount),
          hand: shuffled.slice(0, dealCount),
          mulliganCount: playerState.mulliganCount + 1,
        },
      },
    },
    card: null,
  };
}

function handleKeepHand(state: GameState, action: Extract<Action, { type: 'KEEP_HAND' }>): ActionResult {
  const { player } = action.payload;
  requireMulliganPhase(state, player, 'KEEP_HAND');
  const playerState = requirePlayerState(state, player);

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...playerState,
          phase: 'playing' as const,
        },
      },
    },
    card: null,
  };
}

function handleScryResolve(state: GameState, action: Extract<Action, { type: 'SCRY_RESOLVE' }>): ActionResult {
  const { player, decisions } = action.payload;
  const playerState = requirePlayerState(state, player);
  const library = playerState.library;

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
          ...playerState,
          library: newLibrary,
        },
      },
    },
    card: removedCards.length > 0 ? removedCards[0] : null,
    cards: removedCards,
  };
}

/**
 * Dispatch an action against the current game state, returning a new
 * immutable state and any output (e.g., a drawn card).
 *
 * @see ADR-005: Action/Reducer State Management
 */
function handleDrawCard(state: GameState, action: Extract<Action, { type: 'DRAW_CARD' }>): ActionResult {
  const { player } = action.payload;
  const playerState = requirePlayerState(state, player);
  const library = playerState.library;

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
          ...playerState,
          library: rest,
        },
      },
    },
    card: drawn,
  };
}

function handleFetchBasicLand(state: GameState, action: Extract<Action, { type: 'FETCH_BASIC_LAND' }>): ActionResult {
  const { player, landType } = action.payload;
  const playerState = requirePlayerState(state, player);
  const library = playerState.library;

  const landIndex = library.findIndex(card => isCard(card) && isBasicLandOfType(card, landType));

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
          ...playerState,
          library: shuffled,
        },
      },
    },
    card: fetchedCard,
  };
}

function handleTutorCard(state: GameState, action: Extract<Action, { type: 'TUTOR_CARD' }>): ActionResult {
  const { player, cardName } = action.payload;
  const playerState = requirePlayerState(state, player);
  const library = playerState.library;

  const cardIndex = library.findIndex(
    card => isCard(card) && card.name.toLowerCase() === cardName.toLowerCase(),
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
          ...playerState,
          library: shuffled,
        },
      },
    },
    card: tutoredCard,
  };
}

function handleMoveCard(state: GameState, action: Extract<Action, { type: 'MOVE_CARD' }>): ActionResult {
  const { player, cardName, cardId, fromZone, toZone, position, revealData } = action.payload;
  const playerState = requirePlayerState(state, player);
  const fromZoneCards = playerState[fromZone];

  let cardIndex = fromZoneCards.findIndex((c, index) => matchesCardReference(c, fromZone, index, cardName, cardId));
  if (cardIndex === -1) {
    if (!isHiddenZone(fromZone) || !isPublicZone(toZone)) {
      throw new Error(
        `Cannot move card: "${cardName}" not found in ${fromZone} of Player ${player}`,
      );
    }

    if (!revealData) {
      throw createRevealValidationError(`missing reveal data for ${fromZone} to ${toZone} move`);
    }

    const expectedHash = hashCard(revealData.card, revealData.salt).hash;
    cardIndex = fromZoneCards.findIndex((c) => isCardHash(c) && c.hash === expectedHash);
    if (cardIndex === -1) {
      throw createRevealValidationError(`revealed card does not match committed hash in ${fromZone}`);
    }
  }

  const card = fromZoneCards[cardIndex];
  const movedCard = isCardHash(card) && isHiddenZone(fromZone) && isPublicZone(toZone)
    ? (() => {
        if (!revealData) {
          throw createRevealValidationError(`missing reveal data for ${fromZone} to ${toZone} move`);
        }

        const expectedHash = hashCard(revealData.card, revealData.salt).hash;
        if (card.hash !== expectedHash) {
          throw createRevealValidationError(`revealed card does not match committed hash in ${fromZone}`);
        }

        return revealData.card;
      })()
    : card;
  const normalizedMovedCard = isCard(movedCard)
    ? {
        ...movedCard,
        ...(toZone === 'battlefield'
          ? { position: position ?? movedCard.position ?? { x: playerState.battlefield.length * 24, y: 16 } }
          : { position: undefined }),
      }
    : movedCard;

  if (fromZone === toZone) {
    const updatedZoneCards = [...fromZoneCards];
    updatedZoneCards[cardIndex] = normalizedMovedCard;

    return {
      state: {
        ...state,
        players: {
          ...state.players,
          [player]: {
            ...playerState,
            [fromZone]: updatedZoneCards,
          },
        },
      },
      card: normalizedMovedCard,
    };
  }

  const updatedFromZone = [
    ...fromZoneCards.slice(0, cardIndex),
    ...fromZoneCards.slice(cardIndex + 1),
  ];

  const toZoneCards = playerState[toZone];
  const updatedToZone = [...toZoneCards, normalizedMovedCard];

  const updates: Record<string, any> = {};
  updates[fromZone] = updatedFromZone;
  updates[toZone] = updatedToZone;

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...playerState,
          ...updates,
        },
      },
    },
    card: normalizedMovedCard,
  };
}

function handleChangeCardState(state: GameState, action: Extract<Action, { type: 'CHANGE_CARD_STATE' }>): ActionResult {
  const { player, cardName, cardId, zone, tapped, faceDown } = action.payload;
  const playerState = requirePlayerState(state, player);
  const zoneCards = playerState[zone];

  const cardIndex = zoneCards.findIndex((c, index) => matchesCardReference(c, zone, index, cardName, cardId));
  if (cardIndex === -1) {
    throw new Error(
      `Cannot change card state: "${cardName}" not found in ${zone} of Player ${player}`,
    );
  }

  const card = requireVisibleCard(zoneCards[cardIndex], 'change card state');
  const updatedCard: Card = {
    ...card,
    ...(tapped !== undefined && { tapped }),
    ...(faceDown !== undefined && { faceDown }),
  };

  const updatedZoneCards = [
    ...zoneCards.slice(0, cardIndex),
    updatedCard,
    ...zoneCards.slice(cardIndex + 1),
  ];

  const updates: Record<string, any> = {};
  updates[zone] = updatedZoneCards;

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [player]: {
          ...playerState,
          ...updates,
        },
      },
    },
    card: null,
  };
}

function handleSyncState(_state: GameState, action: Extract<Action, { type: 'SYNC_STATE' }>): ActionResult {
  return {
    state: action.payload,
    card: null,
  };
}

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
    case 'MOVE_CARD':
      result = handleMoveCard(state, parsed);
      break;
    case 'CHANGE_CARD_STATE':
      result = handleChangeCardState(state, parsed);
      break;
    case 'SYNC_STATE':
      return handleSyncState(state, parsed);
  }

  const entry = buildHistoryEntry(state, parsed, result);
  result.state = {
    ...result.state,
    history: [...state.history, entry],
  };

  return result;
}
