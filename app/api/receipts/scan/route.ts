import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { scanReceipt } from '@/lib/ollama';
import { checkReceiptMath } from '@/lib/schemas/receipt';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawImage = body.image || '';

    if (!rawImage) {
      return NextResponse.json({ error: 'Please upload a receipt photo or PDF.' }, { status: 400 });
    }

    // Clean base64
    let cleanBase64 = rawImage;
    const match = rawImage.match(/^data:(?:image\/[a-z]+|application\/pdf);base64,(.+)$/i);
    if (match) {
      cleanBase64 = match[1];
    }

    // Extract receipt data via Ollama vision or deterministic mock
    const extracted = await scanReceipt(cleanBase64);

    // Math sanity check
    const mathCheck = checkReceiptMath(extracted);

    // Persist receipt to SQLite
    const receiptId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertReceipt = db.prepare(`
      INSERT INTO receipts (id, vendor, date, total, currency, raw_json, image_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO receipt_items (id, receipt_id, description, qty, unit_price, product_id, is_overhead)
      VALUES (?, ?, ?, ?, ?, NULL, 0)
    `);

    const tx = db.transaction(() => {
      insertReceipt.run(
        receiptId,
        extracted.vendor,
        extracted.date,
        extracted.total,
        extracted.currency,
        JSON.stringify(extracted),
        body.imagePath || '',
        now
      );

      for (const item of extracted.line_items) {
        const itemId = crypto.randomUUID();
        insertItem.run(itemId, receiptId, item.description, item.qty, item.unit_price);
      }
    });

    tx();

    return NextResponse.json({
      success: true,
      receiptId,
      receipt: extracted,
      mathCheck,
    });
  } catch (err: any) {
    console.error('Receipt scanning failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to scan receipt. Please verify image and Ollama vision model.' },
      { status: 500 }
    );
  }
}
