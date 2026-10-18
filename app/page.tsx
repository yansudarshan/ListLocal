'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShoppingBag,
  Mic,
  Receipt,
  Swords,
  Layers,
  ShieldCheck,
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface HealthData {
  reachable: boolean;
  isMockMode: boolean;
  installedModels: string[];
  missingModels: string[];
  pullCommands: Record<string, string>;
  activeModel: string;
}

interface StatsData {
  listingsCount: number;
  draftsCount: number;
  receiptsCount: number;
  hasVoiceProfile: boolean;
  blockedCount: number;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData>({
    listingsCount: 0,
    draftsCount: 0,
    receiptsCount: 0,
    hasVoiceProfile: false,
    blockedCount: 0,
  });
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [healthRes, listingsRes, voiceRes, receiptsRes, blocksRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/listings'),
          fetch('/api/voice/profile'),
          fetch('/api/receipts'),
          fetch('/api/network-blocks'),
        ]);

        if (healthRes.ok) setHealth(await healthRes.json());
        if (listingsRes.ok) {
          const lData = await listingsRes.json();
          const list = lData.listings || [];
          setRecentListings(list.slice(0, 4));
          setStats((prev) => ({
            ...prev,
            listingsCount: list.length,
            draftsCount: list.filter((item: any) => item.status === 'draft').length,
          }));
        }
        if (voiceRes.ok) {
          const vData = await voiceRes.json();
          setStats((prev) => ({ ...prev, hasVoiceProfile: vData.hasProfile }));
        }
        if (receiptsRes.ok) {
          const rData = await receiptsRes.json();
          setStats((prev) => ({ ...prev, receiptsCount: (rData.receipts || []).length }));
        }
        if (blocksRes.ok) {
          const bData = await blocksRes.json();
          setStats((prev) => ({ ...prev, blockedCount: bData.count || 0 }));
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-10 border border-slate-200/90 shadow-glass">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-400/15 to-teal-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-tr from-indigo-400/10 to-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/90 mb-4 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Local-First AI Back Office &bull; Zero Cloud Egress</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            AI product listings in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600">
              your authentic voice
            </span>
            , with true margin control.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Run product vision extraction, personalized copy generation, receipt line-item scanning, and margin-aware pricing entirely on open-weight models on your machine.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <Link
              href="/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate New Listing</span>
            </Link>
            <Link
              href="/receipts"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-slate-200/90 hover:border-slate-300 font-medium shadow-xs transition-all text-sm"
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Scan Receipts & Costs</span>
            </Link>
            <Link
              href="/wizard"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/70 hover:bg-white text-slate-700 border border-slate-200/80 font-medium shadow-xs transition-all text-sm"
            >
              <Compass className="w-4 h-4 text-amber-500" />
              <span>Setup Wizard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* System Health Status Notice */}
      {health && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-xs ${
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
              <span className="font-semibold text-slate-900">
                {health.isMockMode
                  ? 'Mock LLM Mode Enabled (MOCK_LLM=1)'
                  : health.reachable
                  ? 'Ollama Engine Connected'
                  : 'Ollama Engine Offline'}
              </span>
              <p className="text-slate-600 mt-0.5">
                {health.isMockMode
                  ? 'Using deterministic offline test fixtures for full app demonstration without GPU/Ollama.'
                  : health.reachable
                  ? `Active vision model: ${health.activeModel}. All inference executes locally on localhost.`
                  : 'Ollama service is not reachable on localhost:11434. Start Ollama or set MOCK_LLM=1 in .env.'}
              </p>
            </div>
          </div>

          {health.missingModels && health.missingModels.length > 0 && !health.isMockMode && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Missing models: {health.missingModels.join(', ')}</span>
              <Link href="/wizard" className="text-emerald-700 underline font-medium hover:text-emerald-800">
                View Pull Commands
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Saved Listings</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.listingsCount}</div>
          <p className="text-xs text-slate-500 mt-1.5">{stats.draftsCount} drafts awaiting export</p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Seller Voice Profile</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats.hasVoiceProfile ? 'Trained' : 'Untrained'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {stats.hasVoiceProfile ? 'Few-shot matching active' : 'Import past listings to calibrate'}
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Scanned Receipts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.receiptsCount}</div>
          <p className="text-xs text-slate-500 mt-1.5">Itemized cost allocations</p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Outbound Blocked</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.blockedCount}</div>
          <p className="text-xs text-slate-500 mt-1.5">Strict offline isolation</p>
        </div>
      </div>

      {/* Feature Workspaces Quick Access */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Back Office Workspaces</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/voice"
            className="p-6 rounded-2xl glass-panel glass-panel-hover border border-slate-200/90 flex flex-col justify-between group shadow-glass"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 border border-teal-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-teal-700 transition-colors">
                Voice Learning Studio
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste 5-30 past listings. ListLocal analyzes sentence cadence, emoji habits, and formatting preferences without cloud fine-tuning.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-teal-700 group-hover:gap-2 transition-all">
              <span>Configure Style Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/arena"
            className="p-6 rounded-2xl glass-panel glass-panel-hover border border-slate-200/90 flex flex-col justify-between group shadow-glass"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                <Swords className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-indigo-700 transition-colors">
                Model Arena & Benchmarks
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Benchmark local open models (e.g. gemma3:4b vs llama3.2-vision) head-to-head on the same photos with live tokens/sec and latency.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 group-hover:gap-2 transition-all">
              <span>View Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/batch"
            className="p-6 rounded-2xl glass-panel glass-panel-hover border border-slate-200/90 flex flex-col justify-between group shadow-glass"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 border border-purple-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-purple-700 transition-colors">
                Durable Batch Processing
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload folders of inventory photos. A durable SQLite queue processes listings one at a time, surviving server restarts.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-purple-700 group-hover:gap-2 transition-all">
              <span>Open Batch Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Listings Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Recent Listings</h2>
          <Link href="/library" className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1">
            <span>View All in Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentListings.length === 0 ? (
          <div className="p-10 rounded-2xl glass-panel border border-slate-200/90 text-center shadow-glass">
            <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No listings generated yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload product photos in the generator or run the seed script to populate sample items.
            </p>
            <div className="mt-5">
              <Link
                href="/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create First Listing</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentListings.map((item) => (
              <div key={item.id} className="p-5 rounded-2xl glass-panel border border-slate-200/90 flex flex-col justify-between shadow-glass">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase border border-slate-200">
                      {item.platform}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        item.status === 'listed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    Price: {item.priceMin ? `$${item.priceMin.toFixed(2)}` : 'Not set'}
                  </span>
                  <Link href={`/library?id=${item.id}`} className="text-emerald-700 font-semibold hover:underline">
                    View in Library &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
