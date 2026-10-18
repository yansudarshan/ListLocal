import { FORBIDDEN_FABRICATION_DIRECTIVE } from './common';
import { VisionExtraction } from '../schemas/vision';
import { StyleProfile } from '../schemas/voice';

export interface ListingPromptParams {
  attributes: VisionExtraction;
  productName?: string;
  platform: 'Etsy' | 'eBay' | 'Instagram';
  toneValue?: number; // 0 (friendly / warm) to 100 (professional / sleek)
  language?: string;
  sellerNotes?: string;
  styleProfile?: StyleProfile | null;
  fewShotExamples?: Array<{ text: string; similarity: number }>;
  costData?: {
    suggestedPriceMin: number;
    suggestedPriceMax: number;
    currency: string;
  } | null;
}

export function buildListingPrompt(params: ListingPromptParams): string {
  const {
    attributes,
    productName,
    platform,
    toneValue = 50,
    language = 'English',
    sellerNotes,
    styleProfile,
    fewShotExamples = [],
    costData,
  } = params;

  let platformConstraints = '';
  if (platform === 'Etsy') {
    platformConstraints = `
- Platform: Etsy.
- Title: STRICT MAXIMUM 140 characters. High searchability, natural rhythm, separated with clean dividers (| or -).
- Tags: EXACTLY 13 search tags, multi-word phrases (each max 20 chars), optimized for Etsy SEO.`;
  } else if (platform === 'eBay') {
    platformConstraints = `
- Platform: eBay.
- Title: STRICT MAXIMUM 80 characters. Capitalize keywords, brand, model, condition, key specs without filler words.
- Tags: 8 to 12 relevant item specifics / keyword tags.`;
  } else {
    platformConstraints = `
- Platform: Instagram Shop / Social.
- Title: Engaging product headline (max 100 characters).
- Tags: 10 to 15 relevant hashtags and discoverability tags.`;
  }

  let toneDescription = 'balanced friendly and professional';
  if (toneValue < 30) {
    toneDescription = 'warm, personable, conversational, and storytelling-focused';
  } else if (toneValue > 70) {
    toneDescription = 'crisp, polished, sophisticated, and professional';
  }

  const voiceGuidance = styleProfile
    ? `
SELLER VOICE PROFILE:
- Tone Summary: ${styleProfile.tone_summary}
- Average sentence length: ${styleProfile.avg_sentence_length.toFixed(1)} words
- Emoji usage rate: ${(styleProfile.emoji_usage_rate * 100).toFixed(0)}%
- Bullet vs paragraph preference: ${styleProfile.bullet_preference > 0.5 ? 'Prefers structured bullet points' : 'Prefers narrative prose paragraphs'}
- Formality score (0=casual, 1=formal): ${styleProfile.formality_estimate.toFixed(2)}
- Signature recurring phrases: ${styleProfile.top_phrases.join(', ') || 'None provided'}
Match this exact voice cadence and vocabulary seamlessly.`
    : '';

  const fewShotBlock =
    fewShotExamples.length > 0
      ? `
PAST LISTING EXAMPLES IN SELLER'S VOICE (FEW-SHOT):
${fewShotExamples
  .map(
    (ex, idx) =>
      `[Example ${idx + 1} (Similarity: ${(ex.similarity * 100).toFixed(0)}%)]:
${ex.text}
---`
  )
  .join('\n')}`
      : '';

  const pricingInstruction = costData
    ? `
PRICING INSTRUCTION:
- The seller provided verified cost metrics: Minimum suggested price ${costData.currency} ${costData.suggestedPriceMin.toFixed(
        2
      )}, Maximum suggested price ${costData.currency} ${costData.suggestedPriceMax.toFixed(2)}.
- Set price_min to ${costData.suggestedPriceMin} and price_max to ${costData.suggestedPriceMax}.`
    : `
PRICING INSTRUCTION:
- No verified cost data was supplied by the seller.
- You MUST set "price_min": null and "price_max": null.
- DO NOT invent, guess, or fabricate competitor prices or retail values.`;

  return `You are a master e-commerce copywriter writing product listings in the seller's authentic voice.

${FORBIDDEN_FABRICATION_DIRECTIVE}

PRODUCT INFORMATION:
- Product Name: ${productName || attributes.item_type}
- Target Platform: ${platform}
- Target Language: ${language}
- Tone Target: ${toneDescription} (Scale: ${toneValue}/100)
- Confirmed Item Type: ${attributes.item_type}
- Confirmed Colors: ${attributes.colors.join(', ')}
- Confirmed Materials: ${attributes.materials.join(', ')}
- Style Keywords: ${attributes.style_keywords.join(', ')}
- Visible Inscribed Text: ${attributes.visible_text || 'None visible'}
- Condition: ${attributes.condition}
- Notable Details: ${attributes.notable_details.join(', ')}
${sellerNotes ? `- Seller Notes: ${sellerNotes}` : ''}
${platformConstraints}
${voiceGuidance}
${fewShotBlock}
${pricingInstruction}

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "title": "Listing title respecting platform limits",
  "description": "Engaging hook followed by bullet features and care/shipping note",
  "tags": ["tag1", "tag2", ...],
  "category": "Suggested category",
  "price_min": ${costData ? costData.suggestedPriceMin : 'null'},
  "price_max": ${costData ? costData.suggestedPriceMax : 'null'},
  "voice_sources": ${JSON.stringify(
    fewShotExamples.map((e) => ({
      text: e.text.slice(0, 80) + '...',
      similarity: Math.round(e.similarity * 100) / 100,
    }))
  )}
}

Description structure rules:
1. Hook: 1-2 compelling opening sentences capturing the item's verified qualities.
2. Bullet features: 4-6 bullet points covering confirmed materials, colors, and craftsmanship.
3. Care & Shipping: Standard placeholder note regarding packaging and care.
4. Language: Write in ${language}.

Return ONLY raw JSON, with no markdown fences, no preamble, and no explanation.`;
}

export function buildListingRepairPrompt(failedResponse: string, errorMessage: string): string {
  return `Your previous listing JSON failed schema validation.
Error: ${errorMessage}

Previous output:
${failedResponse}

${FORBIDDEN_FABRICATION_DIRECTIVE}

Please correct the listing JSON so it strictly satisfies the schema. Return ONLY valid raw JSON.`;
}
