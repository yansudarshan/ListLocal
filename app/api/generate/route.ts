import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getEmbedding, generateListing } from '@/lib/ollama';
import { cosineSimilarity } from '@/lib/voice';
import { StyleProfile } from '@/lib/schemas/voice';

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
      sellerNotes,
      costData,
      model,
      stream = true,
    } = body;

    if (!attributes || !attributes.item_type) {
      return NextResponse.json(
        { error: 'Extracted attributes are required to generate listing.' },
        { status: 400 }
      );
    }

    // Load active style profile
    let styleProfile: StyleProfile | null = null;
    const profileRow = db.prepare('SELECT json FROM style_profile WHERE id = ?').get('active_profile') as
      | { json: string }
      | undefined;
    if (profileRow) {
      try {
        styleProfile = JSON.parse(profileRow.json) as StyleProfile;
      } catch {
        styleProfile = null;
      }
    }

    // Retrieve few-shot voice examples using cosine similarity
    const queryText = `${productName || ''} ${attributes.item_type} ${(attributes.style_keywords || []).join(' ')}`;
    let fewShotExamples: Array<{ id: string; text: string; similarity: number }> = [];

    try {
      const queryEmbedding = await getEmbedding(queryText);
      const pastRows = db.prepare('SELECT id, text, embedding FROM past_listings').all() as Array<{
        id: string;
        text: string;
        embedding: string;
      }>;

      const scored = pastRows
        .map((row) => {
          try {
            const vec = JSON.parse(row.embedding) as number[];
            const sim = cosineSimilarity(queryEmbedding, vec);
            return { id: row.id, text: row.text, similarity: sim };
          } catch {
            return { id: row.id, text: row.text, similarity: 0 };
          }
        })
        .sort((a, b) => b.similarity - a.similarity);

      fewShotExamples = scored.slice(0, 3);
    } catch (embErr) {
      console.warn('Embedding similarity matching fallback:', embErr);
    }

    const listingParams = {
      attributes,
      productName,
      platform,
      toneValue,
      language,
      sellerNotes,
      styleProfile,
      fewShotExamples,
      costData: costData
        ? {
            suggestedPriceMin: Number(costData.suggestedPriceMin) || 0,
            suggestedPriceMax: Number(costData.suggestedPriceMax) || 0,
            currency: String(costData.currency || 'USD'),
          }
        : null,
    };

    if (!stream) {
      const listing = await generateListing(listingParams, undefined, model);
      return NextResponse.json({
        success: true,
        listing,
        fewShotExamples,
      });
    }

    // SSE Streaming response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, payload: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          sendEvent('status', { step: 'matching_voice', message: 'Matching your authentic voice...' });
          sendEvent('voice_matches', { matches: fewShotExamples });

          sendEvent('status', { step: 'writing', message: 'Writing e-commerce copy...' });

          const listing = await generateListing(
            listingParams,
            (chunk: string) => {
              sendEvent('token', { chunk });
            },
            model
          );

          // Guarantee voice_sources are attached to listing output
          listing.voice_sources = fewShotExamples.map((ex) => ({
            id: ex.id,
            text: ex.text.length > 90 ? ex.text.slice(0, 87) + '...' : ex.text,
            similarity: Math.round(ex.similarity * 100) / 100,
          }));

          sendEvent('done', { listing, fewShotExamples });
          controller.close();
        } catch (err: any) {
          sendEvent('error', { error: err.message || 'Error occurred while generating copy.' });
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Listing generation endpoint error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during listing generation.' },
      { status: 500 }
    );
  }
}
