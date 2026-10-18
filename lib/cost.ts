export interface CostItemInput {
  description: string;
  qty: number;
  unitPrice: number;
  allocatedQty?: number; // e.g. 5m used of 50m roll -> allocatedQty: 5
  totalQty?: number;     // 50m
  currency?: string;
  isOverhead?: boolean;
}

export interface UnitCostCalculationParams {
  materials: CostItemInput[];
  packagingCost?: number;
  shippingCost?: number;
  laborHours?: number;
  laborRatePerHour?: number;
  platformFeePct?: number; // e.g. 6.5 for Etsy, 13.25 for eBay
  primaryCurrency?: string;
}

export interface MarginTier {
  marginPct: number;
  suggestedPrice: number;
  platformFeeAmount: number;
  totalCostAtPrice: number;
  netProfit: number;
  effectiveMarginPct: number;
}

export interface UnitCostBreakdown {
  materialsCost: number;
  packagingCost: number;
  shippingCost: number;
  laborCost: number;
  directCost: number; // Sum of materials, packaging, shipping, labor
  platformFeePct: number;
  currency: string;
  margins: {
    margin20: MarginTier;
    margin35: MarginTier;
    margin50: MarginTier;
  };
  hasMixedCurrencies: boolean;
  currenciesFound: string[];
  warnings: string[];
  isLowMarginWarning: boolean;
}

export function calculateItemAllocatedCost(item: CostItemInput): number {
  if (!item || item.qty <= 0 || item.unitPrice <= 0) return 0;

  // Handle fractional allocation (e.g. 5m of 50m roll)
  if (item.allocatedQty !== undefined && item.totalQty !== undefined && item.totalQty > 0) {
    const fraction = Math.min(1, Math.max(0, item.allocatedQty / item.totalQty));
    return (item.unitPrice * item.qty) * fraction;
  }

  return item.unitPrice * item.qty;
}

export function calculateSuggestedPrice(
  directCost: number,
  platformFeePct: number,
  targetMarginPct: number
): MarginTier {
  if (directCost <= 0) {
    return {
      marginPct: targetMarginPct,
      suggestedPrice: 0,
      platformFeeAmount: 0,
      totalCostAtPrice: 0,
      netProfit: 0,
      effectiveMarginPct: 0,
    };
  }

  const feeFraction = (platformFeePct || 0) / 100;
  const marginFraction = targetMarginPct / 100;
  const divisor = 1 - feeFraction - marginFraction;

  let price = 0;
  if (divisor > 0.05) {
    // True economic margin formula: Price * (1 - fee - margin) = DirectCost
    price = directCost / divisor;
  } else {
    // Fallback markup if fee + margin approaches 100%
    price = directCost * (1 + feeFraction + marginFraction);
  }

  price = Math.round(price * 100) / 100;
  const platformFeeAmount = Math.round(price * feeFraction * 100) / 100;
  const totalCostAtPrice = Math.round((directCost + platformFeeAmount) * 100) / 100;
  const netProfit = Math.round((price - totalCostAtPrice) * 100) / 100;
  const effectiveMarginPct = price > 0 ? Math.round((netProfit / price) * 1000) / 10 : 0;

  return {
    marginPct: targetMarginPct,
    suggestedPrice: price,
    platformFeeAmount,
    totalCostAtPrice,
    netProfit,
    effectiveMarginPct,
  };
}

export function computeUnitCost(params: UnitCostCalculationParams): UnitCostBreakdown {
  const {
    materials = [],
    packagingCost = 0,
    shippingCost = 0,
    laborHours = 0,
    laborRatePerHour = 0,
    platformFeePct = 0,
    primaryCurrency = 'USD',
  } = params;

  const warnings: string[] = [];
  const currencies = new Set<string>();

  let materialsCost = 0;
  for (const item of materials) {
    if (item.currency) {
      currencies.add(item.currency.toUpperCase());
    }
    const itemCost = calculateItemAllocatedCost(item);
    materialsCost += itemCost;
  }

  const currenciesFound = Array.from(currencies);
  const hasMixedCurrencies = currenciesFound.length > 1;

  if (hasMixedCurrencies) {
    warnings.push(
      `Multiple currencies detected (${currenciesFound.join(', ')}). No silent conversion was performed. Amounts were calculated using their raw numeric values. Please verify currency parity.`
    );
  }

  const safeMaterialsCost = Math.max(0, Math.round(materialsCost * 100) / 100);
  const safePackagingCost = Math.max(0, Math.round((packagingCost || 0) * 100) / 100);
  const safeShippingCost = Math.max(0, Math.round((shippingCost || 0) * 100) / 100);

  const safeHours = Math.max(0, laborHours || 0);
  const safeRate = Math.max(0, laborRatePerHour || 0);
  const laborCost = Math.round(safeHours * safeRate * 100) / 100;

  const directCost = Math.round((safeMaterialsCost + safePackagingCost + safeShippingCost + laborCost) * 100) / 100;

  const margin20 = calculateSuggestedPrice(directCost, platformFeePct, 20);
  const margin35 = calculateSuggestedPrice(directCost, platformFeePct, 35);
  const margin50 = calculateSuggestedPrice(directCost, platformFeePct, 50);

  const isLowMarginWarning = margin20.effectiveMarginPct < 15;
  if (isLowMarginWarning && directCost > 0) {
    warnings.push('Low margin warning: Effective net margin is under 15% at low tier. Consider revising material allocations or selling price.');
  }

  return {
    materialsCost: safeMaterialsCost,
    packagingCost: safePackagingCost,
    shippingCost: safeShippingCost,
    laborCost,
    directCost,
    platformFeePct,
    currency: primaryCurrency,
    margins: {
      margin20,
      margin35,
      margin50,
    },
    hasMixedCurrencies,
    currenciesFound,
    warnings,
    isLowMarginWarning,
  };
}

export function evaluateCustomPriceMargin(
  sellingPrice: number,
  directCost: number,
  platformFeePct: number
): {
  netProfit: number;
  marginPct: number;
  isRedFlag: boolean;
  warning?: string;
} {
  if (sellingPrice <= 0) {
    return { netProfit: -directCost, marginPct: -100, isRedFlag: true, warning: 'Selling price must be greater than zero.' };
  }

  const fee = sellingPrice * ((platformFeePct || 0) / 100);
  const totalCost = directCost + fee;
  const netProfit = Math.round((sellingPrice - totalCost) * 100) / 100;
  const marginPct = Math.round((netProfit / sellingPrice) * 1000) / 10;
  const isRedFlag = marginPct < 15;

  return {
    netProfit,
    marginPct,
    isRedFlag,
    warning: isRedFlag
      ? `Critical Margin Warning: Profit margin is ${marginPct}% (below the recommended 15% threshold).`
      : undefined,
  };
}
