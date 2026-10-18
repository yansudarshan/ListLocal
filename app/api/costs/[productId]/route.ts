import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { computeUnitCost } from '@/lib/cost';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;

    const product = db.prepare('SELECT id, name, platform, status FROM products WHERE id = ?').get(productId) as
      | { id: string; name: string; platform: string; status: string }
      | undefined;

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Load assigned receipt items
    const items = db.prepare(`
      SELECT ri.id, ri.description, ri.qty, ri.unit_price as unitPrice, r.currency
      FROM receipt_items ri
      JOIN receipts r ON ri.receipt_id = r.id
      WHERE ri.product_id = ?
    `).all(productId) as Array<{ id: string; description: string; qty: number; unitPrice: number; currency: string }>;

    // Load settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    settingsRows.forEach((r) => {
      settings[r.key] = r.value;
    });

    const feePct = product.platform === 'eBay'
      ? parseFloat(settings.ebay_fee_pct || '13.25')
      : parseFloat(settings.etsy_fee_pct || '6.5');

    const packagingCost = parseFloat(settings.default_packaging_cost || '2.00');
    const shippingCost = parseFloat(settings.default_shipping_cost || '4.00');
    const laborRate = parseFloat(settings.labor_rate_per_hour || '25.00');
    const currency = settings.currency || 'USD';

    // Compute unit cost
    const breakdown = computeUnitCost({
      materials: items.map((i) => ({
        description: i.description,
        qty: i.qty,
        unitPrice: i.unitPrice,
        currency: i.currency,
      })),
      packagingCost,
      shippingCost,
      laborHours: 0.25, // 15 mins default crafting/finishing
      laborRatePerHour: laborRate,
      platformFeePct: feePct,
      primaryCurrency: currency,
    });

    // Generate strict 1-sentence explanations based purely on verified numbers
    const cost = breakdown.directCost;
    const explanations = {
      margin20: `With an audited direct unit cost of ${currency} ${cost.toFixed(2)}, pricing at ${currency} ${breakdown.margins.margin20.suggestedPrice.toFixed(2)} maintains a 20% margin while absorbing the ${feePct}% ${product.platform} fee.`,
      margin35: `Pricing at ${currency} ${breakdown.margins.margin35.suggestedPrice.toFixed(2)} yields your target 35% net profit margin on a verified unit cost of ${currency} ${cost.toFixed(2)}.`,
      margin50: `At ${currency} ${breakdown.margins.margin50.suggestedPrice.toFixed(2)}, you capture a premium 50% margin over the direct unit manufacturing cost of ${currency} ${cost.toFixed(2)}.`,
    };

    return NextResponse.json({
      productId,
      productName: product.name,
      platform: product.platform,
      allocatedItems: items,
      breakdown,
      explanations,
    });
  } catch (err: any) {
    console.error('Failed to calculate cost for product:', err);
    return NextResponse.json({ error: 'Failed to compute unit costs.' }, { status: 500 });
  }
}
