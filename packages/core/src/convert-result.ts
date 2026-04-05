import { z } from 'zod';

export const NeedsResolutionEntrySchema = z.object({
  lineIndex: z.number(),
  cardName: z.string(),
  missingFields: z.array(z.enum(['setCode', 'collectorNumber', 'cardType'])),
});

export type NeedsResolutionEntry = z.infer<typeof NeedsResolutionEntrySchema>;

export const ConvertResultSchema = z.object({
  output: z.string(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  needsResolution: z.array(NeedsResolutionEntrySchema),
});

export type ConvertResult = z.infer<typeof ConvertResultSchema>;
