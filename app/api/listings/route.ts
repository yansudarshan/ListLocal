import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const platform = searchParams.get('platform') || '';

    let query = `
      SELECT 
        l.id,
        l.product_id as productId,
        p.name as productName,
        p.platform,
        p.status,
        l.title,
        l.description,
        l.tags_json as tagsJson,
        l.category,
        l.price_min as priceMin,
        l.price_max as priceMax,
        l.language,
        l.model_used as modelUsed,
        l.voice_sources_json as voiceSourcesJson,
        l.edited,
        l.created_at as createdAt
      FROM listings l
      JOIN products p ON l.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (platform && platform !== 'all') {
      query += ` AND p.platform = ?`;
      params.push(platform);
    }

    if (search.trim()) {
      query += ` AND (l.title LIKE ? OR l.description LIKE ? OR p.name LIKE ? OR l.tags_json LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY l.created_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    // Fetch photos for each product
    const photoStmt = db.prepare('SELECT id, path, width, height FROM photos WHERE product_id = ?');

    const result = rows.map((row) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(row.tagsJson || '[]');
      } catch {
        tags = [];
      }

      let voiceSources: any[] = [];
      try {
        voiceSources = JSON.parse(row.voiceSourcesJson || '[]');
      } catch {
        voiceSources = [];
      }

      const photos = photoStmt.all(row.productId) as Array<{ id: string; path: string; width: number; height: number }>;

      return {
        ...row,
        tags,
        voiceSources,
        photos,
      };
    });

    return NextResponse.json({ listings: result });
  } catch (err: any) {
    console.error('Failed to query listings:', err);
    return NextResponse.json({ error: 'Failed to retrieve listings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productName,
      platform = 'Etsy',
      status = 'draft',
      title,
      description,
      tags = [],
      category,
      priceMin,
      priceMax,
      language = 'English',
      modelUsed = 'gemma3:4b',
      voiceSources = [],
      photos = [], // Array of path strings or base64 data URLs
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required to save a listing.' },
        { status: 400 }
      );
    }

    const productId = crypto.randomUUID();
    const listingId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertProduct = db.prepare(`
      INSERT INTO products (id, name, platform, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertListing = db.prepare(`
      INSERT INTO listings (
        id, product_id, title, description, tags_json, category,
        price_min, price_max, language, model_used, voice_sources_json, edited, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPhoto = db.prepare(`
      INSERT INTO photos (id, product_id, path, width, height)
      VALUES (?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insertProduct.run(productId, productName || title.slice(0, 50), platform, status, now);
      insertListing.run(
        listingId,
        productId,
        title,
        description,
        JSON.stringify(tags),
        category || 'General',
        priceMin !== undefined && priceMin !== null ? Number(priceMin) : null,
        priceMax !== undefined && priceMax !== null ? Number(priceMax) : null,
        language,
        modelUsed,
        JSON.stringify(voiceSources),
        0,
        now
      );

      for (const p of photos) {
        const photoId = crypto.randomUUID();
        const photoPath = typeof p === 'string' ? p : p.path || '';
        const width = typeof p === 'object' && p.width ? p.width : 1024;
        const height = typeof p === 'object' && p.height ? p.height : 1024;
        insertPhoto.run(photoId, productId, photoPath, width, height);
      }
    });

    tx();

    return NextResponse.json({
      success: true,
      listingId,
      productId,
    });
  } catch (err: any) {
    console.error('Failed to create listing:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save listing to database.' },
      { status: 500 }
    );
  }
}
