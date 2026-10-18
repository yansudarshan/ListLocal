import { describe, it, expect } from 'vitest';
import { VisionExtractionSchema } from '@/lib/schemas/vision';
import { ListingOutputSchema } from '@/lib/schemas/listing';
import { ReceiptExtractionSchema, checkReceiptMath } from '@/lib/schemas/receipt';
import { StyleProfileSchema } from '@/lib/schemas/voice';
import { TranslationOutputSchema } from '@/lib/schemas/translation';

describe('Zod Schemas Validation (Good & Bad Samples)', () => {
  describe('VisionExtractionSchema', () => {
    it('accepts valid vision extraction data', () => {
      const goodSample = {
        item_type: 'Handmade Mug',
        colors: ['Blue', 'White'],
        materials: ['Ceramic'],
        style_keywords: ['Modern'],
        visible_text: '',
        condition: 'Handmade',
        notable_details: ['Glazed rim'],
        confidence: {
          item_type: 0.95,
          colors: 0.9,
          materials: 0.85,
          style_keywords: 0.8,
          visible_text: 0.9,
          condition: 0.9,
          notable_details: 0.85,
        },
      };
      expect(() => VisionExtractionSchema.parse(goodSample)).not.toThrow();
    });

    it('rejects vision extraction when required fields or materials are missing', () => {
      const badSample = {
        item_type: '', // empty
        colors: [],    // at least one required
        materials: [],
      };
      expect(() => VisionExtractionSchema.parse(badSample)).toThrow();
    });

    it('rejects confidence scores outside [0, 1]', () => {
      const badConfidence = {
        item_type: 'Handmade Mug',
        colors: ['Blue'],
        materials: ['Clay'],
        confidence: {
          item_type: 1.5, // invalid > 1
        },
      };
      expect(() => VisionExtractionSchema.parse(badConfidence)).toThrow();
    });
  });

  describe('ListingOutputSchema', () => {
    it('accepts valid listing output', () => {
      const validListing = {
        title: 'Artisan Ceramic Cup | Blue Stoneware Mug',
        description: 'Stunning handmade ceramic cup with high-fire blue glaze and comfortable handle.',
        tags: ['ceramic mug', 'blue cup', 'artisan pottery'],
        category: 'Drinkware',
        price_min: 24.0,
        price_max: 30.0,
        voice_sources: [{ text: 'Handcrafted with organic glazes...', similarity: 0.88 }],
      };
      expect(() => ListingOutputSchema.parse(validListing)).not.toThrow();
    });

    it('rejects empty title or short description', () => {
      const badListing = {
        title: '',
        description: 'Short', // less than 10 chars
        tags: [],
        category: '',
      };
      expect(() => ListingOutputSchema.parse(badListing)).toThrow();
    });
  });

  describe('ReceiptExtractionSchema & checkReceiptMath', () => {
    it('accepts valid receipt and passes math check', () => {
      const validReceipt = {
        vendor: 'Ceramic Studio Supplies',
        date: '2026-09-01',
        line_items: [
          { description: 'Clay 25kg', qty: 2, unit_price: 20.0 },
          { description: 'Glaze 1L', qty: 1, unit_price: 35.0 },
        ],
        total: 75.0, // 2 * 20 + 35 = 75
        currency: 'USD',
      };

      const parsed = ReceiptExtractionSchema.parse(validReceipt);
      expect(parsed.total).toBe(75.0);

      const mathCheck = checkReceiptMath(parsed);
      expect(mathCheck.isMatch).toBe(true);
      expect(mathCheck.diff).toBe(0);
      expect(mathCheck.warning).toBeUndefined();
    });

    it('flags math mismatch when items sum does not equal total', () => {
      const mismatchedReceipt = {
        vendor: 'Ceramic Studio Supplies',
        date: '2026-09-01',
        line_items: [
          { description: 'Clay 25kg', qty: 1, unit_price: 20.0 },
        ],
        total: 50.0, // mismatch! items = 20, total = 50
        currency: 'USD',
      };

      const parsed = ReceiptExtractionSchema.parse(mismatchedReceipt);
      const mathCheck = checkReceiptMath(parsed);
      expect(mathCheck.isMatch).toBe(false);
      expect(mathCheck.diff).toBe(30.0);
      expect(mathCheck.warning).toContain('Calculated line items sum');
    });

    it('rejects negative quantity or missing vendor', () => {
      const badReceipt = {
        vendor: '',
        line_items: [{ description: 'Test', qty: -2, unit_price: 10 }],
        total: -20,
      };
      expect(() => ReceiptExtractionSchema.parse(badReceipt)).toThrow();
    });
  });

  describe('StyleProfileSchema & TranslationOutputSchema', () => {
    it('accepts valid style profile', () => {
      const profile = {
        avg_sentence_length: 14.2,
        emoji_usage_rate: 0.05,
        bullet_preference: 0.8,
        top_phrases: ['handcrafted with love', 'wheel thrown'],
        formality_estimate: 0.45,
        tone_summary: 'Warm, personable artisan tone',
        analyzed_listings_count: 10,
        last_updated: '2026-10-16T12:00:00Z',
      };
      expect(() => StyleProfileSchema.parse(profile)).not.toThrow();
    });

    it('accepts valid translation output', () => {
      const translation = {
        translated_title: 'हस्तनिर्मित सिरेमिक मग',
        translated_description: 'सुंदर हस्तनिर्मित सिरेमिक मग।',
        translated_tags: ['मग', 'सिरेमिक'],
        target_language: 'Hindi',
        preserved_terms: ['Kasuti'],
      };
      expect(() => TranslationOutputSchema.parse(translation)).not.toThrow();
    });
  });
});
