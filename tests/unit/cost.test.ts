import { describe, it, expect } from 'vitest';
import {
  calculateItemAllocatedCost,
  calculateSuggestedPrice,
  computeUnitCost,
  evaluateCustomPriceMargin,
} from '@/lib/cost';

describe('Cost Engine Math & Edge Cases', () => {
  it('calculates direct item costs correctly', () => {
    const cost = calculateItemAllocatedCost({
      description: 'Clay 10kg',
      qty: 2,
      unitPrice: 15.0,
    });
    expect(cost).toBe(30.0);
  });

  it('calculates fractional allocations correctly (e.g., 5m of 50m roll)', () => {
    const cost = calculateItemAllocatedCost({
      description: 'Ribbon spool',
      qty: 1,
      unitPrice: 50.0,
      allocatedQty: 5,
      totalQty: 50,
    });
    expect(cost).toBe(5.0);
  });

  it('handles zero or negative quantities safely', () => {
    expect(calculateItemAllocatedCost({ description: 'None', qty: 0, unitPrice: 10 })).toBe(0);
    expect(calculateItemAllocatedCost({ description: 'None', qty: -5, unitPrice: 10 })).toBe(0);
    expect(calculateItemAllocatedCost({ description: 'None', qty: 2, unitPrice: 0 })).toBe(0);
  });

  it('calculates suggested prices with margin and platform fee formula accurately', () => {
    const directCost = 20.0;
    const platformFeePct = 6.5; // Etsy 6.5%
    const margin20 = calculateSuggestedPrice(directCost, platformFeePct, 20);

    // Divisor = 1 - 0.065 - 0.20 = 0.735 -> 20 / 0.735 = 27.21
    expect(margin20.suggestedPrice).toBe(27.21);
    expect(margin20.platformFeeAmount).toBeCloseTo(1.77, 1);
    expect(margin20.netProfit).toBeGreaterThan(0);
    expect(margin20.effectiveMarginPct).toBeGreaterThanOrEqual(18);
  });

  it('computes full unit cost breakdown with labor and shipping', () => {
    const result = computeUnitCost({
      materials: [
        { description: 'Clay', qty: 1, unitPrice: 5.0 },
        { description: 'Glaze', qty: 1, unitPrice: 3.5 },
      ],
      packagingCost: 2.0,
      shippingCost: 4.5,
      laborHours: 0.5,
      laborRatePerHour: 30.0, // $15 labor
      platformFeePct: 6.5,
      primaryCurrency: 'USD',
    });

    // directCost = 5.0 + 3.5 + 2.0 + 4.5 + 15.0 = 30.0
    expect(result.materialsCost).toBe(8.5);
    expect(result.packagingCost).toBe(2.0);
    expect(result.shippingCost).toBe(4.5);
    expect(result.laborCost).toBe(15.0);
    expect(result.directCost).toBe(30.0);
    expect(result.margins.margin20.suggestedPrice).toBeGreaterThan(30.0);
    expect(result.margins.margin35.suggestedPrice).toBeGreaterThan(result.margins.margin20.suggestedPrice);
    expect(result.margins.margin50.suggestedPrice).toBeGreaterThan(result.margins.margin35.suggestedPrice);
    expect(result.hasMixedCurrencies).toBe(false);
  });

  it('flags warning for mixed currencies without silent conversion', () => {
    const result = computeUnitCost({
      materials: [
        { description: 'US Clay', qty: 1, unitPrice: 10, currency: 'USD' },
        { description: 'Italian Glaze', qty: 1, unitPrice: 15, currency: 'EUR' },
      ],
      primaryCurrency: 'USD',
    });

    expect(result.hasMixedCurrencies).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Multiple currencies detected');
  });

  it('flags red flag warning when custom price margin is below 15%', () => {
    // directCost = 20, sellingPrice = 21, fee 6.5% = 1.365 -> profit = 21 - 21.365 = negative
    const lowMargin = evaluateCustomPriceMargin(21, 20, 6.5);
    expect(lowMargin.isRedFlag).toBe(true);
    expect(lowMargin.warning).toBeDefined();

    // Healthy margin: directCost = 20, sellingPrice = 40, fee 6.5% = 2.6 -> profit = 17.4 -> 43.5% margin
    const healthyMargin = evaluateCustomPriceMargin(40, 20, 6.5);
    expect(healthyMargin.isRedFlag).toBe(false);
    expect(healthyMargin.marginPct).toBeGreaterThan(15);
  });
});
