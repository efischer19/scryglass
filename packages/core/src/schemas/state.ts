import { z } from 'zod';
import { CardSchema } from './card.js';

export const PlayerPhaseSchema = z.enum(['loading', 'mulligan', 'playing']);
export type PlayerPhase = z.infer<typeof PlayerPhaseSchema>;

export const PlayerStateSchema = z.object({
  library: z.array(CardSchema),
  phase: PlayerPhaseSchema,
  mulliganHand: z.array(CardSchema),
  mulliganCount: z.number(),
});
export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const GameStateSchema = z.object({
  players: z.object({
    A: PlayerStateSchema,
    B: PlayerStateSchema,
  }),
  settings: z.object({
    allowMulliganWith2or5Lands: z.boolean(),
  }),
});
export type GameState = z.infer<typeof GameStateSchema>;
