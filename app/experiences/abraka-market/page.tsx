import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Abraka Market | Ethiope East, Delta State',
  description:
    'Visit Abraka Market in Abraka, Ethiope East Local Government Area, Delta State near Charlees Hotel & Suites for local produce, crafts, and community life.',
  openGraph: {
    title: 'Abraka Market | Ethiope East, Delta State',
    description:
      'Local market life in Abraka, Ethiope East, Delta State just a short drive from Charlees Hotel & Suites.',
  },
};

export default async function AbrakaMarketPage() {
  const media = await HotelDataService.getMediaAssets(true);
  const marketAssets = media.filter((m) => m.section_key === 'exp_abraka_market');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'Abraka Market',
    description:
      'Local town market in Abraka, Ethiope East Local Government Area, Delta State, Nigeria.',
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
              Experience 02 · Abraka Town Life
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
              Abraka Market
            </h1>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C574F] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8C6822]" aria-hidden="true" />
              <span>Abraka · Ethiope East LGA · Delta State</span>
            </p>
            <div className="space-y-4 text-base leading-relaxed text-[#4A453E]">
              <p>
                Situated right inside Abraka in Ethiope East Local Government Area, Delta State, Abraka Market connects surrounding farming communities, university residents, and visitors traveling along the Benin–Abraka–Agbor corridor.
              </p>
              <p>
                Hotel guests looking for regional foodstuffs, fresh seasonal produce, and everyday Delta State town commerce can ask our front desk team on Lawson Obi Street for current market day rhythms and local transport directions within Abraka.
              </p>
            </div>
            <div className="border-t border-[#E6E1D8] pt-4 text-xs text-[#6B6459] leading-relaxed">
              Independent local market located strictly in Abraka, Ethiope East, Delta State. Charlees Hotel &amp; Suites reception can share current local directions on arrival.
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
            {marketAssets.length > 0 ? (
              <ExperienceMediaGallery
                title="Abraka Market"
                subtitle="Abraka · Ethiope East, Delta State"
                assets={marketAssets}
                aspectClass="aspect-[4/3]"
                maxWidthClass="max-w-2xl"
              />
            ) : (
              <div className="border border-[#E6E1D8] bg-white p-8 sm:p-12 space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8C6822]">
                  Abraka · Ethiope East · Delta State
                </p>
                <h2 className="font-display text-3xl font-normal text-[#171614]">
                  Authentic Photography Curated by Management
                </h2>
                <p className="text-sm leading-relaxed text-[#5C574F]">
                  Verified photographs for Abraka Market (Ethiope East, Delta State) will appear in this gallery as soon as they are uploaded through the Charlees Hotel &amp; Suites Media Library. We do not display unverified stock photography.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
