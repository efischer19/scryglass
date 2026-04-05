import { z } from 'zod';

export const MulliganVerdictSchema = z.enum([
  'must_mulligan',
  'must_keep',
  'user_choice',
]);

export type MulliganVerdict = z.infer<typeof MulliganVerdictSchema>;
