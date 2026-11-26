import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'River Ethiope Experience | Abraka, Delta State',
  description:
    'Discover River Ethiope in Abraka, Ethiope East, Delta State — clear spring fed inland water, emerald riverbanks, and canoe crossings minutes from Charlees Hotel & Suites.',
  openGraph: {
    title: 'River Ethiope Experience | Charlees Hotel & Suites Abraka',
    description:
      'Clear spring fed water and riverside serenity along the Ethiope River in Abraka, Delta State.',
  },
};

export default async function RiverEthiopePage() {
  const media = await HotelDataService.getMediaAssets(true);
  const riverAssets = media.filter(
    (m) => m.section_key === 'exp_river_ethiope' || m.section_key === 'abraka'
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: 'River Ethiope, Abraka',
    description:
      'Crystal-clear spring-fed inland waterway flowing through Abraka in Ethiope East Local Government Area, Delta State, Nigeria.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Abraka',
      addressRegion: 'Delta State',
      addressCountry: 'NG',
    },
  };

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-12 sm:py-18 space-y-14">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#5C574F] hover:text-[#171614]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>All Abraka Experiences</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
              Experience 01 · Natural Waterway
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
              River Ethiope, Abraka
            </h1>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C574F] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8C6822]" aria-hidden="true" />
              <span>Ethiope East · Delta State · Nigeria</span>
            </p>
            <div className="space-y-4 text-base leading-relaxed text-[#4A453E]">
              <p>
                Rising from Umuaja and winding gracefully through Abraka, River Ethiope is widely celebrated for its clear, spring-fed inland water where smooth white sandbeds and aquatic plant life remain visible from the surface.
              </p>
              <p>
                Guests staying at Charlees Hotel &amp; Suites regularly visit independent riverbanks and boat crossing points along the Ethiope corridor for morning walks, calm canoe outings, and waterside views away from busy highways.
              </p>
            </div>
            <div className="border-t border-[#E6E1D8] pt-4 text-xs text-[#6B6459] leading-relaxed">
              Independent natural attraction in Abraka, Ethiope East, Delta State — distinct from Charlees Hotel &amp; Suites private grounds.
            </div>
            <div className="pt-2">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3.5 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F]"
              >
                <span>Reserve Your Stay in Abraka</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ExperienceMediaGallery
              title="River Ethiope"
              subtitle="Abraka · Delta State"
              assets={riverAssets}
              aspectClass="aspect-[4/5]"
              maxWidthClass="max-w-2xl"
            />
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
