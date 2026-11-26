'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';
import { MediaAsset } from '@/lib/types';
import { BrandLogo } from '@/components/public/BrandLogo';

interface SiteHeaderProps {
  logoAsset?: MediaAsset | null;
}

const MAIN_NAV_LINKS = [
  { href: '/rooms', label: 'Rooms' },
  { href: '/facilities', label: 'Facilities' },
  { href: '/explore-abraka', label: 'Abraka' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader({ logoAsset }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E6E1D8]">
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          href="/"
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8C6822]"
          aria-label="Charlees Hotel and Suites home"
        >
          <BrandLogo logoAsset={logoAsset} variant="light" />
        </Link>

        {/* Zone 2: Strictly Rooms, Facilities, Abraka, Contact */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A453E]"
        >
          {MAIN_NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap shrink-0 py-1 hover:text-[#171614] border-b border-transparent hover:border-[#8C6822] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8C6822]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Zone 3: Clearly visible Find Booking & Reserve action */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/find-booking"
            className="hidden sm:inline-flex items-center gap-1.5 border border-[#D8D1C5] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#171614] whitespace-nowrap shrink-0 hover:border-[#8C6822] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[#8C6822]" aria-hidden="true" />
            <span>Find Booking</span>
          </Link>

          <Link
            href="/book"
            className="hidden sm:inline-flex items-center justify-center bg-[#0D0D0E] text-[#FAF9F6] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.16em] whitespace-nowrap shrink-0 hover:bg-[#26231F] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6822]"
          >
            Reserve Stay
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex md:hidden items-center justify-center h-11 w-11 border border-[#E6E1D8] text-[#171614] hover:border-[#8C6822] focus-visible:outline-2 focus-visible:outline-[#8C6822]"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#E6E1D8] bg-[#FAF9F6] px-6 py-6">
          <nav aria-label="Mobile navigation" className="flex flex-col space-y-3">
            {MAIN_NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 text-base font-medium text-[#171614] border-b border-[#EFEAE0] hover:text-[#8C6822]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/find-booking"
              onClick={() => setMenuOpen(false)}
              className="py-2 text-base font-medium text-[#8C6822] border-b border-[#EFEAE0]"
            >
              Find Booking
            </Link>
            <Link
              href="/book"
              onClick={() => setMenuOpen(false)}
              className="mt-4 inline-flex items-center justify-center bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3.5 text-xs font-medium uppercase tracking-[0.18em]"
            >
              Reserve Stay
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
