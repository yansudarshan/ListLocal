import { FORBIDDEN_FABRICATION_DIRECTIVE } from './common';

export interface TranslationPromptParams {
  title: string;
  description: string;
  tags: string[];
  targetLanguage: 'Hindi' | 'Kannada';
  glossaryTerms: Array<{ term: string; translation: string }>;
}

export function buildTranslationPrompt(params: TranslationPromptParams): string {
  const { title, description, tags, targetLanguage, glossaryTerms } = params;

  let glossaryGuidance = '';
  if (glossaryTerms.length > 0) {
    glossaryGuidance = `
PROTECTED GLOSSARY RULES:
The following terms must either be preserved EXACTLY or translated using the specified canonical term. DO NOT alter, replace, or approximate these:
${glossaryTerms.map((g) => `- "${g.term}" -> "${g.translation}"`).join('\n')}`;
  }

  return `You are a professional e-commerce translator specializing in Indian handicraft and artisan markets.
Translate the following listing to ${targetLanguage} while maintaining the seller's authentic tone and nuance.

${FORBIDDEN_FABRICATION_DIRECTIVE}

ORIGINAL CONTENT:
Title: ${title}
Description:
${description}
Tags: ${tags.join(', ')}

${glossaryGuidance}

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "translated_title": "Translated title in ${targetLanguage}",
  "translated_description": "Translated description in ${targetLanguage}",
  "translated_tags": ["tag 1 in ${targetLanguage}", "tag 2 in ${targetLanguage}"],
  "target_language": "${targetLanguage}",
  "preserved_terms": ${JSON.stringify(glossaryTerms.map((g) => g.term))}
}

Rules:
- Translate accurately without losing technical or material accuracy.
- Any protected terms in the glossary must appear as specified.
- Do NOT invent new features, materials, or claims not present in the original listing.
- Return ONLY valid raw JSON.`;
}

export function buildTranslationRepairPrompt(failedResponse: string, errorMessage: string): string {
  return `Your previous translation JSON failed validation.
Error: ${errorMessage}

Previous output:
${failedResponse}

${FORBIDDEN_FABRICATION_DIRECTIVE}

Please correct the translation JSON to match the requested schema. Return ONLY valid raw JSON.`;
}
