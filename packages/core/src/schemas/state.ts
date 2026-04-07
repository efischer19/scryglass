import { z } from 'zod';
import { CardSchema } from './card.js';

export const PlayerPhaseSchema = z.enum(['loading', 'mulligan', 'playing']);
export type PlayerPhase = z.infer<typeof PlayerPhaseSchema>;

export const PlayerIdSchema = z.enum(['A', 'B', 'C', 'D']);
export type PlayerId = z.infer<typeof PlayerIdSchema>;

export const PLAYER_IDS: readonly PlayerId[] = ['A', 'B', 'C', 'D'] as const;

export const PlayerStateSchema = z.object({
  library: z.array(CardSchema),
  phase: PlayerPhaseSchema,
  mulliganHand: z.array(CardSchema),
  mulliganCount: z.number(),
});
export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const HistoryEntrySchema = z.object({
  actionType: z.string(),
  player: z.enum(['A', 'B']),
  description: z.string(),
  cards: z.array(CardSchema).optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const GameStateSchema = z.object({
  players: z.record(PlayerIdSchema, PlayerStateSchema),
  settings: z.object({
    allowMulliganWith2or5Lands: z.boolean(),
  }),
  history: z.array(HistoryEntrySchema),
});
export type GameState = z.infer<typeof GameStateSchema>;
