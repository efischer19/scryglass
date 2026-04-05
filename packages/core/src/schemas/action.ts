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

export const ActionSchema = z.discriminatedUnion('type', [
  LoadDeckActionSchema,
  ShuffleLibraryActionSchema,
  DrawCardActionSchema,
  ReturnToLibraryActionSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

export const ActionResultSchema = z.object({
  state: GameStateSchema,
  card: CardSchema.nullable(),
});
export type ActionResult = z.infer<typeof ActionResultSchema>;
