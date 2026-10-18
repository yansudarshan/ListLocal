'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Percent,
  Clock,
  Box,
  Truck,
} from 'lucide-react';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Product cost inspection state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [costBreakdown, setCostBreakdown] = useState<any | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);

  // Load receipts and products
  const loadData = useCallback(async () => {
    try {
      const [rRes, pRes] = await Promise.all([fetch('/api/receipts'), fetch('/api/listings')]);
      if (rRes.ok) {
        const rData = await rRes.json();
        setReceipts(rData.receipts || []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        const productList = (pData.listings || []).map((l: any) => ({
          id: l.productId,
          name: l.productName || l.title,
          platform: l.platform,
        }));
        setProducts(productList);
        if (productList.length > 0) {
          setSelectedProductId((prev) => (prev ? prev : productList[0].id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Inspect unit cost when selected product changes
  useEffect(() => {
    if (!selectedProductId) return;
    setLoadingCost(true);
    fetch(`/api/costs/${selectedProductId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCostBreakdown(data);
      })
      .catch(console.error)
      .finally(() => setLoadingCost(false));
  }, [selectedProductId, receipts]);

  // Handle Receipt Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setScanning(true);
      setScanError(null);
      setScanResult(null);

      try {
        const res = await fetch('/api/receipts/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dataUrl,
            imagePath: file.name,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to scan receipt.');
        }

        setScanResult(data);
        await loadData();
      } catch (err: any) {
        setScanError(err.message || 'Error occurred while scanning.');
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Assign line item to product or overhead
  const handleAssignItem = async (itemId: string, productId: string | null, isOverhead = false) => {
    try {
      await fetch('/api/receipts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          productId: isOverhead ? null : productId,
          isOverhead,
        }),
      });
      await loadData();
    } catch (err) {
      console.error('Assignment error:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200/90 mb-3 shadow-2xs">
          <Receipt className="w-4 h-4 text-amber-600" />
          <span>Audited Receipt Scanning & Margin Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Receipts & Cost Engine</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
          Upload receipt photos or PDFs. Local vision models extract line items with automated math validation. Allocate raw materials to calculate your true unit cost and platform-fee-aware margin pricing.
        </p>
      </div>

      {/* Upload & Scanner Box */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Upload className="w-4 h-4 text-amber-600" />
          <span>Upload Receipt Photo or PDF</span>
        </h2>

        <div className="relative border-2 border-dashed border-slate-300/90 hover:border-amber-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-amber-50/20 hover:bg-amber-50/40">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileUpload}
            disabled={scanning}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 border border-amber-200 shadow-2xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {scanning ? 'Analyzing receipt document with local vision...' : 'Drop receipt photo or invoice PDF here'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WEBP, PDF invoices</p>
        </div>

        {scanError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {scanError}
          </div>
        )}

        {/* Scan Result Notice & Math Sanity Check */}
        {scanResult && (
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                Extracted: {scanResult.receipt.vendor} &bull; {scanResult.receipt.currency} {scanResult.receipt.total.toFixed(2)}
              </span>

              {scanResult.mathCheck?.isMatch ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Math Verified (Sum matches Total)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Math Mismatch Flagged</span>
                </span>
              )}
            </div>

            {scanResult.mathCheck?.warning && (
              <p className="text-amber-700 text-[11px] font-medium">{scanResult.mathCheck.warning}</p>
            )}
          </div>
        )}
      </div>

      {/* Main Split: Line Items Allocation & Product Unit Cost Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Scanned Line Items & Assignment Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Extracted Receipt Line Items</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">{receipts.length} receipts logged</span>
            </div>

            {receipts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No receipts scanned yet. Upload an inventory receipt above or run the seed script.
              </div>
            ) : (
              <div className="space-y-4">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="font-bold text-slate-900">{receipt.vendor}</span>
                        <span className="text-slate-500 ml-2">&bull; {receipt.date}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {receipt.currency} {receipt.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {(receipt.items || []).map((item: any) => (
                        <div key={item.id} className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-slate-800 font-medium">{item.description}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Qty: {item.qty} &times; ${item.unitPrice.toFixed(2)} = ${(item.qty * item.unitPrice).toFixed(2)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Product Assignment Dropdown */}
                            <select
                              value={item.isOverhead ? 'overhead' : item.productId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'overhead') {
                                  handleAssignItem(item.id, null, true);
                                } else {
                                  handleAssignItem(item.id, val || null, false);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">Unassigned</option>
                              <option value="overhead">Mark as Overhead</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  Assign: {p.name.slice(0, 24)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: True Cost & Margin Pricing Calculator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Unit Cost & Margin Pricing</span>
              </h2>
            </div>

            {/* Product Selector */}
            <div className="text-xs space-y-1.5">
              <label className="text-slate-600 font-semibold">Select Product to Audit:</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.platform})
                  </option>
                ))}
              </select>
            </div>

            {loadingCost ? (
              <div className="p-8 text-center text-xs text-slate-500">Computing cost metrics...</div>
            ) : costBreakdown && costBreakdown.breakdown ? (
              <div className="space-y-5 text-xs">
                {/* Direct Cost Breakdown Table */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Direct Unit Cost Breakdown
                  </div>

                  <div className="space-y-1.5 pt-1 text-slate-700">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Box className="w-3.5 h-3.5 text-amber-500" />
                        <span>Materials ({costBreakdown.allocatedItems?.length || 0} items)</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        ${costBreakdown.breakdown.materialsCost.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Box className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Packaging</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        ${costBreakdown.breakdown.packagingCost.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Truck className="w-3.5 h-3.5 text-teal-500" />
                        <span>Shipping</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        ${costBreakdown.breakdown.shippingCost.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span>Labor (15m finishing)</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        ${costBreakdown.breakdown.laborCost.toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                      <span>Total Direct Cost:</span>
                      <span className="text-emerald-700 font-mono text-base">
                        ${costBreakdown.breakdown.directCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Margin Pricing Tiers (20%, 35%, 50%) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Suggested Selling Prices (Platform: {costBreakdown.platform})</span>
                  </h3>

                  {/* 20% Tier */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">20% Margin Tier (Competitive)</span>
                      <span className="text-sm font-mono font-bold text-emerald-700">
                        ${costBreakdown.breakdown.margins.margin20.suggestedPrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">
                      &ldquo;{costBreakdown.explanations.margin20}&rdquo;
                    </p>
                  </div>

                  {/* 35% Tier (Target) */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900">35% Margin Tier (Target Recommended)</span>
                      <span className="text-sm font-mono font-bold text-emerald-700">
                        ${costBreakdown.breakdown.margins.margin35.suggestedPrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 italic font-medium">
                      &ldquo;{costBreakdown.explanations.margin35}&rdquo;
                    </p>
                  </div>

                  {/* 50% Tier (Premium) */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">50% Margin Tier (Artisan Premium)</span>
                      <span className="text-sm font-mono font-bold text-emerald-700">
                        ${costBreakdown.breakdown.margins.margin50.suggestedPrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">
                      &ldquo;{costBreakdown.explanations.margin50}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Mixed Currencies or Low Margin Warnings */}
                {costBreakdown.breakdown.warnings && costBreakdown.breakdown.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1 font-medium">
                    {costBreakdown.breakdown.warnings.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                Assign line items to this product on the left to see unit cost calculations.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
