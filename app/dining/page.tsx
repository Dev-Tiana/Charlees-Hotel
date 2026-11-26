import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Clock, UtensilsCrossed } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { MediaFrame } from '@/components/public/MediaFrame';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dining & Refreshments',
  description:
    'Dining and refreshment hours and service notes for guests staying at Charlees Hotel and Suites in Abraka, Delta State.',
};

export default async function DiningPage() {
  const [settings, media, facilities] = await Promise.all([
    HotelDataService.getHotelSettings(),
    HotelDataService.getMediaAssets(true),
    HotelDataService.getFacilities(),
  ]);
  const diningAsset = media.find((m) => m.section_key === 'dining') ?? null;
  const diningFacility = facilities.find((f) => f.slug === 'dining-refreshments');

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
              Hospitality Service
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-[#171614]">
              Dining at Charlees Hotel &amp; Suites
            </h1>
            <p className="text-base leading-relaxed text-[#4A453E]">
              {settings.hotel_profile.diningStatusNote}
            </p>

            {diningFacility ? (
              <div className="border-t border-b border-[#E6E1D8] py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#8C6822] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[#8C6822] font-medium">
                        Operating Schedule
                      </p>
                      <p className="mt-0.5 font-mono-tabular text-[#171614]">
                        {diningFacility.operating_hours}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#8C6822] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="uppercase tracking-[0.14em] text-[#8C6822] font-medium">
                        Service Format
                      </p>
                      <p className="mt-0.5 text-[#171614]">{diningFacility.capacity_note}</p>
                    </div>
                  </div>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5C574F]">
                  {diningFacility.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#8C6822] shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F]"
              >
                <span>Inquire With Reception</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/facilities"
                className="inline-flex items-center gap-2 border border-[#D8D1C5] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#171614] hover:border-[#8C6822]"
              >
                <span>View Pool &amp; Rooftop</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <MediaFrame
              asset={diningAsset}
              fallbackTitle="Dining & Refreshments"
              figureCode="Charlees Dining"
              aspectClass="aspect-[4/3]"
            />
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
