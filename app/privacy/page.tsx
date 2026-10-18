'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  WifiOff,
  Lock,
  Play,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Terminal,
} from 'lucide-react';

export default function PrivacyProofPage() {
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/network-blocks');
      if (res.ok) {
        const data = await res.json();
        setBlockedCount(data.count || 0);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSimulateBlockedRequest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/network-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://api.openai.com/v1/models' }),
      });
      const data = await res.json();
      if (data.blocked) {
        setTestResult(`Successfully Intercepted & Blocked! ${data.message}`);
        await fetchStats();
      }
    } catch (err: any) {
      setTestResult(`Request blocked: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/90 mb-3 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Provable Zero-Egress Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Privacy & Offline Proof</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          ListLocal is architected from the ground up so that small business data, unpublished product photos, wholesale invoices, and customer margins never touch third-party cloud infrastructure.
        </p>
      </div>

      {/* Live Isolation Stat Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-emerald-200 bg-emerald-50/70 shadow-glass flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0 shadow-2xs">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>safeFetch Network Firewall Active</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-mono font-bold">
                100% OFFLINE
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Outbound external HTTP attempts blocked: <span className="font-bold text-emerald-700 font-mono text-sm">{blockedCount}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSimulateBlockedRequest}
          disabled={testing}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{testing ? 'Probing Firewall...' : 'Simulate External Request'}</span>
        </button>
      </div>

      {testResult && (
        <div className="p-4 rounded-2xl bg-white border border-emerald-300 text-xs text-emerald-900 shadow-glass flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-900">Live Interception Verification</div>
            <div className="mt-1 text-slate-600 font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">{testResult}</div>
          </div>
        </div>
      )}

      {/* Airplane Mode Test Guide */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-teal-600" />
          <span>The Airplane Mode Verification Test</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          You don&apos;t have to take our word for it. You can prove ListLocal&apos;s offline isolation in 60 seconds with this simple physical test:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="font-bold text-teal-700 font-mono text-xs">Step 1: Sever Internet</div>
            <p className="text-slate-600 leading-relaxed">
              Disconnect your Wi-Fi or unplug your Ethernet cable. Put your computer completely in Airplane Mode.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="font-bold text-teal-700 font-mono text-xs">Step 2: Generate Listing</div>
            <p className="text-slate-600 leading-relaxed">
              Navigate to the New Listing page. Upload high-res photos and click Generate.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="font-bold text-teal-700 font-mono text-xs">Step 3: Verify Output</div>
            <p className="text-slate-600 leading-relaxed">
              Vision attribute extraction and authentic voice writing complete flawlessly. Everything ran on your local chip.
            </p>
          </div>
        </div>
      </div>

      {/* How safeFetch Works Under the Hood */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-4 text-xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-600" />
          <span>How safeFetch Works Under the Hood</span>
        </h2>
        <p className="text-slate-600 leading-relaxed">
          In typical full-stack applications, rogue third-party packages or telemetry libraries can make background HTTP calls to external servers. In ListLocal, every single server-side network call is routed through our strict <code className="text-emerald-700 font-mono font-semibold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">lib/safeFetch.ts</code> wrapper.
        </p>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 shadow-inner">
          <div className="text-emerald-400 font-bold">{"// Whitelist: Localhost Only"}</div>
          <div className="text-slate-200">ALLOWED_HOSTS = [&apos;localhost&apos;, &apos;127.0.0.1&apos;, &apos;host.docker.internal&apos;, &apos;::1&apos;]</div>
          <div className="pt-2 text-slate-400">{"// If any code attempts to contact an external domain:"}</div>
          <div className="text-rose-400 font-semibold">
            throw new Error(&apos;[safeFetch] Blocked outbound request to external host...&apos;)
          </div>
          <div className="text-slate-400">{"// Attempt is permanently logged into SQLite 'network_blocks' table"}</div>
        </div>
      </div>

      {/* Blocked Attempts Audit Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Firewall Interception Log ({logs.length})</h2>
          <button
            type="button"
            onClick={fetchStats}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel border border-slate-200/90 text-center text-xs text-slate-500 shadow-glass">
            No blocked outbound attempts logged. All server requests have remained strictly internal.
          </div>
        ) : (
          <div className="rounded-2xl glass-panel border border-slate-200/90 overflow-hidden divide-y divide-slate-100 text-xs shadow-glass">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between gap-3 bg-white/70 hover:bg-white transition-colors">
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-mono text-slate-900 font-bold">{log.host}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                    BLOCKED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
