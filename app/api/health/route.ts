import { NextResponse } from 'next/server';
import { checkOllamaHealth } from '@/lib/ollama';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await checkOllamaHealth();
    return NextResponse.json(health);
  } catch (err: any) {
    return NextResponse.json(
      {
        reachable: false,
        isMockMode: false,
        installedModels: [],
        visionModelInstalled: false,
        arenaModelBInstalled: false,
        embedModelInstalled: false,
        missingModels: ['gemma3:4b', 'nomic-embed-text'],
        pullCommands: {
          'gemma3:4b': 'ollama pull gemma3:4b',
          'nomic-embed-text': 'ollama pull nomic-embed-text',
        },
        error: 'Unable to connect to Ollama. Please ensure the Ollama service is running on your machine.',
      },
      { status: 200 }
    );
  }
}
