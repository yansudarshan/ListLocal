import { z } from 'zod';

export const VoiceSourceInfluenceSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  similarity: z.number().min(0).max(1),
});

export const ListingOutputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title exceeds max character limit'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  category: z.string().min(1, 'Category is required'),
  price_min: z.number().nullable().optional(),
  price_max: z.number().nullable().optional(),
  voice_sources: z.array(VoiceSourceInfluenceSchema).default([]),
});

export type VoiceSourceInfluence = z.infer<typeof VoiceSourceInfluenceSchema>;
export type ListingOutput = z.infer<typeof ListingOutputSchema>;
