import { z } from 'zod';

export const ReceiptItemExtractionSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  qty: z.number().positive('Quantity must be greater than 0').default(1),
  unit_price: z.number().nonnegative('Unit price must be non-negative'),
});

export const ReceiptExtractionSchema = z.object({
  vendor: z.string().min(1, 'Vendor is required'),
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  line_items: z.array(ReceiptItemExtractionSchema).min(1, 'At least one line item is required'),
  total: z.number().nonnegative('Total must be non-negative'),
  currency: z.string().min(1).default('USD'),
});

export type ReceiptItemExtraction = z.infer<typeof ReceiptItemExtractionSchema>;
export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

export interface ReceiptMathCheckResult {
  calculatedSum: number;
  extractedTotal: number;
  diff: number;
  isMatch: boolean;
  warning?: string;
}

export function checkReceiptMath(receipt: ReceiptExtraction): ReceiptMathCheckResult {
  const calculatedSum = receipt.line_items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const roundedSum = Math.round(calculatedSum * 100) / 100;
  const roundedTotal = Math.round(receipt.total * 100) / 100;
  const diff = Math.round(Math.abs(roundedSum - roundedTotal) * 100) / 100;

  // Allow up to 0.05 discrepancy for tax / rounding
  const isMatch = diff <= 0.05;
  const warning = !isMatch
    ? `Calculated line items sum (${receipt.currency} ${roundedSum.toFixed(2)}) does not match receipt total (${receipt.currency} ${roundedTotal.toFixed(2)}). Diff: ${receipt.currency} ${diff.toFixed(2)}. Flagged for manual review.`
    : undefined;

  return {
    calculatedSum: roundedSum,
    extractedTotal: roundedTotal,
    diff,
    isMatch,
    warning,
  };
}
