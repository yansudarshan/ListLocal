import { FORBIDDEN_FABRICATION_DIRECTIVE } from './common';

export function buildVisionExtractionPrompt(): string {
  return `You are an expert product cataloger. Analyze the provided product photo(s) with clinical accuracy.

${FORBIDDEN_FABRICATION_DIRECTIVE}

Analyze the product and return ONLY a valid JSON object with the following structure:
{
  "item_type": "Specific product category or name",
  "colors": ["Primary Color", "Secondary Color"],
  "materials": ["Confirmed Visible Material 1", "Confirmed Visible Material 2"],
  "style_keywords": ["Aesthetic keyword 1", "Aesthetic keyword 2"],
  "visible_text": "Any text, branding, or numbers visibly printed/engraved on the item, or empty string",
  "condition": "Handmade" | "Brand New" | "Vintage" | "Pre-owned",
  "notable_details": ["Distinctive visual feature 1", "Distinctive visual feature 2"],
  "confidence": {
    "item_type": 0.95,
    "colors": 0.90,
    "materials": 0.80,
    "style_keywords": 0.85,
    "visible_text": 0.70,
    "condition": 0.85,
    "notable_details": 0.80
  }
}

Confidence rules:
- Rate your confidence for each field strictly between 0.00 and 1.00.
- If a material or detail is suspected but not 100% visible, assign a confidence score below 0.60 so the seller can verify it.
- Return ONLY the JSON object. Do not wrap in markdown or commentary.`;
}

export function buildVisionRepairPrompt(failedResponse: string, errorMessage: string): string {
  return `Your previous JSON output failed validation.
Error: ${errorMessage}

Previous output:
${failedResponse}

${FORBIDDEN_FABRICATION_DIRECTIVE}

Please correct the JSON output so it strictly adheres to the requested schema. Return ONLY valid raw JSON.`;
}
