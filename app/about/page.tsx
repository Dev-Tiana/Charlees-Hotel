import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { MediaFrame } from '@/components/public/MediaFrame';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About Charlees Hotel & Suites',
  description:
    'Learn about the white architecture, hospitality philosophy, and Abraka location of Charlees Hotel and Suites in Delta State, Nigeria.',
};

export default async function AboutPage() {
  const [settings, media] = await Promise.all([
    HotelDataService.getHotelSettings(),
    HotelDataService.getMediaAssets(true),
  ]);
  const exteriorAsset = media.find((m) => m.section_key === 'exterior') ?? null;

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="max-w-3xl space-y-5 pb-14">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            About the Hotel
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#171614] text-balance">
            Quiet architectural hospitality in the heart of Abraka
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-[#5C574F]">
            Charlees Hotel &amp; Suites stands on No. 2 Lawson Obi Street, behind O2 Arena and before Benin Junction, offering guests a white painted property shaped around clarity, rest, and reliable service.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start border-t border-[#E6E1D8] pt-14">
          <div className="lg:col-span-6">
            <MediaFrame
              asset={exteriorAsset}
              fallbackTitle="Charlees White Architecture"
              figureCode="Charlees Hotel & Suites"
              aspectClass="aspect-[4/3]"
            />
          </div>

          <div className="lg:col-span-6 space-y-6 text-base leading-relaxed text-[#4A453E]">
            <h2 className="font-display text-3xl text-[#171614]">
              Built around straightforward comfort
            </h2>
            <p>
              From its white painted facade to its four room categories, Charlees Hotel &amp; Suites focuses on what matters most to travellers arriving in Delta State: quiet rooms, attentive housekeeping, and open air places to unwind at the swimming pool and rooftop.
            </p>
            <p>
              Our online reservation desk reflects live room availability from physical inventory and applies clear cancellation deadlines anchored in West Africa Time.
            </p>

            <div className="border-t border-[#E6E1D8] pt-6 space-y-2 text-sm">
              <p className="font-medium text-[#171614]">Location</p>
              <p className="text-[#5C574F]">{settings.hotel_profile.address}</p>
            </div>

            <div className="pt-2">
              <Link
                href="/rooms"
                className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F]"
              >
                <span>Explore Rooms</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
