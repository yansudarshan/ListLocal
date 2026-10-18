import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const receipts = db
      .prepare('SELECT id, vendor, date, total, currency, image_path, created_at FROM receipts ORDER BY date DESC')
      .all() as any[];

    const itemStmt = db.prepare(`
      SELECT 
        ri.id, 
        ri.receipt_id as receiptId, 
        ri.description, 
        ri.qty, 
        ri.unit_price as unitPrice, 
        ri.product_id as productId, 
        ri.is_overhead as isOverhead,
        p.name as productName
      FROM receipt_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ri.receipt_id = ?
    `);

    const result = receipts.map((r) => {
      const items = itemStmt.all(r.id);
      return {
        ...r,
        items,
      };
    });

    return NextResponse.json({ receipts: result });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve receipts.' }, { status: 500 });
  }
}
