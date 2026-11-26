'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyReferenceButton({
  reference,
  className = '',
}: {
  reference: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy method when Clipboard API is restricted
      const input = document.createElement('input');
      input.value = reference;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy booking reference ${reference}`}
      className={`inline-flex items-center gap-1.5 border border-[#D8D1C5] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#171614] hover:border-[#8C6822] hover:bg-white transition-colors ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
          <span className="text-emerald-800">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-[#8C6822]" aria-hidden="true" />
          <span>Copy Booking Reference</span>
        </>
      )}
    </button>
  );
}
