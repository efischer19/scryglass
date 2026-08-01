import { z } from 'zod';
import { CardSchema } from './card.js';

export const PlayerPhaseSchema = z.enum(['loading', 'mulligan', 'playing']);
export type PlayerPhase = z.infer<typeof PlayerPhaseSchema>;

export const PlayerIdSchema = z.enum(['A', 'B', 'C', 'D']);
export type PlayerId = z.infer<typeof PlayerIdSchema>;

export const PLAYER_IDS: readonly PlayerId[] = ['A', 'B', 'C', 'D'] as const;

export const PlayerStateSchema = z.object({
  library: z.array(CardSchema),
  hand: z.array(CardSchema),
  battlefield: z.array(CardSchema),
  graveyard: z.array(CardSchema),
  exile: z.array(CardSchema),
  commandZone: z.array(CardSchema),
  phase: PlayerPhaseSchema,
  mulliganHand: z.array(CardSchema),
  mulliganCount: z.number(),
});
export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const HistoryCardDetailSchema = z.object({
  card: CardSchema,
  destination: z.string().optional(),
});
export type HistoryCardDetail = z.infer<typeof HistoryCardDetailSchema>;

export const HistoryEntrySchema = z.object({
  actionType: z.string(),
  player: PlayerIdSchema,
  description: z.string(),
  cards: z.array(CardSchema).optional(),
  cardDetails: z.array(HistoryCardDetailSchema).optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const GameStateSchema = z.object({
  players: z.record(PlayerIdSchema, PlayerStateSchema),
  settings: z.object({
    allowMulliganWith2or5Lands: z.boolean(),
    localMode: z.boolean(),
  }),
  history: z.array(HistoryEntrySchema),
});
export type GameState = z.infer<typeof GameStateSchema>;
