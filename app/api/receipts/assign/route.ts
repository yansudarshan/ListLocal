import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, productId, isOverhead, description, qty, unitPrice } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (productId !== undefined) {
      updates.push('product_id = ?');
      params.push(productId || null);
    }
    if (isOverhead !== undefined) {
      updates.push('is_overhead = ?');
      params.push(isOverhead ? 1 : 0);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (qty !== undefined) {
      updates.push('qty = ?');
      params.push(Number(qty));
    }
    if (unitPrice !== undefined) {
      updates.push('unit_price = ?');
      params.push(Number(unitPrice));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update provided.' }, { status: 400 });
    }

    params.push(itemId);
    db.prepare(`UPDATE receipt_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    return NextResponse.json({ success: true, itemId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update receipt item.' }, { status: 500 });
  }
}
