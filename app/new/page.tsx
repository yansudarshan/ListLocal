'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Sparkles,
  X,
  Copy,
  Check,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  Swords,
  ChevronRight,
  Eye,
  Tag,
  Trophy,
} from 'lucide-react';
import { VerifyBadge } from '@/components/VerifyBadge';
import { VoiceMatchPanel } from '@/components/VoiceMatchPanel';
import { VisionExtraction } from '@/lib/schemas/vision';
import { ListingOutput } from '@/lib/schemas/listing';

interface PhotoItem {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  name: string;
}

export default function NewListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photos state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Optional seller inputs
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState<'Etsy' | 'eBay' | 'Instagram'>('Etsy');
  const [toneValue, setToneValue] = useState<number>(50); // 0 (friendly) to 100 (professional)
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Kannada'>('English');
  const [sellerNotes, setSellerNotes] = useState('');

  // Cost Data inputs (optional)
  const [supplyCost, setSupplyCost] = useState(false);
  const [costMin, setCostMin] = useState<string>('24.00');
  const [costMax, setCostMax] = useState<string>('32.00');

  // Model Arena toggle
  const [isArenaMode, setIsArenaMode] = useState(false);
  const [arenaResult, setArenaResult] = useState<any>(null);
  const [votingWinner, setVotingWinner] = useState(false);
  const [votedWinner, setVotedWinner] = useState<string | null>(null);

  // Generator progress & results
  const [generationStep, setGenerationStep] = useState<
    'idle' | 'extracting' | 'matching_voice' | 'writing' | 'complete'
  >('idle');
  const [progressMessage, setProgressMessage] = useState('');
  const [, setStreamedText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step A & B outputs
  const [attributes, setAttributes] = useState<VisionExtraction | null>(null);
  const [listing, setListing] = useState<ListingOutput | null>(null);
  const [voiceMatches, setVoiceMatches] = useState<any[]>([]);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Client-side image resize using canvas to max 1024px
  const processImageFile = (file: File): Promise<PhotoItem> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              id: Math.random().toString(36).substring(7),
              dataUrl: e.target?.result as string,
              width: img.width,
              height: img.height,
              name: file.name,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

          resolve({
            id: Math.random().toString(36).substring(7),
            dataUrl: resizedDataUrl,
            width,
            height,
            name: file.name,
          });
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );

    if (photos.length + files.length > 5) {
      alert('You can upload a maximum of 5 photos.');
      return;
    }

    try {
      const newItems = await Promise.all(files.map(processImageFile));
      setPhotos((prev) => [...prev, ...newItems].slice(0, 5));
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process one or more images.');
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = () => {
    if (!listing) return;
    const fullText = `${listing.title}\n\n${listing.description}\n\nTags: ${listing.tags.join(', ')}\nCategory: ${listing.category}`;
    copyText(fullText, 'all');
  };

  const handleSaveToLibrary = async () => {
    if (!listing) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: listing.title,
          description: listing.description,
          tags: listing.tags,
          category: listing.category,
          priceMin: listing.price_min,
          priceMax: listing.price_max,
          language,
          modelUsed: isArenaMode ? votedWinner || arenaResult?.modelA || 'gemma3:4b' : 'gemma3:4b',
          platform,
          productName: productName || listing.title.slice(0, 40),
          photos: photos.map((p) => ({
            dataUrl: p.dataUrl,
            width: p.width,
            height: p.height,
          })),
          voiceSources: voiceMatches,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save listing');
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push('/library');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving to library');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (photos.length === 0) {
      setErrorMsg('Please upload at least one product photo.');
      return;
    }

    setErrorMsg(null);
    setListing(null);
    setArenaResult(null);
    setVotedWinner(null);
    setStreamedText('');
    setGenerationStep('extracting');
    setProgressMessage('Reading photos with vision model (extracting verified attributes)...');

    try {
      // Step A: Vision Extraction
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map((p) => ({
            dataUrl: p.dataUrl,
            width: p.width,
            height: p.height,
          })),
          sellerNotes,
        }),
      });

      const extractData = await extractRes.json();
      if (!extractRes.ok) {
        throw new Error(extractData.error || 'Failed to extract attributes from photos.');
      }

      const extractedAttrs: VisionExtraction = extractData.attributes;
      setAttributes(extractedAttrs);

      // Arena Mode branch
      if (isArenaMode) {
        setGenerationStep('writing');
        setProgressMessage('Running Model Arena: evaluating gemma3:4b vs llama3.2-vision sequentially...');

        const arenaRes = await fetch('/api/arena/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes: extractedAttrs,
            productName,
            platform,
            toneValue,
            language,
          }),
        });

        const aData = await arenaRes.json();
        if (!arenaRes.ok) {
          throw new Error(aData.error || 'Model arena execution failed.');
        }

        setArenaResult(aData);
        setListing(aData.outputA);
        setGenerationStep('complete');
        return;
      }

      // Step B: SSE Streamed Generation
      setGenerationStep('matching_voice');
      setProgressMessage('Matching your authentic seller voice...');

      const costData = supplyCost
        ? {
            suggestedPriceMin: parseFloat(costMin) || 0,
            suggestedPriceMax: parseFloat(costMax) || 0,
            currency: 'USD',
          }
        : null;

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: extractedAttrs,
          productName,
          platform,
          toneValue,
          language,
          sellerNotes,
          costData,
          stream: true,
        }),
      });

      if (!genRes.ok || !genRes.body) {
        const errorData = await genRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initialize copy generator stream.');
      }

      const reader = genRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setGenerationStep('writing');
      setProgressMessage('Writing high-converting listing in your calibrated tone...');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.stage === 'matched') {
                setVoiceMatches(parsed.matches || []);
              } else if (parsed.stage === 'chunk') {
                setStreamedText((prev) => prev + parsed.content);
              } else if (parsed.stage === 'complete' && parsed.listing) {
                setListing(parsed.listing);
                setGenerationStep('complete');
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore partial JSON parses in SSE
            }
          }
        }
      }

      setGenerationStep('complete');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Generation failed. Check Ollama connectivity or MOCK_LLM mode.');
      setGenerationStep('idle');
    }
  };

  const handlePickWinner = async (winnerModel: string) => {
    if (!arenaResult) return;
    setVotingWinner(true);
    try {
      await fetch('/api/arena/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelA: arenaResult.modelA,
          modelB: arenaResult.modelB,
          winner: winnerModel,
          latencyAMs: arenaResult.latencyAMs,
          latencyBMs: arenaResult.latencyBMs,
          tpsA: arenaResult.tpsA,
          tpsB: arenaResult.tpsB,
        }),
      });
      setVotedWinner(winnerModel);
      // Set active listing to winner
      if (winnerModel === arenaResult.modelB) {
        setListing(arenaResult.outputB);
      } else {
        setListing(arenaResult.outputA);
      }
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setVotingWinner(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Product Cataloger</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">New Product Listing</h1>
          <p className="text-sm text-slate-600 mt-1">
            Drop product photos. ListLocal extracts confirmed attributes and drafts copy in your voice.
          </p>
        </div>

        {/* Arena Mode Toggle */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/90 text-xs shadow-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isArenaMode}
              onChange={(e) => setIsArenaMode(e.target.checked)}
              className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0 w-4 h-4"
            />
            <span className="font-medium text-slate-800 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-indigo-500" />
              <span>Compare two models (Arena)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Photos & Options (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Photo Dropzone */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Product Photos ({photos.length}/5)</span>
              </h2>
              <span className="text-[11px] text-slate-500">Auto-resized to 1024px</span>
            </div>

            {/* Drop Target */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300/80 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                }}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100 shadow-2xs">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                Drag and drop 1-5 photos, or <span className="text-emerald-700 underline">browse</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Supports JPG, PNG, WEBP</div>
            </div>

            {/* Previews Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2 pt-1">
                {photos.map((p, idx) => (
                  <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors opacity-90 group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Inputs Card */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Listing Parameters</span>
            </h2>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Product Name (Optional)</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Speckled Terracotta Mug"
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  <option value="Etsy">Etsy (140-char title, 13 tags)</option>
                  <option value="eBay">eBay (80-char title, specifics)</option>
                  <option value="Instagram">Instagram Shop</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                </select>
              </div>
            </div>

            {/* Tone Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-semibold">Tone Calibration</label>
                <span className="text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {toneValue < 35 ? 'Warm & Conversational' : toneValue > 65 ? 'Polished & Professional' : 'Balanced Artisan'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={toneValue}
                onChange={(e) => setToneValue(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Friendly / Story</span>
                <span>Balanced</span>
                <span>Crisp / Modern</span>
              </div>
            </div>

            {/* Seller Notes */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Seller Notes / Facts Only (Optional)</label>
              <textarea
                rows={2}
                value={sellerNotes}
                onChange={(e) => setSellerNotes(e.target.value)}
                placeholder="e.g. Capacity: 12 fl oz, unglazed base, ships with honeycomb paper."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
              />
            </div>

            {/* Cost Data toggle */}
            <div className="pt-3 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={supplyCost}
                  onChange={(e) => setSupplyCost(e.target.checked)}
                  className="rounded bg-white border-slate-300 text-emerald-600 w-4 h-4 focus:ring-0"
                />
                <span className="text-slate-800 font-medium">Include verified cost range for pricing</span>
              </label>

              {supplyCost && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Min Price ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={costMin}
                      onChange={(e) => setCostMin(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Max Price ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={costMax}
                      onChange={(e) => setCostMax(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generationStep !== 'idle' && generationStep !== 'complete'}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {generationStep === 'idle' || generationStep === 'complete'
                  ? isArenaMode
                    ? 'Run Model Arena Comparison'
                    : 'Generate Listing in My Voice'
                  : progressMessage || 'Processing...'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Output: Extracted Attributes & Generated Copy (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Progress Banner */}
          {generationStep !== 'idle' && generationStep !== 'complete' && (
            <div className="p-5 rounded-2xl glass-panel border border-emerald-300 bg-emerald-50/70 shadow-glass space-y-3">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent" />
                <div className="text-sm font-bold text-emerald-900">{progressMessage}</div>
              </div>

              {/* Progress steps indication */}
              <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <span className={generationStep === 'extracting' ? 'text-emerald-700 font-bold' : ''}>
                  1. Reading photos
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className={generationStep === 'matching_voice' ? 'text-emerald-700 font-bold' : ''}>
                  2. Matching voice
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className={generationStep === 'writing' ? 'text-emerald-700 font-bold' : ''}>
                  3. Writing listing
                </span>
              </div>
            </div>
          )}

          {/* Step A: Extracted Attributes Card with Verify Badges */}
          {attributes && (
            <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                  <span>Step A: Vision Extracted Attributes</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">Strict Non-Fabrication</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-medium">Confirmed Item</span>
                    <VerifyBadge confidence={attributes.confidence?.item_type ?? 1} fieldName="item type" />
                  </div>
                  <div className="font-bold text-slate-900">{attributes.item_type}</div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-medium">Condition</span>
                    <VerifyBadge confidence={attributes.confidence?.condition ?? 1} fieldName="condition" />
                  </div>
                  <div className="font-bold text-slate-900">{attributes.condition}</div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-medium">Colors</span>
                    <VerifyBadge confidence={attributes.confidence?.colors ?? 1} fieldName="colors" />
                  </div>
                  <div className="font-semibold text-slate-800">{attributes.colors.join(', ')}</div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-medium">Materials</span>
                    <VerifyBadge confidence={attributes.confidence?.materials ?? 1} fieldName="materials" />
                  </div>
                  <div className="font-semibold text-slate-800">{attributes.materials.join(', ')}</div>
                </div>
              </div>

              {attributes.notable_details && attributes.notable_details.length > 0 && (
                <div className="pt-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1.5 font-medium">
                    <span>Visible Details:</span>
                    <VerifyBadge confidence={attributes.confidence?.notable_details ?? 1} fieldName="notable details" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {attributes.notable_details.map((d, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Model Arena Side-by-Side View */}
          {arenaResult && (
            <div className="p-6 rounded-2xl glass-panel border border-indigo-200 shadow-glass space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Model Arena Comparison</h3>
                </div>
                {votedWinner && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Winner: {votedWinner}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Model A */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono font-bold text-indigo-700">{arenaResult.modelA}</span>
                    <div className="text-[11px] text-slate-500 space-x-2">
                      <span>{arenaResult.latencyAMs}ms</span>
                      <span>&bull;</span>
                      <span>{arenaResult.tpsA} tps</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 line-clamp-2">{arenaResult.outputA.title}</div>
                    <div className="text-slate-600 mt-2 line-clamp-4 whitespace-pre-line leading-relaxed">
                      {arenaResult.outputA.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePickWinner(arenaResult.modelA)}
                    disabled={votingWinner || votedWinner === arenaResult.modelA}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    {votedWinner === arenaResult.modelA ? 'Selected Winner' : 'Pick Model A as Winner'}
                  </button>
                </div>

                {/* Model B */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono font-bold text-purple-700">{arenaResult.modelB}</span>
                    <div className="text-[11px] text-slate-500 space-x-2">
                      <span>{arenaResult.latencyBMs}ms</span>
                      <span>&bull;</span>
                      <span>{arenaResult.tpsB} tps</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 line-clamp-2">{arenaResult.outputB.title}</div>
                    <div className="text-slate-600 mt-2 line-clamp-4 whitespace-pre-line leading-relaxed">
                      {arenaResult.outputB.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePickWinner(arenaResult.modelB)}
                    disabled={votingWinner || votedWinner === arenaResult.modelB}
                    className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    {votedWinner === arenaResult.modelB ? 'Selected Winner' : 'Pick Model B as Winner'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Voice Match Influence Panel */}
          {voiceMatches.length > 0 && <VoiceMatchPanel sources={voiceMatches} />}

          {/* Step B: Generated Listing (Editable & Copyable) */}
          {listing && (
            <div className="p-6 rounded-2xl glass-panel border border-slate-200/90 shadow-glass space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Generated Listing Copy</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Formatted for {platform}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs flex items-center gap-1.5 shadow-2xs font-medium"
                  >
                    {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy All</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {saveSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                    <span>{saveSuccess ? 'Saved to Library!' : isSaving ? 'Saving...' : 'Save to Library'}</span>
                  </button>
                </div>
              </div>

              {/* Editable Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-600 font-semibold">Title ({listing.title.length} chars)</label>
                  <button
                    type="button"
                    onClick={() => copyText(listing.title, 'title')}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={listing.title}
                  onChange={(e) => setListing({ ...listing, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Editable Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-600 font-semibold">Description</label>
                  <button
                    type="button"
                    onClick={() => copyText(listing.description, 'description')}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'description' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={listing.description}
                  onChange={(e) => setListing({ ...listing, description: e.target.value })}
                  className="w-full p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed shadow-2xs"
                />
              </div>

              {/* Editable Tags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-600 font-semibold">Search Tags ({listing.tags.length})</label>
                  <button
                    type="button"
                    onClick={() => copyText(listing.tags.join(', '), 'tags')}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'tags' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  {listing.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1 font-medium"
                    >
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Category & Pricing */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Suggested Category:</span>
                  <div className="font-semibold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                    {listing.category}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block mb-1">Price Recommendation:</span>
                  <div className="font-semibold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                    {listing.price_min ? `$${listing.price_min.toFixed(2)} - $${listing.price_max?.toFixed(2)}` : 'None (No verified cost supplied)'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
