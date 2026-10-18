'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Hash,
  Smile,
  ListOrdered,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { StyleProfile } from '@/lib/schemas/voice';

export default function VoiceStudioPage() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [pastListings, setPastListings] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  const [inputText, setInputText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/voice/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setPastListings(data.pastListings || []);
      }
    } catch (err) {
      console.error('Failed to load voice profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleCsvUpload = (file: File) => {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      // Simple CSV parsing for column "text" or "description"
      const lines = content.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) return;

      const header = lines[0].toLowerCase().split(',').map((h) => h.replace(/["']/g, '').trim());
      let colIdx = header.findIndex((h) => h === 'text' || h === 'description');
      if (colIdx === -1) colIdx = 0; // fallback to first column

      const extractedTexts: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.trim()) {
          // regex split for CSV cells
          const match = row.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
          if (match && match[colIdx]) {
            let cell = match[colIdx].replace(/^,/, '').trim();
            if (cell.startsWith('"') && cell.endsWith('"')) {
              cell = cell.slice(1, -1).replace(/""/g, '"');
            }
            if (cell.length > 5) extractedTexts.push(cell);
          }
        }
      }

      setInputText(extractedTexts.join('\n---\n'));
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!inputText.trim()) return;
    setImporting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/voice/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'Import failed.' });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Successfully embedded and learned from ${data.importedCount} past listing(s)!`,
        });
        setInputText('');
        setCsvFile(null);
        await loadProfile();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error occurred while processing.' });
    } finally {
      setImporting(false);
    }
  };

  const loadSampleListings = () => {
    setInputText(`Handcrafted terracotta stoneware mug thrown on the wheel with mindful attention. Organic ribbed texture and ergonomic thumb rest. Dishwasher and microwave safe.
---
Artisan speckle-glazed espresso cup pair in desert cream. Wheel-thrown high fire ceramic finished with unglazed foot ring.
---
Handmade ceramic pour-over coffee filter cone with natural wabi-sabi ridges. Food-safe lead-free glazes throughout.
---
Studio pottery pasta bowl set with hand-dipped terracotta edge. Each piece is unique and celebrates natural nuances.
---
Minimalist stoneware succulent planter with drainage hole and matching unglazed terracotta saucer.`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200/90 mb-3 shadow-2xs">
          <Mic className="w-4 h-4 text-teal-600" />
          <span>Local Voice Learning (No Fine-Tuning Required)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Seller Voice Studio</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
          Train ListLocal on your authentic brand voice. We compute sentence cadence, formatting preferences, and top phrases locally, pairing them with cosine-similarity embeddings for few-shot prompt injection.
        </p>
      </div>

      {/* Main Grid: Import Form & Current Style Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Past Listings Importer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Import Past Listings</span>
              </h2>
              <button
                type="button"
                onClick={loadSampleListings}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
              >
                Load Sample Listings
              </button>
            </div>

            {/* CSV Dropzone */}
            <div className="relative border-2 border-dashed border-slate-300/90 hover:border-emerald-500 rounded-2xl p-5 text-center cursor-pointer transition-all bg-emerald-50/20 hover:bg-emerald-50/40">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleCsvUpload(e.target.files[0]);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
              <div className="text-xs text-slate-800 font-semibold">
                {csvFile ? csvFile.name : 'Click or drop a CSV file (columns: "text" or "description")'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Accepts 5 to 30 past listings</div>
            </div>

            {/* Textarea */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                <span>Or paste listings separated by &ldquo;---&rdquo;:</span>
                <span>{inputText.split(/---|\n{2,}/).filter((s) => s.trim().length > 5).length} detected</span>
              </div>
              <textarea
                rows={9}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Listing 1 copy...&#10;---&#10;Listing 2 copy...&#10;---&#10;Listing 3 copy..."
                className="w-full p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono shadow-2xs leading-relaxed"
              />
            </div>

            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={importing || !inputText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{importing ? 'Computing Local Embeddings...' : 'Calibrate Voice Profile'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Style Profile Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>Learned Style Profile</span>
            </h2>

            {profile ? (
              <div className="space-y-4">
                {/* Tone Summary Box */}
                <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 space-y-1 shadow-2xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                    Voice Tone Archetype
                  </div>
                  <div className="text-sm font-bold text-slate-900">{profile.tone_summary}</div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Avg Sentence</span>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900">{profile.avg_sentence_length} words</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-medium">
                      <Smile className="w-3.5 h-3.5 text-amber-500" />
                      <span>Emoji Rate</span>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {(profile.emoji_usage_rate * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-medium">
                      <ListOrdered className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Bullet vs Prose</span>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {(profile.bullet_preference * 100).toFixed(0)}% bullets
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-medium">
                      <Hash className="w-3.5 h-3.5 text-teal-500" />
                      <span>Formality Score</span>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {(profile.formality_estimate * 100).toFixed(0)} / 100
                    </div>
                  </div>
                </div>

                {/* Top Recurring Phrases */}
                {profile.top_phrases && profile.top_phrases.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-slate-800 mb-2">Signature Phrases:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.top_phrases.map((phrase, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs"
                        >
                          &ldquo;{phrase}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 pt-2.5 border-t border-slate-200 flex justify-between font-medium">
                  <span>Based on {profile.analyzed_listings_count} listings</span>
                  <span>Updated {new Date(profile.last_updated).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                No style profile calibrated yet. Paste past listings on the left to learn your voice.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Past Listings Stored in SQLite */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          Stored Past Listings ({pastListings.length})
        </h2>

        {pastListings.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel border border-slate-200/90 text-center text-xs text-slate-500 shadow-glass">
            No past listings stored. Paste past listings above to populate the few-shot memory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastListings.map((listing, idx) => (
              <div key={listing.id} className="p-4 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs space-y-1.5">
                <div className="text-[10px] text-slate-400 font-mono font-medium">Listing #{idx + 1}</div>
                <p className="text-slate-700 line-clamp-3 italic leading-relaxed">&ldquo;{listing.text}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
