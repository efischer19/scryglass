import { z } from 'zod';
import { CardPositionSchema, CardSchema, HiddenCardSchema } from './card.js';
import { GameStateSchema, PlayerIdSchema, PlayerStateSchema } from './state.js';

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
    mode: z.enum(['local', 'remote']).optional().default('local'),
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

export const LandTypeSchema = z.enum(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']);
export type LandType = z.infer<typeof LandTypeSchema>;

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

const RevealDataSchema = z.object({
  card: CardSchema,
  salt: z.string(),
});

const MoveCardActionSchema = z.object({
  type: z.literal('MOVE_CARD'),
  payload: z.object({
    player: PlayerIdSchema,
    cardName: z.string(),
    cardId: z.string().min(1).optional(),
    fromZone: ZoneSchema,
    toZone: ZoneSchema,
    position: CardPositionSchema.optional(),
    revealData: RevealDataSchema.optional(),
  }),
});

const ChangeCardStateActionSchema = z.object({
  type: z.literal('CHANGE_CARD_STATE'),
  payload: z.object({
    player: PlayerIdSchema,
    cardName: z.string(),
    cardId: z.string().min(1).optional(),
    zone: ZoneSchema,
    tapped: z.boolean().optional(),
    faceDown: z.boolean().optional(),
  }),
});

const GameStateSnapshotSchema = GameStateSchema.extend({
  players: z.partialRecord(PlayerIdSchema, PlayerStateSchema),
});

const SyncStateActionSchema = z.object({
  type: z.literal('SYNC_STATE'),
  payload: GameStateSnapshotSchema.transform((state) => state as z.infer<typeof GameStateSchema>),
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
  MoveCardActionSchema,
  ChangeCardStateActionSchema,
  SyncStateActionSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

export const ActionResultSchema = z.object({
  state: GameStateSchema,
  card: HiddenCardSchema.nullable(),
  cards: z.array(HiddenCardSchema).optional(),
});
export type ActionResult = z.infer<typeof ActionResultSchema>;
