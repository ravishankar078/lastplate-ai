import React, { useState } from 'react';
import { Info, X, ShieldCheck } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-[#FAF4EB] border-b border-[#E8DEC8] px-4 py-2 text-xs sm:text-sm text-stone-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded text-xs tracking-wide uppercase">
            <Info className="w-3.5 h-3.5" />
            Operational Demo
          </span>
          <p className="text-stone-700">
            <strong>Demonstration Notice:</strong> Metrics and rescue dispatches shown are illustrative sample data until connected to our live city database in Phase 4.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1 text-forest-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
            Full Safety & Traceability Prototype
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
