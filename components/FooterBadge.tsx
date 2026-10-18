'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Cpu, ShieldAlert } from 'lucide-react';

export function FooterBadge() {
  const [modelName, setModelName] = useState<string>('gemma3:4b');
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        const [blocksRes, healthRes] = await Promise.all([
          fetch('/api/network-blocks'),
          fetch('/api/health'),
        ]);

        if (blocksRes.ok && isMounted) {
          const blocksData = await blocksRes.json();
          setBlockedCount(blocksData.count ?? 0);
        }

        if (healthRes.ok && isMounted) {
          const healthData = await healthRes.json();
          setModelName(healthData.activeModel || 'gemma3:4b');
        }
      } catch {
        // Local offline fallback
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">ListLocal</span>
          <span>&bull;</span>
          <span>Zero cloud egress e-commerce back office</span>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Running locally indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Running locally</span>
          </div>

          {/* Model info */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>Model: {modelName}</span>
          </div>

          {/* Outbound requests blocked badge */}
          <Link
            href="/privacy"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors border font-medium shadow-2xs ${
              blockedCount > 0
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            {blockedCount > 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Outbound requests blocked: {blockedCount}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default FooterBadge;
