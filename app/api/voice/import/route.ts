import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getEmbedding } from '@/lib/ollama';
import { computeStyleProfileHeuristics, generateDefaultToneSummary } from '@/lib/voice';
import { StyleProfile } from '@/lib/schemas/voice';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawListings: string[] = [];

    if (Array.isArray(body.listings)) {
      rawListings = body.listings.map((l: unknown) => String(l).trim()).filter((l: string) => l.length > 5);
    } else if (typeof body.text === 'string') {
      // Split by common separators (e.g. ---, ===, or multiple newlines)
      rawListings = body.text
        .split(/(?:\r?\n){2,}|---|===/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 5);
    }

    if (rawListings.length < 1) {
      return NextResponse.json(
        { error: 'Please provide at least 1 past listing (recommended: 5 to 30) to learn your voice.' },
        { status: 400 }
      );
    }

    // Cap at 50 to avoid runaway local embedding times
    const listingsToProcess = rawListings.slice(0, 50);

    const insertPastListing = db.prepare(`
      INSERT INTO past_listings (id, text, embedding, created_at)
      VALUES (?, ?, ?, ?)
    `);

    // Process embeddings sequentially to respect queue
    const insertedIds: string[] = [];
    for (const text of listingsToProcess) {
      const id = crypto.randomUUID();
      const embedding = await getEmbedding(text);
      const createdAt = new Date().toISOString();
      insertPastListing.run(id, text, JSON.stringify(embedding), createdAt);
      insertedIds.push(id);
    }

    // Load all historical past listings to compute comprehensive style profile
    const allRows = db.prepare('SELECT text FROM past_listings').all() as Array<{ text: string }>;
    const allTexts = allRows.map((r) => r.text);

    const heuristics = computeStyleProfileHeuristics(allTexts);
    const toneSummary = generateDefaultToneSummary(heuristics);

    const profile: StyleProfile = {
      ...heuristics,
      tone_summary: toneSummary,
      analyzed_listings_count: allTexts.length,
      last_updated: new Date().toISOString(),
    };

    // Store in style_profile (single active profile)
    db.prepare('DELETE FROM style_profile').run();
    db.prepare('INSERT INTO style_profile (id, json) VALUES (?, ?)').run('active_profile', JSON.stringify(profile));

    return NextResponse.json({
      success: true,
      importedCount: insertedIds.length,
      totalListings: allTexts.length,
      profile,
    });
  } catch (err: any) {
    console.error('Error importing voice listings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process voice import. Please check your listings and try again.' },
      { status: 500 }
    );
  }
}
