import { safeFetch } from './safeFetch';
import { inferenceQueue } from './queue';
import { VisionExtraction, VisionExtractionSchema } from './schemas/vision';
import { ListingOutput, ListingOutputSchema } from './schemas/listing';
import { ReceiptExtraction, ReceiptExtractionSchema } from './schemas/receipt';
import { TranslationOutput, TranslationOutputSchema } from './schemas/translation';
import { buildVisionExtractionPrompt, buildVisionRepairPrompt } from './prompts/vision';
import { buildListingPrompt, buildListingRepairPrompt, ListingPromptParams } from './prompts/listing';
import { buildReceiptExtractionPrompt, buildReceiptRepairPrompt } from './prompts/receipt';
import { buildTranslationPrompt, buildTranslationRepairPrompt, TranslationPromptParams } from './prompts/translation';
import {
  mockEmbed,
  mockVisionExtraction,
  mockGenerateListing,
  mockScanReceipt,
  mockTranslate,
} from './mockLlm';

export const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
export const VISION_MODEL = process.env.VISION_MODEL || 'gemma3:4b';
export const ARENA_MODEL_B = process.env.ARENA_MODEL_B || 'llama3.2-vision';
export const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';

export function isMockMode(): boolean {
  return process.env.MOCK_LLM === '1';
}

export interface OllamaHealthStatus {
  reachable: boolean;
  isMockMode: boolean;
  installedModels: string[];
  visionModelInstalled: boolean;
  arenaModelBInstalled: boolean;
  embedModelInstalled: boolean;
  missingModels: string[];
  pullCommands: Record<string, string>;
  activeModel: string;
}

export async function checkOllamaHealth(): Promise<OllamaHealthStatus> {
  const pullCommands: Record<string, string> = {
    [VISION_MODEL]: `ollama pull ${VISION_MODEL}`,
    [ARENA_MODEL_B]: `ollama pull ${ARENA_MODEL_B}`,
    [EMBED_MODEL]: `ollama pull ${EMBED_MODEL}`,
  };

  if (isMockMode()) {
    return {
      reachable: true,
      isMockMode: true,
      installedModels: [VISION_MODEL, ARENA_MODEL_B, EMBED_MODEL],
      visionModelInstalled: true,
      arenaModelBInstalled: true,
      embedModelInstalled: true,
      missingModels: [],
      pullCommands,
      activeModel: `${VISION_MODEL} (MOCK_LLM)`,
    };
  }

  try {
    const res = await safeFetch(`${OLLAMA_URL}/api/tags`, { method: 'GET' });
    if (!res.ok) {
      return {
        reachable: false,
        isMockMode: false,
        installedModels: [],
        visionModelInstalled: false,
        arenaModelBInstalled: false,
        embedModelInstalled: false,
        missingModels: [VISION_MODEL, EMBED_MODEL],
        pullCommands,
        activeModel: VISION_MODEL,
      };
    }

    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const installedModels = (data.models || []).map((m) => m.name);

    const isInstalled = (target: string) =>
      installedModels.some((m) => m === target || m.startsWith(`${target}:`));

    const visionModelInstalled = isInstalled(VISION_MODEL);
    const arenaModelBInstalled = isInstalled(ARENA_MODEL_B);
    const embedModelInstalled = isInstalled(EMBED_MODEL);

    const missingModels: string[] = [];
    if (!visionModelInstalled) missingModels.push(VISION_MODEL);
    if (!embedModelInstalled) missingModels.push(EMBED_MODEL);
    if (!arenaModelBInstalled) missingModels.push(ARENA_MODEL_B);

    return {
      reachable: true,
      isMockMode: false,
      installedModels,
      visionModelInstalled,
      arenaModelBInstalled,
      embedModelInstalled,
      missingModels,
      pullCommands,
      activeModel: VISION_MODEL,
    };
  } catch {
    return {
      reachable: false,
      isMockMode: false,
      installedModels: [],
      visionModelInstalled: false,
      arenaModelBInstalled: false,
      embedModelInstalled: false,
      missingModels: [VISION_MODEL, EMBED_MODEL],
      pullCommands,
      activeModel: VISION_MODEL,
    };
  }
}

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  // Strip markdown code fences if model enclosed it
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  cleaned = cleaned.trim();

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (isMockMode()) {
    return mockEmbed(text);
  }

  return inferenceQueue.enqueue('ollama-embedding', async (signal) => {
    const res = await safeFetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Embedding request failed with status ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { embedding: number[] };
    return data.embedding;
  });
}

export async function extractVisionAttributes(
  imagesBase64: string[],
  modelName: string = VISION_MODEL
): Promise<VisionExtraction> {
  if (isMockMode()) {
    return mockVisionExtraction();
  }

  const prompt = buildVisionExtractionPrompt();

  return inferenceQueue.enqueue(`vision-extract-${modelName}`, async (signal) => {
    const callModel = async (userPrompt: string): Promise<string> => {
      const res = await safeFetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: userPrompt,
          images: imagesBase64,
          stream: false,
          format: 'json',
          options: { temperature: 0.1 },
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Vision extraction failed with status ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as { response: string };
      return data.response;
    };

    let rawOutput = await callModel(prompt);

    try {
      const parsed = JSON.parse(cleanJsonString(rawOutput));
      return VisionExtractionSchema.parse(parsed);
    } catch (firstErr: any) {
      console.warn('Vision extraction failed validation. Retrying once with repair prompt...', firstErr);
      const repairPrompt = buildVisionRepairPrompt(rawOutput, firstErr.message || 'Validation failed');
      const repairedOutput = await callModel(repairPrompt);
      const repairedParsed = JSON.parse(cleanJsonString(repairedOutput));
      return VisionExtractionSchema.parse(repairedParsed);
    }
  });
}

export async function generateListing(
  params: ListingPromptParams,
  onTokenChunk?: (chunk: string) => void,
  modelName: string = VISION_MODEL
): Promise<ListingOutput> {
  if (isMockMode()) {
    if (onTokenChunk) {
      const simulatedStream = [
        'Connecting to local voice engine...\n',
        'Applying authentic seller cadence...\n',
        'Generating listing attributes and tags...\n',
      ];
      for (const line of simulatedStream) {
        onTokenChunk(line);
      }
    }
    const mock = mockGenerateListing(
      params.platform,
      params.costData?.suggestedPriceMin ?? null,
      params.costData?.suggestedPriceMax ?? null
    );
    if (onTokenChunk) {
      onTokenChunk(JSON.stringify(mock));
    }
    return mock;
  }

  const prompt = buildListingPrompt(params);

  return inferenceQueue.enqueue(`listing-generate-${modelName}`, async (signal) => {
    const callModelStream = async (userPrompt: string): Promise<string> => {
      const res = await safeFetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: userPrompt,
          stream: true,
          format: 'json',
          options: { temperature: 0.3 },
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Listing generation failed with status ${res.status}: ${await res.text()}`);
      }

      if (!res.body) {
        throw new Error('Response body is missing from Ollama stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as { response?: string; done?: boolean };
            if (parsed.response) {
              fullResponse += parsed.response;
              if (onTokenChunk) {
                onTokenChunk(parsed.response);
              }
            }
          } catch {
            // Partial JSON chunk
          }
        }
      }

      return fullResponse;
    };

    let rawOutput = await callModelStream(prompt);

    try {
      const parsed = JSON.parse(cleanJsonString(rawOutput));
      return ListingOutputSchema.parse(parsed);
    } catch (firstErr: any) {
      console.warn('Listing generation schema failed. Retrying once with repair prompt...', firstErr);
      const repairPrompt = buildListingRepairPrompt(rawOutput, firstErr.message || 'Validation failed');
      const res = await safeFetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: repairPrompt,
          stream: false,
          format: 'json',
          options: { temperature: 0.1 },
        }),
        signal,
      });
      const data = (await res.json()) as { response: string };
      const repairedParsed = JSON.parse(cleanJsonString(data.response));
      return ListingOutputSchema.parse(repairedParsed);
    }
  });
}

export async function scanReceipt(
  imageBase64: string,
  modelName: string = VISION_MODEL
): Promise<ReceiptExtraction> {
  if (isMockMode()) {
    return mockScanReceipt();
  }

  const prompt = buildReceiptExtractionPrompt();

  return inferenceQueue.enqueue(`receipt-scan-${modelName}`, async (signal) => {
    const callModel = async (userPrompt: string): Promise<string> => {
      const res = await safeFetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: userPrompt,
          images: [imageBase64],
          stream: false,
          format: 'json',
          options: { temperature: 0.1 },
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Receipt scan failed with status ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as { response: string };
      return data.response;
    };

    let rawOutput = await callModel(prompt);

    try {
      const parsed = JSON.parse(cleanJsonString(rawOutput));
      return ReceiptExtractionSchema.parse(parsed);
    } catch (firstErr: any) {
      console.warn('Receipt extraction failed validation. Retrying once with repair prompt...', firstErr);
      const repairPrompt = buildReceiptRepairPrompt(rawOutput, firstErr.message || 'Validation failed');
      const repairedOutput = await callModel(repairPrompt);
      const repairedParsed = JSON.parse(cleanJsonString(repairedOutput));
      return ReceiptExtractionSchema.parse(repairedParsed);
    }
  });
}

export async function translateListing(
  params: TranslationPromptParams,
  modelName: string = VISION_MODEL
): Promise<TranslationOutput> {
  if (isMockMode()) {
    return mockTranslate(params.targetLanguage, params.glossaryTerms);
  }

  const prompt = buildTranslationPrompt(params);

  return inferenceQueue.enqueue(`translation-${modelName}`, async (signal) => {
    const callModel = async (userPrompt: string): Promise<string> => {
      const res = await safeFetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: userPrompt,
          stream: false,
          format: 'json',
          options: { temperature: 0.2 },
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Translation request failed with status ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as { response: string };
      return data.response;
    };

    let rawOutput = await callModel(prompt);

    try {
      const parsed = JSON.parse(cleanJsonString(rawOutput));
      return TranslationOutputSchema.parse(parsed);
    } catch (firstErr: any) {
      console.warn('Translation failed validation. Retrying once with repair prompt...', firstErr);
      const repairPrompt = buildTranslationRepairPrompt(rawOutput, firstErr.message || 'Validation failed');
      const repairedOutput = await callModel(repairPrompt);
      const repairedParsed = JSON.parse(cleanJsonString(repairedOutput));
      return TranslationOutputSchema.parse(repairedParsed);
    }
  });
}

export interface ArenaRunResult {
  modelA: string;
  modelB: string;
  outputA: ListingOutput;
  outputB: ListingOutput;
  latencyAMs: number;
  latencyBMs: number;
  tpsA: number;
  tpsB: number;
}

export async function runModelArena(
  modelA: string,
  modelB: string,
  params: ListingPromptParams
): Promise<ArenaRunResult> {
  if (isMockMode()) {
    const outputA = mockGenerateListing(params.platform);
    const outputB = mockGenerateListing(params.platform);
    // Add slight variations for arena comparison
    outputB.title = `${outputB.title} - Handcrafted Studio Edition`;
    return {
      modelA,
      modelB,
      outputA,
      outputB,
      latencyAMs: 1420,
      latencyBMs: 1890,
      tpsA: 28.4,
      tpsB: 21.6,
    };
  }

  // Model A run
  const startA = Date.now();
  let tokensA = 0;
  const outputA = await generateListing(params, () => {
    tokensA++;
  }, modelA);
  const latencyAMs = Math.max(1, Date.now() - startA);
  const tpsA = Math.round(((tokensA || 150) / (latencyAMs / 1000)) * 10) / 10;

  // Model B run (executed sequentially via inferenceQueue)
  const startB = Date.now();
  let tokensB = 0;
  const outputB = await generateListing(params, () => {
    tokensB++;
  }, modelB);
  const latencyBMs = Math.max(1, Date.now() - startB);
  const tpsB = Math.round(((tokensB || 150) / (latencyBMs / 1000)) * 10) / 10;

  return {
    modelA,
    modelB,
    outputA,
    outputB,
    latencyAMs,
    latencyBMs,
    tpsA,
    tpsB,
  };
}
