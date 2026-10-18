import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const row = db.prepare(`
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
      WHERE l.id = ?
    `).get(id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    const photos = db.prepare('SELECT id, path, width, height FROM photos WHERE product_id = ?').all(row.productId);

    return NextResponse.json({
      ...row,
      tags: JSON.parse(row.tagsJson || '[]'),
      voiceSources: JSON.parse(row.voiceSourcesJson || '[]'),
      photos,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve listing details.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const existing = db.prepare('SELECT product_id FROM listings WHERE id = ?').get(id) as { product_id: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    const updateFields: string[] = ['edited = 1'];
    const updateParams: any[] = [];

    if (body.title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(body.title);
    }
    if (body.description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(body.description);
    }
    if (body.tags !== undefined) {
      updateFields.push('tags_json = ?');
      updateParams.push(JSON.stringify(body.tags));
    }
    if (body.category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(body.category);
    }
    if (body.priceMin !== undefined) {
      updateFields.push('price_min = ?');
      updateParams.push(body.priceMin !== null ? Number(body.priceMin) : null);
    }
    if (body.priceMax !== undefined) {
      updateFields.push('price_max = ?');
      updateParams.push(body.priceMax !== null ? Number(body.priceMax) : null);
    }

    const tx = db.transaction(() => {
      if (updateFields.length > 0) {
        updateParams.push(id);
        db.prepare(`UPDATE listings SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);
      }

      if (body.status !== undefined) {
        db.prepare('UPDATE products SET status = ? WHERE id = ?').run(body.status, existing.product_id);
      }
      if (body.platform !== undefined) {
        db.prepare('UPDATE products SET platform = ? WHERE id = ?').run(body.platform, existing.product_id);
      }
    });

    tx();

    return NextResponse.json({ success: true, updatedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update listing.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const row = db.prepare('SELECT product_id FROM listings WHERE id = ?').get(id) as { product_id: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    // Cascade deletes photos and listings when deleting product
    db.prepare('DELETE FROM products WHERE id = ?').run(row.product_id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete listing.' }, { status: 500 });
  }
}
