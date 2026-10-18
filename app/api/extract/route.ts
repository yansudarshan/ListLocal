import { NextRequest, NextResponse } from 'next/server';
import { extractVisionAttributes } from '@/lib/ollama';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawImages: string[] = [];
    if (Array.isArray(body.images)) {
      rawImages = body.images;
    } else if (Array.isArray(body.photos)) {
      rawImages = body.photos
        .map((p: any) => (typeof p === 'string' ? p : p.dataUrl || p.url || ''))
        .filter(Boolean);
    }

    if (!Array.isArray(rawImages) || rawImages.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one product photo for attribute extraction.' },
        { status: 400 }
      );
    }

    // Clean base64 strings if prefixed with data:image/...;base64,
    const cleanImages = rawImages.map((img) => {
      const match = img.match(/^data:image\/[a-z]+;base64,(.+)$/i);
      return match ? match[1] : img;
    });

    const modelName = typeof body.model === 'string' && body.model ? body.model : undefined;
    const attributes = await extractVisionAttributes(cleanImages, modelName);

    return NextResponse.json({
      success: true,
      attributes,
    });
  } catch (err: any) {
    console.error('Vision extraction error:', err);
    return NextResponse.json(
      {
        error:
          err.message ||
          'Failed to extract attributes from photos. Please ensure Ollama vision model is running.',
      },
      { status: 500 }
    );
  }
}
