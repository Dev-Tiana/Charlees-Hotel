import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Compass, MapPin } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';
import { EditorialReveal } from '@/components/public/EditorialMotion';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Abraka Experiences & Local Destinations | Charlees Hotel & Suites',
  description:
    'Explore independent destinations around Abraka, Ethiope East, Delta State near Charlees Hotel & Suites: River Ethiope, Abraka Market, and Abraka Top.',
  openGraph: {
    title: 'Abraka Experiences | Charlees Hotel & Suites',
    description:
      'Independent attractions across Abraka, Ethiope East, Delta State including River Ethiope, Abraka Market, and Abraka Top.',
  },
};

export default async function ExperiencesHubPage() {
  const media = await HotelDataService.getMediaAssets(true);

  const riverAssets = media.filter(
    (m) => m.section_key === 'exp_river_ethiope' || m.section_key === 'abraka'
  );
  const marketAssets = media.filter((m) => m.section_key === 'exp_abraka_market');
  const topAssets = media.filter((m) => m.section_key === 'exp_abraka_top');

  const cards = [
    {
      number: '01',
      title: 'River Ethiope',
      eyebrow: 'Natural Spring Waterway · Abraka',
      href: '/experiences/river-ethiope',
      summary:
        'Renowned across Delta State for clear spring fed waters revealing the sandy riverbed beneath lush vegetation, local canoe crossings, and peaceful riverbanks.',
      assetCount: riverAssets.length,
      verified: true,
    },
    {
      number: '02',
      title: 'Abraka Market',
      eyebrow: 'Local Commerce · Ethiope East, Delta State',
      href: '/experiences/abraka-market',
      summary:
        'The bustling local market within Abraka in Ethiope East Local Government Area, Delta State, serving the university town and surrounding Delta communities.',
      assetCount: marketAssets.length,
      verified: true,
    },
    {
      number: '03',
      title: 'Abraka Top',
      eyebrow: 'Abraka Corridor · Pending Verification',
      href: '/experiences/abraka-top',
      summary:
        'Dedicated destination slot reserved for Abraka Top. Exact location details, visitor guidance, and verified photography are pending final confirmation by hotel management.',
      assetCount: topAssets.length,
      verified: topAssets.length > 0,
    },
  ];

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pb-14 border-b border-[#E6E1D8]">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
              Experiences · Abraka, Delta State
            </p>
            <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#171614] text-balance">
              Independent Places Across Abraka Beyond the Gates
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#5C574F]">
              Abraka combines calm university town life along the Benin Junction corridor with the clear spring waters of the Ethiope River in Ethiope East, Delta State. Explore each dedicated experience guide below.
            </p>
            <p className="text-xs leading-relaxed text-[#7A7367] border-t border-[#E6E1D8] pt-4">
              Notice: These are independent destinations in Abraka, Ethiope East, Delta State — distinct from Charlees Hotel &amp; Suites and its private on-site Swimming Pool and Rooftop Lounge.
            </p>
          </div>

          <div className="lg:col-span-7">
            <ExperienceMediaGallery
              title="River Ethiope"
              subtitle="Ethiope East · Abraka"
              assets={riverAssets}
              aspectClass="aspect-[4/5]"
              maxWidthClass="max-w-2xl"
            />
          </div>
        </div>

        <section aria-label="Dedicated Abraka Experiences" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <EditorialReveal key={card.href} delay={idx * 0.06}>
              <article className="h-full border border-[#E6E1D8] bg-white p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
                    <span>
                      {card.number}. {card.title}
                    </span>
                    {!card.verified ? (
                      <span className="border border-[#D8D1C5] px-2 py-0.5 text-[10px] text-[#6B6459]">
                        Pending Verification
                      </span>
                    ) : null}
                  </div>
                  <h2 className="font-display text-3xl font-normal text-[#171614]">
                    {card.title}
                  </h2>
                  <p className="text-xs text-[#6B6459] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8C6822] shrink-0" aria-hidden="true" />
                    <span>{card.eyebrow}</span>
                  </p>
                  <p className="text-sm leading-relaxed text-[#4A453E] pt-1">
                    {card.summary}
                  </p>
                </div>

                <Link
                  href={card.href}
                  className="inline-flex items-center justify-between border-t border-[#EFEAE0] pt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#171614] hover:text-[#8C6822] transition-colors"
                >
                  <span>Open {card.title} Page</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </article>
            </EditorialReveal>
          ))}
        </section>

        <section className="border border-[#E6E1D8] bg-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8C6822]">
              <Compass className="w-4 h-4" aria-hidden="true" />
              <span>Your Base in Ethiope East</span>
            </div>
            <h2 className="font-display text-3xl text-[#171614]">
              Return to Quiet Rest on Lawson Obi Street
            </h2>
            <p className="text-sm text-[#5C574F] leading-relaxed">
              Reserve directly at Charlees Hotel &amp; Suites with live room availability and verified hospitality in Abraka, Delta State.
            </p>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3.5 text-xs font-medium uppercase tracking-[0.18em] whitespace-nowrap shrink-0 hover:bg-[#26231F]"
          >
            <span>Book Your Stay</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
