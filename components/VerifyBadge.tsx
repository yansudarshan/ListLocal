'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface VerifyBadgeProps {
  confidence: number;
  fieldName?: string;
  className?: string;
}

export function VerifyBadge({ confidence, fieldName, className = '' }: VerifyBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Any attribute with confidence < 0.6 gets a visible "Verify this" badge
  if (confidence >= 0.6) {
    return null;
  }

  const confidencePct = Math.round(confidence * 100);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Verify ${fieldName || 'attribute'}: low model confidence of ${confidencePct}%`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
      >
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>Verify this</span>
      </button>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 shadow-xl pointer-events-none"
        >
          <div className="font-semibold text-amber-800 mb-0.5">Low Model Confidence ({confidencePct}%)</div>
          <div>
            The vision model is not fully certain of this detail from the photo(s). Please verify the {fieldName || 'attribute'} manually.
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifyBadge;
