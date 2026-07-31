import { z } from 'zod';
import { CardSchema } from './card.js';
import { GameStateSchema, PlayerIdSchema } from './state.js';

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
  ReturnToLibraryActionSchema,
  DealOpeningHandActionSchema,
  MulliganActionSchema,
  KeepHandActionSchema,
  ScryResolveActionSchema,
  MoveCardActionSchema,
  ChangeCardStateActionSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

export const ActionResultSchema = z.object({
  state: GameStateSchema,
  card: CardSchema.nullable(),
  cards: z.array(CardSchema).optional(),
});
export type ActionResult = z.infer<typeof ActionResultSchema>;
