import { z } from 'zod';

export const SavedDeckSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  rawText: z.string(),
  cardCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedDeck = z.infer<typeof SavedDeckSchema>;

export const SavedDeckListSchema = z.array(SavedDeckSchema);
export type SavedDeckList = z.infer<typeof SavedDeckListSchema>;
