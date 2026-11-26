import Image from 'next/image';
import { MediaAsset } from '@/lib/types';

interface BrandLogoProps {
  logoAsset?: MediaAsset | null;
  variant?: 'light' | 'dark';
}

export function BrandLogo({ logoAsset, variant = 'light' }: BrandLogoProps) {
  if (logoAsset?.public_url) {
    return (
      <span className="inline-flex items-center gap-3 whitespace-nowrap shrink-0">
        <span className="relative h-9 w-9 overflow-hidden bg-[#0D0D0E] border border-[#C9A24D]/40 shrink-0">
          <Image
            src={logoAsset.public_url}
            alt={logoAsset.alt_text || 'Charlees Hotel and Suites official monogram'}
            fill
            sizes="36px"
            className="object-contain p-1"
            referrerPolicy="no-referrer"
          />
        </span>
        <span
          className={`font-display text-xl tracking-[0.04em] font-semibold whitespace-nowrap ${
            variant === 'dark' ? 'text-[#FAF9F6]' : 'text-[#171614]'
          }`}
        >
          Charlees Hotel &amp; Suites
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap shrink-0">
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 items-center justify-center bg-[#0D0D0E] border border-[#C9A24D]/60 text-[#D6B46A] font-display text-lg font-semibold tracking-wider shrink-0"
      >
        CH
      </span>
      <span
        className={`font-display text-xl tracking-[0.04em] font-semibold whitespace-nowrap ${
          variant === 'dark' ? 'text-[#FAF9F6]' : 'text-[#171614]'
        }`}
      >
        Charlees Hotel &amp; Suites
      </span>
    </span>
  );
}
