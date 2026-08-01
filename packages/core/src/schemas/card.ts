import { z } from 'zod';

export const CardTypeEnum = z.enum(['land', 'nonland', 'commander']);
export type CardType = z.infer<typeof CardTypeEnum>;

export const CardSchema = z.object({
  name: z.string(),
  setCode: z.string(),
  collectorNumber: z.string(),
  cardType: CardTypeEnum,
  tapped: z.boolean().optional(),
  faceDown: z.boolean().optional(),
});

export type Card = z.infer<typeof CardSchema>;
