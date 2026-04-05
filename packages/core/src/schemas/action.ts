import { z } from 'zod';
import { CardSchema } from './card.js';
import { GameStateSchema } from './state.js';

const PlayerIdSchema = z.enum(['A', 'B']);

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

const ReturnToLibraryActionSchema = z.object({
  type: z.literal('RETURN_TO_LIBRARY'),
  payload: z.object({
    player: PlayerIdSchema,
    card: CardSchema,
    position: z.enum(['top', 'bottom', 'random']),
  }),
});

const DealOpeningHandActionSchema = z.object({
  type: z.literal('DEAL_OPENING_HAND'),
  payload: z.object({
    player: PlayerIdSchema,
  }),
});

const MulliganActionSchema = z.object({
  type: z.literal('MULLIGAN'),
  payload: z.object({
    player: PlayerIdSchema,
  }),
});

const KeepHandActionSchema = z.object({
  type: z.literal('KEEP_HAND'),
  payload: z.object({
    player: PlayerIdSchema,
  }),
});

export const LandTypeSchema = z.enum(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']);
export type LandType = z.infer<typeof LandTypeSchema>;

export const ScryDecisionSchema = z.object({
  cardIndex: z.number(),
  destination: z.enum(['top', 'bottom', 'remove']),
});
export type ScryDecision = z.infer<typeof ScryDecisionSchema>;

const ScryResolveActionSchema = z.object({
  type: z.literal('SCRY_RESOLVE'),
  payload: z.object({
    player: PlayerIdSchema,
    decisions: z.array(ScryDecisionSchema),
  }),
});

const FetchBasicLandActionSchema = z.object({
  type: z.literal('FETCH_BASIC_LAND'),
  payload: z.object({
    player: PlayerIdSchema,
    landType: LandTypeSchema,
  }),
});

const TutorCardActionSchema = z.object({
  type: z.literal('TUTOR_CARD'),
  payload: z.object({
    player: PlayerIdSchema,
    cardName: z.string(),
  }),
});

export const ActionSchema = z.discriminatedUnion('type', [
  LoadDeckActionSchema,
  ShuffleLibraryActionSchema,
  DrawCardActionSchema,
  ReturnToLibraryActionSchema,
  DealOpeningHandActionSchema,
  MulliganActionSchema,
  KeepHandActionSchema,
  ScryResolveActionSchema,
  FetchBasicLandActionSchema,
  TutorCardActionSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

export const ActionResultSchema = z.object({
  state: GameStateSchema,
  card: CardSchema.nullable(),
  cards: z.array(CardSchema).optional(),
});
export type ActionResult = z.infer<typeof ActionResultSchema>;
