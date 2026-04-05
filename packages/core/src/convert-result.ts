import { z } from 'zod';

export const ConvertResultSchema = z.object({
  output: z.string(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

export type ConvertResult = z.infer<typeof ConvertResultSchema>;
