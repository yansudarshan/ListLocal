'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Mic, FileText } from 'lucide-react';

export interface VoiceInfluenceItem {
  id?: string;
  text: string;
  similarity: number;
}

interface VoiceMatchPanelProps {
  sources: VoiceInfluenceItem[];
  className?: string;
}

export function VoiceMatchPanel({ sources, className = '' }: VoiceMatchPanelProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className={`p-4 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/80 text-sm text-slate-600 shadow-xs ${className}`}>
        <div className="flex items-center gap-2 mb-1 text-slate-800 font-medium">
          <Mic className="w-4 h-4 text-emerald-600" />
          <span>Seller Voice Learning</span>
        </div>
        <p className="text-xs text-slate-500">
          No past listings matched yet. Import your previous shop listings in the{' '}
          <Link href="/voice" className="text-emerald-600 font-medium hover:underline">
            Voice Studio
          </Link>{' '}
          to train the generator on your authentic cadence.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-900">Voice Match Influence</h4>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
          {sources.length} few-shot matches
        </span>
      </div>

      <div className="space-y-2.5">
        {sources.map((item, idx) => {
          const pct = Math.round(item.similarity * 100);
          return (
            <div key={idx} className="p-3 rounded-lg bg-slate-50/90 border border-slate-200/80 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Past Listing #{idx + 1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      style={{ width: `${Math.max(10, Math.min(100, pct))}%` }}
                    />
                  </div>
                  <span className="font-semibold text-emerald-700">{pct}% match</span>
                </div>
              </div>
              <p className="text-slate-600 italic line-clamp-2">
                &ldquo;{item.text}&rdquo;
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VoiceMatchPanel;
