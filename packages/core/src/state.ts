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

export const ActionSchema = z.discriminatedUnion('type', [
  LoadDeckActionSchema,
  ShuffleLibraryActionSchema,
  DrawCardActionSchema,
  TutorCardActionSchema,
  FetchBasicLandActionSchema,
  ScryResolveActionSchema,
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
  }
}
