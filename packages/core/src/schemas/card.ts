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

export const CardHashSchema = z.object({
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type CardHash = z.infer<typeof CardHashSchema>;

export const HiddenCardSchema = z.union([CardSchema, CardHashSchema]);
export type HiddenCard = z.infer<typeof HiddenCardSchema>;

export function isCardHash(card: HiddenCard): card is CardHash {
  return 'hash' in card;
}

export function isCard(card: HiddenCard): card is Card {
  return !isCardHash(card);
}
