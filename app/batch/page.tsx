'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Layers,
  Upload,
  FolderUp,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface GroupedProduct {
  groupName: string;
  images: string[];
}

export default function BatchPage() {
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Group multiple files by folder or prefix
  const processFiles = async (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    if (valid.length === 0) return;

    const groups: Map<string, string[]> = new Map();

    for (const file of valid) {
      // Check relative path (webkitRelativePath) or filename prefix (before _ or -)
      let group = 'Product';
      if ((file as any).webkitRelativePath) {
        const parts = (file as any).webkitRelativePath.split('/');
        if (parts.length > 1) {
          group = parts[parts.length - 2]; // Subfolder name
        }
      } else {
        const base = file.name.split('.')[0];
        const prefix = base.split(/[_-]/)[0];
        group = prefix || 'Item';
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(dataUrl);
    }

    const result: GroupedProduct[] = Array.from(groups.entries()).map(([groupName, images]) => ({
      groupName,
      images,
    }));

    setGroupedProducts(result);
  };

  // Submit Batch Job to SQLite Queue
  const handleSubmitBatch = async () => {
    if (groupedProducts.length === 0) return;
    setIsSubmitting(true);

    try {
      const items = groupedProducts.map((g) => ({
        productName: g.groupName.replace(/[_-]/g, ' '),
        images: g.images,
        platform: 'Etsy' as const,
        toneValue: 50,
      }));

      const res = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit batch job.');

      setActiveJobId(data.jobId);
    } catch (err: any) {
      alert(err.message || 'Batch creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll Job Status
  useEffect(() => {
    if (!activeJobId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJobId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setJobStatus(data);
          if (data.status === 'done' || data.status === 'failed') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Job polling error:', err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeJobId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200/90 mb-3 shadow-2xs">
          <Layers className="w-4 h-4 text-purple-600" />
          <span>Durable SQLite Background Workers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Batch Catalog Processing</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
          Upload whole folders of inventory photos. A resilient SQLite worker loop processes products sequentially (concurrency limit = 1), surviving server restarts with automatic job resumption and retries.
        </p>
      </div>

      {/* Main Grid: Upload & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Folder / Files Upload (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderUp className="w-4 h-4 text-purple-600" />
              <span>Select Photos for Batch Processing</span>
            </h2>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Folder Upload */}
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="p-5 rounded-2xl border border-slate-200 hover:border-purple-400 bg-white/70 hover:bg-purple-50/30 text-center transition-all flex flex-col items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FolderUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-900">Upload Folder</span>
                <span className="text-[10px] text-slate-500">1 subfolder per product</span>
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files);
                  }}
                  className="hidden"
                />
              </button>

              {/* Multi-Files Upload */}
              <button
                type="button"
                onClick={() => filesInputRef.current?.click()}
                className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 bg-white/70 hover:bg-indigo-50/30 text-center transition-all flex flex-col items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-900">Select Image Files</span>
                <span className="text-[10px] text-slate-500">Grouped by prefix (mug_1, etc.)</span>
                <input
                  ref={filesInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files);
                  }}
                  className="hidden"
                />
              </button>
            </div>

            {/* Detected Products Grouping */}
            {groupedProducts.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                  <span>Detected Products ({groupedProducts.length})</span>
                  <span className="text-slate-500 font-medium">{groupedProducts.reduce((acc, g) => acc + g.images.length, 0)} total images</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {groupedProducts.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-800">{group.groupName}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">{group.images.length} photos</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSubmitBatch}
                  disabled={isSubmitting || activeJobId !== null}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Queueing Batch...' : `Enqueue ${groupedProducts.length} Items for Generation`}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-time Job Progress Tracker (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/90 shadow-glass space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Durable Queue Progress</span>
            </h2>

            {jobStatus ? (
              <div className="space-y-4 text-xs">
                {/* Status Indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Job Status:</span>
                  <span
                    className={`font-bold px-3 py-1 rounded-full uppercase tracking-wider text-[10px] shadow-2xs ${
                      jobStatus.status === 'done'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : jobStatus.status === 'failed'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200 animate-pulse'
                    }`}
                  >
                    {jobStatus.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>Batch Progress</span>
                    <span className="font-mono text-purple-700 font-bold">{jobStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-500"
                      style={{ width: `${jobStatus.progress}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 text-slate-600 shadow-2xs">
                  <div className="flex justify-between">
                    <span className="font-medium">Products in Job:</span>
                    <span className="text-slate-900 font-mono font-bold">{jobStatus.itemCount} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Started:</span>
                    <span className="text-slate-900 font-mono">{new Date(jobStatus.createdAt).toLocaleTimeString()}</span>
                  </div>
                  {jobStatus.error && (
                    <div className="text-rose-600 font-medium pt-1.5 border-t border-slate-200">
                      Error: {jobStatus.error}
                    </div>
                  )}
                </div>

                {jobStatus.status === 'done' && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold">Batch Complete!</div>
                        <div className="text-[11px] text-emerald-800">All products have been cataloged in your library.</div>
                      </div>
                    </div>
                    <Link
                      href="/library"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
                    >
                      View in Library
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No active batch job running. Upload a folder or files on the left to start background processing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
