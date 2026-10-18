import { NextRequest, NextResponse } from 'next/server';
import { runModelArena, checkOllamaHealth, VISION_MODEL, ARENA_MODEL_B } from '@/lib/ollama';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      attributes,
      productName,
      platform = 'Etsy',
      toneValue = 50,
      language = 'English',
      modelA = VISION_MODEL,
      modelB = ARENA_MODEL_B,
    } = body;

    if (!attributes) {
      return NextResponse.json({ error: 'Attributes are required for model arena evaluation.' }, { status: 400 });
    }

    // Health check to ensure both models are available
    const health = await checkOllamaHealth();
    if (!health.isMockMode) {
      const isAInstalled = health.installedModels.some((m) => m === modelA || m.startsWith(`${modelA}:`));
      const isBInstalled = health.installedModels.some((m) => m === modelB || m.startsWith(`${modelB}:`));

      if (!isAInstalled || !isBInstalled) {
        const missing = !isAInstalled ? modelA : modelB;
        return NextResponse.json(
          {
            error: `Model "${missing}" is not currently installed in Ollama.`,
            pullCommand: `ollama pull ${missing}`,
            missingModel: missing,
          },
          { status: 400 }
        );
      }
    }

    // Run sequentially through inferenceQueue
    const arenaResult = await runModelArena(modelA, modelB, {
      attributes,
      productName,
      platform,
      toneValue,
      language,
    });

    return NextResponse.json({
      success: true,
      ...arenaResult,
    });
  } catch (err: any) {
    console.error('Arena execution failed:', err);
    return NextResponse.json(
      { error: err.message || 'Model arena execution failed. Please check Ollama.' },
      { status: 500 }
    );
  }
}
