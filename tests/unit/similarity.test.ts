import { describe, it, expect } from 'vitest';
import { cosineSimilarity, computeStyleProfileHeuristics } from '@/lib/voice';
import { mockEmbed } from '@/lib/mockLlm';

describe('Cosine Similarity & Voice Style Heuristics', () => {
  it('computes cosine similarity accurately', () => {
    // Identical
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 4);
    // Orthogonal
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 4);
    // Opposing
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 4);
    // 45 degree angle
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2, 4);
  });

  it('handles edge cases safely (empty, zero, different lengths)', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0, 0], [1, 1, 1])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('produces deterministic normalized embeddings with mockEmbed', () => {
    const textA = 'Handmade ceramic pottery mug';
    const textB = 'Handmade ceramic pottery mug';
    const textC = 'Industrial steel hydraulic valve';

    const vecA = mockEmbed(textA);
    const vecB = mockEmbed(textB);
    const vecC = mockEmbed(textC);

    expect(vecA.length).toBe(128);
    expect(vecA).toEqual(vecB); // Deterministic

    const simAB = cosineSimilarity(vecA, vecB);
    const simAC = cosineSimilarity(vecA, vecC);

    expect(simAB).toBeCloseTo(1, 4);
    expect(simAB).toBeGreaterThan(simAC);
  });

  it('extracts style profile heuristics correctly from listings', () => {
    const sampleListings = [
      `Welcome to our studio! ✨
Here is our handcrafted mug:
• 100% natural clay
• Wheel-thrown texture
• Microwave safe
Grab your morning coffee with love! ☕`,
      `Another lovely batch from our kiln! ✨
Highlights:
• Hand-glazed finish
• Cozy handle
Order your favorite artisan piece today!`,
    ];

    const heuristics = computeStyleProfileHeuristics(sampleListings);

    expect(heuristics.analyzed_listings_count).toBe(2);
    expect(heuristics.emoji_usage_rate).toBeGreaterThan(0);
    expect(heuristics.bullet_preference).toBeGreaterThan(0.3); // High bullet preference
    expect(heuristics.formality_estimate).toBeLessThan(0.7);   // Casual / warm tone with emojis and exclamation
  });
});
