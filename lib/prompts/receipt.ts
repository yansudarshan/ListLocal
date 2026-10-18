import { FORBIDDEN_FABRICATION_DIRECTIVE } from './common';

export function buildReceiptExtractionPrompt(): string {
  return `You are a meticulous financial auditor specializing in inventory receipts and invoices.
Analyze the provided receipt/invoice document image with absolute precision.

${FORBIDDEN_FABRICATION_DIRECTIVE}

Extract all information and return ONLY a valid JSON object matching this structure:
{
  "vendor": "Name of supplier or store",
  "date": "YYYY-MM-DD" (or date as printed),
  "line_items": [
    {
      "description": "Item or raw material description as printed",
      "qty": 1.0,
      "unit_price": 12.50
    }
  ],
  "total": 12.50,
  "currency": "USD" | "INR" | "EUR" | "GBP" (currency symbol or code found on receipt)
}

Extraction rules:
- Extract ONLY items, prices, and quantities explicitly written on the receipt.
- Do NOT guess or invent extra discounts, items, or taxes not printed on the document.
- Unit price should be the price per unit. If only total item price is printed and qty is 1, unit_price = total item price.
- Return ONLY valid raw JSON with no markdown wrapping or notes.`;
}

export function buildReceiptRepairPrompt(failedResponse: string, errorMessage: string): string {
  return `Your previous receipt JSON failed validation.
Error: ${errorMessage}

Previous output:
${failedResponse}

${FORBIDDEN_FABRICATION_DIRECTIVE}

Please correct the receipt JSON so it matches the requested schema. Return ONLY valid raw JSON.`;
}

export function buildMarginExplanationPrompt(params: {
  productName: string;
  totalCost: number;
  currency: string;
  marginPct: number;
  suggestedPrice: number;
}): string {
  const { productName, totalCost, currency, marginPct, suggestedPrice } = params;
  return `You are an ethical e-commerce pricing advisor.

${FORBIDDEN_FABRICATION_DIRECTIVE}

Data provided:
- Product: "${productName}"
- True unit cost: ${currency} ${totalCost.toFixed(2)}
- Target profit margin: ${marginPct}%
- Calculated suggested selling price: ${currency} ${suggestedPrice.toFixed(2)}

Task: Write EXACTLY ONE concise sentence explaining this suggested price based ONLY on the verified cost of ${currency} ${totalCost.toFixed(
    2
  )} and the ${marginPct}% target margin.
DO NOT mention competitor prices, market averages, or external trends. Return ONLY the single sentence.`;
}
