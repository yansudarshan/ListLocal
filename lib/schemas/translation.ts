import { z } from 'zod';

export const TranslationOutputSchema = z.object({
  translated_title: z.string().min(1),
  translated_description: z.string().min(1),
  translated_tags: z.array(z.string()).default([]),
  target_language: z.enum(['Hindi', 'Kannada', 'English']),
  preserved_terms: z.array(z.string()).default([]),
});

export type TranslationOutput = z.infer<typeof TranslationOutputSchema>;
