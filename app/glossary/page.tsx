'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Languages,
  ShieldCheck,
} from 'lucide-react';

export default function GlossaryPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New term inputs
  const [newTerm, setNewTerm] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newLanguage, setNewLanguage] = useState<'Hindi' | 'Kannada'>('Hindi');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGlossary = async () => {
    try {
      const res = await fetch('/api/glossary');
      if (res.ok) {
        const data = await res.json();
        setTerms(data.terms || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlossary();
  }, []);

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newTranslation.trim()) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: newTerm.trim(),
          translation: newTranslation.trim(),
          language: newLanguage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save glossary term.');
      }

      setNewTerm('');
      setNewTranslation('');
      await fetchGlossary();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    try {
      const res = await fetch(`/api/glossary/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTerms((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const seedSampleTerms = async () => {
    const samples = [
      { term: 'Kasuti', translation: 'कसूती', language: 'Hindi' },
      { term: 'Bidriware', translation: 'बिदरीवेयर', language: 'Hindi' },
      { term: 'Ragi', translation: 'रागी', language: 'Hindi' },
      { term: 'Kasuti', translation: 'ಕಸೂತಿ', language: 'Kannada' },
      { term: 'Channapatna', translation: 'ಚನ್ನಪಟ್ಟಣ', language: 'Kannada' },
    ];

    for (const s of samples) {
      await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
    }
    await fetchGlossary();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200/90 mb-3 shadow-2xs">
          <BookOpen className="w-4 h-4 text-teal-600" />
          <span>Protected Artisan Terminology</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Protected Cultural Glossary</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
          Define terms that translation models must keep or translate with canonical precision (e.g., regional crafts, traditional weaves, botanical dyes). A post-translation verifier automatically audits that protected words remain uncorrupted.
        </p>
      </div>

      {/* Main Split: Form & Terms Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Add Term (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleAddTerm} className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
              <span>Add Protected Term</span>
            </h2>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Original Term (English / Artisan)</label>
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="e.g. Kasuti or Bidriware"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Canonical Translation</label>
              <input
                type="text"
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                placeholder="e.g. कसूती or ಕಸೂತಿ"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-sans shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Language</label>
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-teal-500 shadow-2xs"
              >
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !newTerm.trim() || !newTranslation.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Add to Protected Glossary'}</span>
            </button>
          </form>

          {/* Verification Protocol explanation */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Automated Verification Check</span>
            </div>
            <p className="leading-relaxed">
              When you one-click translate any listing in your library, these glossary terms are injected with explicit prompt constraints. After the model responds, ListLocal scans the generated copy. If any protected term is missing or anglicized, a warning flag is raised for seller review.
            </p>
          </div>
        </div>

        {/* Right Table: Protected Terms (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Languages className="w-4 h-4 text-teal-600" />
                <span>Protected Terms ({terms.length})</span>
              </h2>
              {terms.length === 0 && (
                <button
                  type="button"
                  onClick={seedSampleTerms}
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold underline cursor-pointer"
                >
                  Load Sample Indian Craft Terms
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading glossary...</div>
            ) : terms.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                <p>No terms added to the glossary yet.</p>
                <button
                  type="button"
                  onClick={seedSampleTerms}
                  className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-semibold text-xs shadow-2xs hover:bg-teal-100 transition-colors"
                >
                  Load 5 Default Craft Terms (Kasuti, Bidriware, Ragi, etc.)
                </button>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-slate-200 divide-y divide-slate-100 text-xs shadow-2xs">
                {terms.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-3 bg-white/70 hover:bg-white transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">{item.term}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="font-bold text-teal-700 font-sans text-sm">{item.translation}</span>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {item.language}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTerm(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete term"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
