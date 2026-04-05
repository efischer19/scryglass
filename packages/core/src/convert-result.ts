import { z } from 'zod';
import { CardTypeEnum } from './schemas/card.js';

export const UnresolvedCardSchema = z.object({
  name: z.string(),
  setCode: z.string().optional(),
  collectorNumber: z.string().optional(),
  cardType: CardTypeEnum.optional(),
  quantity: z.number().int().positive(),
  sourceLine: z.number().int().positive(),
});

export const ConvertResultSchema = z.object({
  output: z.string(),
  needsResolution: z.array(UnresolvedCardSchema),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

export type ConvertResult = z.infer<typeof ConvertResultSchema>;
export type UnresolvedCard = z.infer<typeof UnresolvedCardSchema>;
