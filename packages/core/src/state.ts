import { z } from 'zod';
import { CardSchema } from './schemas/card.js';
import type { Card } from './schemas/card.js';

// --- Player Phase ---
export const PlayerPhaseSchema = z.enum(['loading', 'mulligan', 'playing']);
export type PlayerPhase = z.infer<typeof PlayerPhaseSchema>;

// --- Player ID ---
export const PlayerIdSchema = z.enum(['A', 'B']);
export type PlayerId = z.infer<typeof PlayerIdSchema>;

// --- Player State ---
export const PlayerStateSchema = z.object({
  library: z.array(CardSchema),
  hand: z.array(CardSchema),
  battlefield: z.array(CardSchema),
  graveyard: z.array(CardSchema),
  exile: z.array(CardSchema),
  commandZone: z.array(CardSchema),
  phase: PlayerPhaseSchema,
  mulliganHand: z.array(CardSchema).nullable(),
});
export type PlayerState = z.infer<typeof PlayerStateSchema>;

// --- Game State ---
export const GameStateSchema = z.object({
  players: z.object({
    A: PlayerStateSchema,
    B: PlayerStateSchema,
  }),
  settings: z.object({}),
});
export type GameState = z.infer<typeof GameStateSchema>;

// --- Zone Types ---
export const ZoneSchema = z.enum([
  'library',
  'hand',
  'battlefield',
  'graveyard',
  'exile',
  'commandZone',
  'mulliganHand',
]);
export type Zone = z.infer<typeof ZoneSchema>;

// --- Actions ---
const LoadDeckActionSchema = z.object({
  type: z.literal('LOAD_DECK'),
  payload: z.object({
    player: PlayerIdSchema,
    cards: z.array(CardSchema),
  }),
});

const ShuffleLibraryActionSchema = z.object({
  type: z.literal('SHUFFLE_LIBRARY'),
  payload: z.object({
    player: PlayerIdSchema,
  }),
});

const DrawCardActionSchema = z.object({
  type: z.literal('DRAW_CARD'),
  payload: z.object({
    player: PlayerIdSchema,
  }),
});

const TutorCardActionSchema = z.object({
  type: z.literal('TUTOR_CARD'),
  payload: z.object({
    player: PlayerIdSchema,
    cardName: z.string(),
  }),
});

const FetchBasicLandActionSchema = z.object({
  type: z.literal('FETCH_BASIC_LAND'),
  payload: z.object({
    player: PlayerIdSchema,
    landType: z.string(),
  }),
});

const ScryResolveActionSchema = z.object({
  type: z.literal('SCRY_RESOLVE'),
  payload: z.object({
    player: PlayerIdSchema,
    decisions: z.array(
      z.object({
        cardIndex: z.number(),
        destination: z.enum(['top', 'bottom']),
      }),
    ),
  }),
});

const MoveCardActionSchema = z.object({
  type: z.literal('MOVE_CARD'),
  payload: z.object({
    player: PlayerIdSchema,
    cardName: z.string(),
    fromZone: ZoneSchema,
    toZone: ZoneSchema,
  }),
});

const ChangeCardStateActionSchema = z.object({
  type: z.literal('CHANGE_CARD_STATE'),
  payload: z.object({
    player: PlayerIdSchema,
    cardName: z.string(),
    zone: ZoneSchema,
    tapped: z.boolean().optional(),
    faceDown: z.boolean().optional(),
  }),
});

export const ActionSchema = z.discriminatedUnion('type', [
  LoadDeckActionSchema,
  ShuffleLibraryActionSchema,
  DrawCardActionSchema,
  TutorCardActionSchema,
  FetchBasicLandActionSchema,
  ScryResolveActionSchema,
  MoveCardActionSchema,
  ChangeCardStateActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

// --- Action Result ---
export interface ActionResult {
  state: GameState;
  drawnCards?: Card[];
}

// --- Initial State ---
function createPlayerState(): PlayerState {
  return {
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    commandZone: [],
    phase: 'loading',
    mulliganHand: null,
  };
}

export function createInitialState(): GameState {
  return {
    players: {
      A: createPlayerState(),
      B: createPlayerState(),
    },
    settings: {},
  };
}

// --- Helpers ---
function updatePlayer(
  state: GameState,
  player: PlayerId,
  updates: Partial<PlayerState>,
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [player]: { ...state.players[player], ...updates },
    },
  };
}

// --- Dispatch ---
export function dispatch(state: GameState, action: Action): ActionResult {
  const parsed = ActionSchema.parse(action);
  const player = parsed.payload.player;
  const playerState = state.players[player];

  switch (parsed.type) {
    case 'LOAD_DECK': {
      return {
        state: updatePlayer(state, player, {
          library: [...parsed.payload.cards],
          phase: 'playing',
        }),
      };
    }

    case 'SHUFFLE_LIBRARY': {
      const library = [...playerState.library];
      for (let i = library.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [library[i], library[j]] = [library[j], library[i]];
      }
      return { state: updatePlayer(state, player, { library }) };
    }

    case 'DRAW_CARD': {
      if (playerState.library.length === 0) {
        throw new Error(
          `Cannot draw: Player ${player}'s library is empty (0 cards remaining)`,
        );
      }
      const [drawnCard, ...remaining] = playerState.library;
      return {
        state: updatePlayer(state, player, { library: remaining }),
        drawnCards: [drawnCard],
      };
    }

    case 'TUTOR_CARD': {
      const idx = playerState.library.findIndex(
        (c) => c.name === parsed.payload.cardName,
      );
      if (idx === -1) {
        throw new Error(
          `Cannot tutor: "${parsed.payload.cardName}" not found in Player ${player}'s library`,
        );
      }
      const tutored = playerState.library[idx];
      const library = [
        ...playerState.library.slice(0, idx),
        ...playerState.library.slice(idx + 1),
      ];
      return {
        state: updatePlayer(state, player, { library }),
        drawnCards: [tutored],
      };
    }

    case 'FETCH_BASIC_LAND': {
      const idx = playerState.library.findIndex(
        (c) =>
          c.cardType === 'land' &&
          c.name.toLowerCase() === parsed.payload.landType.toLowerCase(),
      );
      if (idx === -1) {
        throw new Error(
          `Cannot fetch: no "${parsed.payload.landType}" found in Player ${player}'s library`,
        );
      }
      const fetched = playerState.library[idx];
      const library = [
        ...playerState.library.slice(0, idx),
        ...playerState.library.slice(idx + 1),
      ];
      return {
        state: updatePlayer(state, player, { library }),
        drawnCards: [fetched],
      };
    }

    case 'SCRY_RESOLVE': {
      const library = [...playerState.library];
      const topCards: Card[] = [];
      const bottomCards: Card[] = [];
      const usedIndices = new Set<number>();

      for (const decision of parsed.payload.decisions) {
        if (decision.cardIndex < 0 || decision.cardIndex >= library.length) {
          throw new Error(
            `Cannot scry: invalid card index ${decision.cardIndex}`,
          );
        }
        usedIndices.add(decision.cardIndex);
        if (decision.destination === 'top') {
          topCards.push(library[decision.cardIndex]);
        } else {
          bottomCards.push(library[decision.cardIndex]);
        }
      }

      const remaining = library.filter((_, i) => !usedIndices.has(i));
      return {
        state: updatePlayer(state, player, {
          library: [...topCards, ...remaining, ...bottomCards],
        }),
      };
    }

    case 'MOVE_CARD': {
      const { cardName, fromZone, toZone } = parsed.payload;
      const fromZoneCards = playerState[fromZone as keyof PlayerState];
      
      if (!Array.isArray(fromZoneCards)) {
        throw new Error(`Zone "${fromZone}" is not a valid zone for this operation`);
      }

      const cardIndex = fromZoneCards.findIndex((c) => c.name === cardName);
      if (cardIndex === -1) {
        throw new Error(
          `Cannot move card: "${cardName}" not found in ${fromZone} of Player ${player}`,
        );
      }

      const card = fromZoneCards[cardIndex];
      const updatedFromZone = [
        ...fromZoneCards.slice(0, cardIndex),
        ...fromZoneCards.slice(cardIndex + 1),
      ];
      
      const toZoneCards = playerState[toZone as keyof PlayerState];
      if (!Array.isArray(toZoneCards)) {
        throw new Error(`Zone "${toZone}" is not a valid zone for this operation`);
      }

      const updatedToZone = [...toZoneCards, card];

      const updates: Record<string, any> = {};
      updates[fromZone] = updatedFromZone;
      updates[toZone] = updatedToZone;

      return {
        state: updatePlayer(state, player, updates as Partial<PlayerState>),
      };
    }

    case 'CHANGE_CARD_STATE': {
      const { cardName, zone, tapped, faceDown } = parsed.payload;
      const zoneCards = playerState[zone as keyof PlayerState];

      if (!Array.isArray(zoneCards)) {
        throw new Error(`Zone "${zone}" is not a valid zone for this operation`);
      }

      const cardIndex = zoneCards.findIndex((c) => c.name === cardName);
      if (cardIndex === -1) {
        throw new Error(
          `Cannot change card state: "${cardName}" not found in ${zone} of Player ${player}`,
        );
      }

      const card = zoneCards[cardIndex];
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
        state: updatePlayer(state, player, updates as Partial<PlayerState>),
      };
    }
  }
}
