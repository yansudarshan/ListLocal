'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Swords,
  Trophy,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';
import { ModelStats } from '@/app/api/arena/leaderboard/route';

export default function ArenaLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<ModelStats[]>([]);
  const [recentBattles, setRecentBattles] = useState<any[]>([]);
  const [totalBattles, setTotalBattles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/arena/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setRecentBattles(data.recentBattles || []);
        setTotalBattles(data.totalBattles || 0);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-semibold border border-indigo-200/90 mb-3 shadow-2xs">
            <Swords className="w-4 h-4 text-indigo-600" />
            <span>Open-Weight Vision Benchmarks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Model Arena Leaderboard</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Compare open-weight vision models head-to-head on the exact same product photos. Evaluate copywriting tone, latency, and tokens/sec.
          </p>
        </div>

        <Link
          href="/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Swords className="w-4 h-4" />
          <span>Launch Battle in Generator</span>
        </Link>
      </div>

      {/* Leaderboard Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading arena metrics...</div>
      ) : leaderboard.length === 0 ? (
        <div className="p-10 rounded-3xl glass-panel border border-slate-200/90 text-center space-y-3 shadow-glass">
          <Trophy className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No arena battles recorded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Enable the &ldquo;Compare two models&rdquo; toggle in the New Listing generator to run your first head-to-head comparison.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {leaderboard.map((model, idx) => (
            <div
              key={model.model}
              className={`p-6 rounded-3xl glass-panel border relative overflow-hidden flex flex-col justify-between shadow-glass ${
                idx === 0
                  ? 'border-indigo-300 bg-indigo-50/50'
                  : 'border-slate-200/90'
              }`}
            >
              {idx === 0 && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3.5 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>CURRENT CHAMPION</span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold">Rank #{idx + 1}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-mono">{model.model}</h3>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Win Rate</span>
                    <span className="text-xl font-extrabold text-emerald-700">{model.winRate}%</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                      {model.wins}/{model.totalMatches} wins
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Speed</span>
                    <span className="text-xl font-extrabold text-teal-700">{model.avgTps}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">tokens / sec</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Avg Latency</span>
                    <span className="text-xl font-extrabold text-indigo-700">{model.avgLatencyMs}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">milliseconds</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Runs 100% locally on Ollama</span>
                <span className="font-mono text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Zero API fees</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Model Pull Instructions Guide */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-600" />
          <span>Install Any 2 Local Vision Models</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The arena automatically benchmarks any 2 installed Ollama vision models. Recommended models for 8GB+ RAM:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
            <div>
              <div className="font-bold text-slate-900 font-mono">gemma3:4b (Default Model A)</div>
              <div className="text-[11px] text-slate-500">Google open weights, ultra-efficient on 8GB RAM</div>
            </div>
            <button
              type="button"
              onClick={() => copyCommand('ollama pull gemma3:4b')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Copy pull command"
            >
              {copiedCmd === 'ollama pull gemma3:4b' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
            <div>
              <div className="font-bold text-slate-900 font-mono">llama3.2-vision (Default Model B)</div>
              <div className="text-[11px] text-slate-500">Meta multimodal vision model, crisp detail detection</div>
            </div>
            <button
              type="button"
              onClick={() => copyCommand('ollama pull llama3.2-vision')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Copy pull command"
            >
              {copiedCmd === 'ollama pull llama3.2-vision' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Battles Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Recent Battle History ({totalBattles})</h2>
        {recentBattles.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel border border-slate-200/90 text-center text-xs text-slate-500 shadow-glass">
            No battle history found.
          </div>
        ) : (
          <div className="rounded-2xl glass-panel border border-slate-200/90 overflow-hidden divide-y divide-slate-100 text-xs shadow-glass">
            {recentBattles.map((b) => (
              <div key={b.created_at} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/70 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Swords className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono text-slate-900 font-bold">
                      {b.model_a} vs {b.model_b}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(b.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-[11px] text-slate-500 font-medium">
                    <div>{b.latency_a_ms}ms ({b.tps_a} tps) vs {b.latency_b_ms}ms ({b.tps_b} tps)</div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shadow-2xs">
                    Winner: {b.winner}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
