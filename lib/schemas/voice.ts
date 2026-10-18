import { z } from 'zod';

export const ToneSummarySchema = z.object({
  tone: z.string().min(1, 'Tone description is required'),
  brand_archetype: z.string().default('Artisan / Creator'),
  key_characteristics: z.array(z.string()).default([]),
});

export const StyleProfileSchema = z.object({
  avg_sentence_length: z.number().nonnegative(),
  emoji_usage_rate: z.number().nonnegative(),
  bullet_preference: z.number().min(0).max(1),
  top_phrases: z.array(z.string()).default([]),
  formality_estimate: z.number().min(0).max(1),
  tone_summary: z.string().min(1),
  analyzed_listings_count: z.number().int().nonnegative().default(0),
  last_updated: z.string(),
});

export type ToneSummary = z.infer<typeof ToneSummarySchema>;
export type StyleProfile = z.infer<typeof StyleProfileSchema>;
