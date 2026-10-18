import { StyleProfile } from './schemas/voice';

// Common English stop words to filter out when extracting top n-grams
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound to [-1, 1] range for float rounding
  return Math.max(-1, Math.min(1, similarity));
}

export function computeStyleProfileHeuristics(listings: string[]): Omit<StyleProfile, 'tone_summary' | 'last_updated'> {
  if (!listings || listings.length === 0) {
    return {
      avg_sentence_length: 12,
      emoji_usage_rate: 0,
      bullet_preference: 0.5,
      top_phrases: [],
      formality_estimate: 0.5,
      analyzed_listings_count: 0,
    };
  }

  let totalSentences = 0;
  let totalWords = 0;
  let totalEmojis = 0;
  let totalLines = 0;
  let bulletLines = 0;
  let exclamationMarks = 0;
  let casualWordHits = 0;
  let formalWordHits = 0;

  const phraseCounts: Map<string, number> = new Map();

  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const casualWords = new Set(['love', 'cute', 'grab', 'super', 'awesome', 'omg', 'yay', 'gorgeous', 'treat', 'favorite', 'vibe']);
  const formalWords = new Set(['crafted', 'dimensions', 'specifications', 'authenticated', 'features', 'designed', 'quality', 'finish', 'guarantee', 'material']);

  for (const text of listings) {
    if (!text || text.trim().length === 0) continue;

    // Emojis
    const emojis = text.match(emojiRegex) || [];
    totalEmojis += emojis.length;

    // Exclamations
    const exclamations = (text.match(/!/g) || []).length;
    exclamationMarks += exclamations;

    // Lines & bullet preference
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    totalLines += lines.length;
    for (const line of lines) {
      if (/^([-*•]|\d+\.)\s+/.test(line)) {
        bulletLines++;
      }
    }

    // Sentences
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    totalSentences += sentences.length;

    // Words
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    totalWords += words.length;

    for (const w of words) {
      if (casualWords.has(w)) casualWordHits++;
      if (formalWords.has(w)) formalWordHits++;
    }

    // 2-gram and 3-gram phrases
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      if (!STOP_WORDS.has(w1) && !STOP_WORDS.has(w2)) {
        const biGram = `${w1} ${w2}`;
        phraseCounts.set(biGram, (phraseCounts.get(biGram) || 0) + 1);
      }
      if (i < words.length - 2) {
        const w3 = words[i + 2];
        if (!STOP_WORDS.has(w1) && !STOP_WORDS.has(w3)) {
          const triGram = `${w1} ${w2} ${w3}`;
          phraseCounts.set(triGram, (phraseCounts.get(triGram) || 0) + 1);
        }
      }
    }
  }

  const avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 12;
  const emojiUsageRate = totalWords > 0 ? totalEmojis / totalWords : 0;
  const bulletPreference = totalLines > 0 ? bulletLines / totalLines : 0.5;

  // Top recurring phrases
  const topPhrases = Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);

  // Formality estimate: starts at 0.5, adjusted by exclamation rate, casual vs formal words
  let formality = 0.5;
  const exclamationsPerSentence = totalSentences > 0 ? exclamationMarks / totalSentences : 0;
  formality -= Math.min(0.25, exclamationsPerSentence * 0.15);
  formality -= Math.min(0.2, emojiUsageRate * 2.5);
  formality -= Math.min(0.15, (casualWordHits / (totalWords || 1)) * 10);
  formality += Math.min(0.25, (formalWordHits / (totalWords || 1)) * 10);
  const formalityEstimate = Math.max(0.05, Math.min(0.95, Math.round(formality * 100) / 100));

  return {
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    emoji_usage_rate: Math.round(emojiUsageRate * 1000) / 1000,
    bullet_preference: Math.round(bulletPreference * 100) / 100,
    top_phrases: topPhrases,
    formality_estimate: formalityEstimate,
    analyzed_listings_count: listings.length,
  };
}

export function generateDefaultToneSummary(heuristics: Omit<StyleProfile, 'tone_summary' | 'last_updated'>): string {
  const parts: string[] = [];
  if (heuristics.formality_estimate > 0.65) {
    parts.push('Polished, authoritative, and detail-oriented');
  } else if (heuristics.formality_estimate < 0.35) {
    parts.push('Warm, casual, intimate, and enthusiastic');
  } else {
    parts.push('Balanced, accessible, artisan-focused');
  }

  if (heuristics.bullet_preference > 0.4) {
    parts.push('prefers structured feature bullets');
  } else {
    parts.push('favors narrative storytelling paragraphs');
  }

  if (heuristics.emoji_usage_rate > 0.02) {
    parts.push('with playful emoji accents');
  }

  return parts.join('; ');
}
