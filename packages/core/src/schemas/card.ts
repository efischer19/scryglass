import { z } from 'zod';

export const CardSchema = z.object({
  name: z.string(),
  setCode: z.string(),
  cardType: z.string(),
  manaCost: z.string(),
});

export type Card = z.infer<typeof CardSchema>;
