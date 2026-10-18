'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Cpu,
  DollarSign,
  Mic,
  Sparkles,
} from 'lucide-react';

export default function SetupWizardPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Settings form state
  const [currency, setCurrency] = useState('USD');
  const [etsyFee, setEtsyFee] = useState('6.5');
  const [ebayFee, setEbayFee] = useState('13.25');
  const [laborRate, setLaborRate] = useState('25.00');
  const [packagingCost, setPackagingCost] = useState('2.50');
  const [shippingCost, setShippingCost] = useState('4.50');
  const [savingSettings, setSavingSettings] = useState(false);

  // Voice import state
  const [voiceText, setVoiceText] = useState('');
  const [voiceImporting, setVoiceImporting] = useState(false);
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Load existing settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.currency) setCurrency(data.currency);
        if (data.etsy_fee_pct) setEtsyFee(data.etsy_fee_pct);
        if (data.ebay_fee_pct) setEbayFee(data.ebay_fee_pct);
        if (data.labor_rate_per_hour) setLaborRate(data.labor_rate_per_hour);
        if (data.default_packaging_cost) setPackagingCost(data.default_packaging_cost);
        if (data.default_shipping_cost) setShippingCost(data.default_shipping_cost);
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          etsy_fee_pct: etsyFee,
          ebay_fee_pct: ebayFee,
          labor_rate_per_hour: laborRate,
          default_packaging_cost: packagingCost,
          default_shipping_cost: shippingCost,
        }),
      });
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVoiceImport = async () => {
    if (!voiceText.trim()) return;
    setVoiceImporting(true);
    setVoiceError(null);
    try {
      const res = await fetch('/api/voice/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoiceError(data.error || 'Failed to import voice samples.');
      } else {
        setVoiceResult(data);
        setCurrentStep(4);
      }
    } catch (err: any) {
      setVoiceError(err.message || 'Error importing listings.');
    } finally {
      setVoiceImporting(false);
    }
  };

  const loadSampleVoice = () => {
    setVoiceText(`Handcrafted terracotta stoneware mug thrown with mindful patience on the pottery wheel. Features subtle ribbing for sensory tactile comfort and a rich speckle glaze.
---
Artisan hand-pinched ceramic salt cellar with matching olivewood spoon. Organic wabi-sabi rim and unglazed earthy base.
---
Wheel-thrown ceramic pour-over coffee dripper in speckled sand cream. Fits standard v60 filters and matches our studio mug collection.
---
Rustic stoneware tapas bowl set of 3 with warm terracotta dipped edges. Microwave, dishwasher, and food safe.`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Step Progress Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">First-Run Setup Wizard</h1>
            <p className="text-xs text-slate-500 mt-1">Configure local models, platform economics, and your seller voice.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs">
            Step {currentStep} of 4
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Check Ollama */}
      {currentStep === 1 && (
        <div className="p-8 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">1. Verify Local Ollama Inference Engine</h2>
              <p className="text-xs text-slate-500">
                ListLocal runs 100% locally on your machine. Check that Ollama is reachable and required models are installed.
              </p>
            </div>
          </div>

          {healthLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Checking Ollama status on localhost:11434...</div>
          ) : health ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between shadow-2xs ${
                  health.reachable
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {health.reachable ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900">
                      {health.isMockMode
                        ? 'Mock LLM Mode Active (MOCK_LLM=1)'
                        : health.reachable
                        ? 'Ollama Service Connected'
                        : 'Ollama Unreachable'}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {health.isMockMode
                        ? 'Simulated deterministic fixtures active. All features testable immediately without model downloads.'
                        : health.reachable
                        ? 'Connected to http://localhost:11434'
                        : 'Could not connect to localhost:11434. Make sure Ollama is running.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchHealth}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recheck</span>
                </button>
              </div>

              {/* Models List & Pull Commands */}
              {!health.isMockMode && health.pullCommands && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-slate-800">Required Open-Weight Models</h3>
                  {Object.entries(health.pullCommands as Record<string, string>).map(([model, cmd]) => {
                    const isInstalled = health.installedModels.some(
                      (m: string) => m === model || m.startsWith(`${model}:`)
                    );
                    return (
                      <div
                        key={model}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {isInstalled ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          )}
                          <span className="font-mono text-slate-900 font-bold">{model}</span>
                          <span className="text-slate-500 font-medium">({isInstalled ? 'Installed' : 'Missing'})</span>
                        </div>

                        {!isInstalled && (
                          <div className="flex items-center gap-2">
                            <code className="px-2.5 py-1 bg-slate-100 rounded-lg text-emerald-800 font-mono text-[11px] font-semibold border border-slate-200">
                              {cmd}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(cmd, model)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                              title="Copy command"
                            >
                              {copiedKey === model ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Continue to Fees & Economics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Settings & Economics */}
      {currentStep === 2 && (
        <div className="p-8 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-2xs">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">2. Currency & Platform Fees</h2>
              <p className="text-xs text-slate-500">
                Configure your baseline fee percentages and labor valuation for margin-aware pricing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Primary Currency Code</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Hourly Labor Valuation ({currency})</label>
              <input
                type="number"
                step="0.5"
                value={laborRate}
                onChange={(e) => setLaborRate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Etsy Fee Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                value={etsyFee}
                onChange={(e) => setEtsyFee(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              <span className="text-[10px] text-slate-500 font-medium">Transaction + listing fee (Default 6.5%)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">eBay Fee Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                value={ebayFee}
                onChange={(e) => setEbayFee(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              <span className="text-[10px] text-slate-500 font-medium">Standard final value fee (Default 13.25%)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Default Packaging Cost ({currency})</label>
              <input
                type="number"
                step="0.1"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Default Outbound Shipping ({currency})</label>
              <input
                type="number"
                step="0.1"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>{savingSettings ? 'Saving...' : 'Save & Continue to Voice'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Seller Voice Import */}
      {currentStep === 3 && (
        <div className="p-8 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center border border-teal-200 shadow-2xs">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">3. Calibrate Your Authentic Seller Voice</h2>
              <p className="text-xs text-slate-500">
                Paste past listings separated by &ldquo;---&rdquo;. ListLocal computes your style profile and stores embeddings locally for few-shot copy generation.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-700 font-semibold">Paste 5 to 30 past listings:</label>
              <button
                type="button"
                onClick={loadSampleVoice}
                className="text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
              >
                Load sample artisan listings
              </button>
            </div>

            <textarea
              rows={8}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Paste listing 1...&#10;---&#10;Paste listing 2...&#10;---&#10;Paste listing 3..."
              className="w-full p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono shadow-2xs leading-relaxed"
            />

            {voiceError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {voiceError}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleVoiceImport}
                disabled={voiceImporting || !voiceText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <span>{voiceImporting ? 'Analyzing Voice...' : 'Analyze & Learn Voice'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Completion */}
      {currentStep === 4 && (
        <div className="p-10 rounded-3xl glass-panel border border-slate-200/90 shadow-glass text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Setup Complete!</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your back office is fully initialized. Your settings are stored in local SQLite, your voice profile is ready for few-shot prompt injection, and all requests remain 100% offline.
            </p>
          </div>

          {voiceResult && voiceResult.profile && (
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-left text-xs space-y-1.5">
              <div className="font-bold text-emerald-800">Calibrated Tone:</div>
              <div className="text-slate-700 font-medium">{voiceResult.profile.tone_summary}</div>
              <div className="text-slate-500 text-[11px] pt-1.5 border-t border-slate-100">
                Avg Sentence: {voiceResult.profile.avg_sentence_length} words &bull; Emojis: {(voiceResult.profile.emoji_usage_rate * 100).toFixed(0)}%
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/25 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Your First Listing</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm shadow-2xs transition-all"
            >
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
