import { describe, it, expect } from 'vitest';
import { buildVisionExtractionPrompt, buildVisionRepairPrompt } from '@/lib/prompts/vision';
import { buildListingPrompt, buildListingRepairPrompt } from '@/lib/prompts/listing';
import {
  buildReceiptExtractionPrompt,
  buildReceiptRepairPrompt,
  buildMarginExplanationPrompt,
} from '@/lib/prompts/receipt';
import { buildTranslationPrompt, buildTranslationRepairPrompt } from '@/lib/prompts/translation';
import { FORBIDDEN_FABRICATION_DIRECTIVE } from '@/lib/prompts/common';

describe('Prompt Builders & Strict Non-Fabrication Rules', () => {
  const sampleAttributes = {
    item_type: 'Ceramic Mug',
    colors: ['Terracotta', 'Sand'],
    materials: ['Stoneware Clay', 'Glaze'],
    style_keywords: ['Rustic', 'Artisan'],
    visible_text: '',
    condition: 'Handmade',
    notable_details: ['Carved handle'],
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

  it('asserts forbidden-fabrication directive is in vision extraction prompts', () => {
    const prompt = buildVisionExtractionPrompt();
    expect(prompt).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);
    expect(prompt).toContain('NEVER fabricate, invent, or hallucinate facts');

    const repair = buildVisionRepairPrompt('{}', 'validation failed');
    expect(repair).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);
  });

  it('asserts forbidden-fabrication directive is in listing generation prompts', () => {
    const prompt = buildListingPrompt({
      attributes: sampleAttributes,
      platform: 'Etsy',
    });
    expect(prompt).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);

    const repair = buildListingRepairPrompt('{}', 'validation failed');
    expect(repair).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);
  });

  it('enforces platform specific limits in listing prompts', () => {
    const etsyPrompt = buildListingPrompt({
      attributes: sampleAttributes,
      platform: 'Etsy',
    });
    expect(etsyPrompt).toContain('140 characters');
    expect(etsyPrompt).toContain('13 search tags');

    const ebayPrompt = buildListingPrompt({
      attributes: sampleAttributes,
      platform: 'eBay',
    });
    expect(ebayPrompt).toContain('80 characters');
  });

  it('asserts forbidden-fabrication directive in receipt and margin prompts', () => {
    const receiptPrompt = buildReceiptExtractionPrompt();
    expect(receiptPrompt).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);

    const receiptRepair = buildReceiptRepairPrompt('{}', 'validation failed');
    expect(receiptRepair).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);

    const marginPrompt = buildMarginExplanationPrompt({
      productName: 'Ceramic Mug',
      totalCost: 15.0,
      currency: 'USD',
      marginPct: 35,
      suggestedPrice: 26.5,
    });
    expect(marginPrompt).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);
    expect(marginPrompt).toContain('DO NOT mention competitor prices, market averages, or external trends');
  });

  it('asserts forbidden-fabrication directive in translation prompts', () => {
    const translationPrompt = buildTranslationPrompt({
      title: 'Ceramic Mug',
      description: 'Handmade mug',
      tags: ['mug'],
      targetLanguage: 'Hindi',
      glossaryTerms: [{ term: 'Bidriware', translation: 'बिदरीवेयर' }],
    });
    expect(translationPrompt).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);
    expect(translationPrompt).toContain('Bidriware');

    const repairPrompt = buildTranslationRepairPrompt('{}', 'failed');
    expect(repairPrompt).toContain(FORBIDDEN_FABRICATION_DIRECTIVE);
  });

  it('forbids pricing fabrication when costData is null', () => {
    const promptWithoutCost = buildListingPrompt({
      attributes: sampleAttributes,
      platform: 'Etsy',
      costData: null,
    });
    expect(promptWithoutCost).toContain('"price_min": null');
    expect(promptWithoutCost).toContain('"price_max": null');
    expect(promptWithoutCost).toContain('DO NOT invent, guess, or fabricate competitor prices');
  });
});
