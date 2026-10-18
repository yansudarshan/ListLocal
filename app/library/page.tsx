'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Filter,
  Grid,
  List,
  Download,
  Languages,
  Trash2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { exportListingsToCSV } from '@/lib/export';

export default function LibraryPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & layout state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Translation Modal state
  const [translatingListing, setTranslatingListing] = useState<any | null>(null);
  const [targetLang, setTargetLang] = useState<'Hindi' | 'Kannada'>('Hindi');
  const [translationInProgress, setTranslationInProgress] = useState(false);
  const [translationResult, setTranslationResult] = useState<any | null>(null);
  const [translationWarning, setTranslationWarning] = useState<string | null>(null);

  // Status updating indicator
  const [, setUpdatingId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);

      const res = await fetch(`/api/listings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, platformFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleStatusChange = async (listingId: string, newStatus: string) => {
    setUpdatingId(listingId);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing from your library?')) return;
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      }
    } catch (err) {
      console.error('Failed to delete listing:', err);
    }
  };

  const handleExport = (format: 'Etsy' | 'eBay') => {
    const exportData = listings.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.productName,
      title: l.title,
      description: l.description,
      tags: l.tags || [],
      category: l.category,
      priceMin: l.priceMin,
      priceMax: l.priceMax,
      status: l.status,
      platform: l.platform,
      createdAt: l.createdAt,
    }));

    const csvContent = exportListingsToCSV(exportData, format);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `listlocal-${format.toLowerCase()}-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenTranslate = (listing: any) => {
    setTranslatingListing(listing);
    setTranslationResult(null);
    setTranslationWarning(null);
  };

  const handleExecuteTranslate = async () => {
    if (!translatingListing) return;
    setTranslationInProgress(true);
    setTranslationWarning(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: translatingListing.id,
          title: translatingListing.title,
          description: translatingListing.description,
          tags: translatingListing.tags,
          targetLanguage: targetLang,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Translation failed.');
      }

      setTranslationResult(data.result);
      if (data.warning) setTranslationWarning(data.warning);
    } catch (err: any) {
      alert(err.message || 'Translation error occurred.');
    } finally {
      setTranslationInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2 shadow-2xs">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local Inventory & Listings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Listing Library</h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse, manage, translate, and export your product listings formatted for Etsy and eBay.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('Etsy')}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-600" />
            <span>Export Etsy CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('eBay')}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export eBay CSV</span>
          </button>
          <Link
            href="/new"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create New</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-200/90 shadow-glass flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, tags, or product..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-emerald-500 shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="listed">Listed</option>
            <option value="sold">Sold</option>
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-emerald-500 shadow-2xs"
          >
            <option value="all">All Platforms</option>
            <option value="Etsy">Etsy</option>
            <option value="eBay">eBay</option>
            <option value="Instagram">Instagram</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:text-slate-800'}`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:text-slate-800'}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Listings Render */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading library listings...</div>
      ) : listings.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-slate-200/90 text-center space-y-3 shadow-glass">
          <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No listings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || platformFilter !== 'all'
              ? 'Try adjusting your search queries or active filters.'
              : 'Create a new listing with photos or run the seed script to populate sample products.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((item) => {
            // Margin check
            const hasLowMargin = item.priceMin !== null && item.priceMin > 0 && item.priceMin < 15;

            return (
              <div key={item.id} className="rounded-2xl glass-panel border border-slate-200/90 overflow-hidden flex flex-col justify-between shadow-glass hover:shadow-lg transition-all">
                <div>
                  {/* Photo thumbnail */}
                  <div className="aspect-video w-full bg-slate-100 relative overflow-hidden border-b border-slate-200">
                    {item.photos && item.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photos[0].path} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        No photo attached
                      </div>
                    )}
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-800 backdrop-blur shadow-2xs border border-slate-200">
                      {item.platform}
                    </span>
                  </div>

                  <div className="p-4 space-y-2.5">
                    {/* Status & Margin Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border focus:outline-none shadow-2xs ${
                          item.status === 'listed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'sold'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="draft">Draft</option>
                        <option value="listed">Listed</option>
                        <option value="sold">Sold</option>
                      </select>

                      {hasLowMargin ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-2xs">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Margin &lt; 15%</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          Healthy Margin
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{item.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{item.description}</p>

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.slice(0, 3).map((t: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                            #{t}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{item.tags.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="font-bold text-emerald-700 text-sm">
                    {item.priceMin ? `$${item.priceMin.toFixed(2)}` : 'No price set'}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenTranslate(item)}
                      className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-500 hover:text-teal-700 transition-colors"
                      title="Translate listing to Hindi or Kannada"
                    >
                      <Languages className="w-4 h-4 text-teal-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteListing(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl glass-panel border border-slate-200/90 overflow-hidden divide-y divide-slate-100 shadow-glass">
          {listings.map((item) => (
            <div key={item.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                  {item.photos && item.photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photos[0].path} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">N/A</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {item.platform}
                    </span>
                    <h4 className="font-bold text-slate-900 truncate max-w-md">{item.title}</h4>
                  </div>
                  <p className="text-slate-600 line-clamp-1">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item.id, e.target.value)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs"
                >
                  <option value="draft">Draft</option>
                  <option value="listed">Listed</option>
                  <option value="sold">Sold</option>
                </select>

                <div className="font-bold text-emerald-700 w-20 text-right">
                  {item.priceMin ? `$${item.priceMin.toFixed(2)}` : 'None'}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenTranslate(item)}
                    className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-500 hover:text-teal-700"
                  >
                    <Languages className="w-4 h-4 text-teal-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteListing(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Translation Modal Dialog */}
      {translatingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl glass-panel border border-slate-200 bg-white/95 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
                  <Languages className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">One-Click Multilingual Translation</h3>
              </div>
              <button
                type="button"
                onClick={() => setTranslatingListing(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Listing: <span className="font-bold text-slate-900">{translatingListing.title}</span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="text-slate-700 font-semibold">Target Language:</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none shadow-2xs"
              >
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>

            {translationWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                {translationWarning}
              </div>
            )}

            {translationResult ? (
              <div className="space-y-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <label className="font-bold text-emerald-800 block mb-1">Translated Title:</label>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold">
                    {translationResult.translated_title}
                  </div>
                </div>
                <div>
                  <label className="font-bold text-emerald-800 block mb-1">Translated Description:</label>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed">
                    {translationResult.translated_description}
                  </div>
                </div>
                <div>
                  <label className="font-bold text-emerald-800 block mb-1">Translated Tags:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {translationResult.translated_tags.map((t: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTranslatingListing(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteTranslate}
                disabled={translationInProgress}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{translationInProgress ? 'Translating with Glossary...' : `Translate to ${targetLang}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
