import { z } from 'zod';

export const VisionConfidenceSchema = z.object({
  item_type: z.number().min(0).max(1).default(0.9),
  colors: z.number().min(0).max(1).default(0.85),
  materials: z.number().min(0).max(1).default(0.8),
  style_keywords: z.number().min(0).max(1).default(0.8),
  visible_text: z.number().min(0).max(1).default(0.7),
  condition: z.number().min(0).max(1).default(0.85),
  notable_details: z.number().min(0).max(1).default(0.8),
});

export const VisionExtractionSchema = z.object({
  item_type: z.string().min(1, 'Item type is required'),
  colors: z.array(z.string()).min(1, 'At least one color is required'),
  materials: z.array(z.string()).min(1, 'At least one material is required'),
  style_keywords: z.array(z.string()).default([]),
  visible_text: z.string().default(''),
  condition: z.string().default('Good'),
  notable_details: z.array(z.string()).default([]),
  confidence: VisionConfidenceSchema,
});

export type VisionConfidence = z.infer<typeof VisionConfidenceSchema>;
export type VisionExtraction = z.infer<typeof VisionExtractionSchema>;
