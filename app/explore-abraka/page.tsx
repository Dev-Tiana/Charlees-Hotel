import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';
import { EditorialReveal } from '@/components/public/EditorialMotion';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Explore Abraka, Delta State',
  description:
    'Independent local landmarks and natural destinations in Abraka, Delta State near Charlees Hotel and Suites including Ethiope River, McCarthy Beach, and Delta State University.',
};

const ABRAKA_PLACES = [
  {
    title: 'Ethiope River',
    category: 'Natural Landmark',
    summary:
      'Originating at Umuaja and winding through Abraka, the Ethiope River is celebrated across Nigeria for remarkably clear spring waters that reveal the sandy riverbed below.',
  },
  {
    title: 'McCarthy Beach',
    category: 'Riverside Recreation',
    summary:
      'Situated along the banks of the Ethiope River in Abraka, McCarthy Beach is an independent recreational destination offering sandy riverfronts, shaded seating, and canoe outings.',
  },
  {
    title: 'Abraka Turf and Country Club',
    category: 'Equestrian & Leisure',
    summary:
      'An independent country club and eco tourism estate bordered by the Ethiope River, known for polo grounds, horseback riding, and quiet nature trails.',
  },
  {
    title: 'Delta State University (DELSU)',
    category: 'Academic Corridor',
    summary:
      'The main campus of Delta State University anchors the intellectual and civic life of Abraka, welcoming visiting lecturers, families, and conference guests throughout the year.',
  },
];

export default async function ExploreAbrakaPage() {
  const media = await HotelDataService.getMediaAssets(true);
  const abrakaAssets = media.filter((m) => m.section_key === 'abraka');

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pb-16 border-b border-[#E6E1D8]">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
              Independent Local Guide · Ethiope East
            </p>
            <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#171614] text-balance">
              Discovering Abraka beyond the hotel courtyard
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#5C574F]">
              Abraka combines peaceful university town life with the clear flowing waters of the Ethiope River. The destinations below are independent local places around town that guests may choose to explore during their stay.
            </p>
            <p className="text-xs leading-relaxed text-[#7A7367] border-t border-[#E6E1D8] pt-4">
              Notice: These landmarks are independent establishments and natural sites in Abraka, separate from Charlees Hotel &amp; Suites and its own swimming pool and rooftop facilities.
            </p>
          </div>

          <div className="lg:col-span-6">
            <ExperienceMediaGallery
              title="River Ethiope"
              subtitle="Ethiope East · Delta State"
              assets={abrakaAssets}
              aspectClass="aspect-[4/5]"
              maxWidthClass="max-w-[460px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 py-16">
          {ABRAKA_PLACES.map((place, idx) => (
            <EditorialReveal key={place.title} delay={idx * 0.06}>
              <article className="border-t border-[#D8D1C5] pt-6 space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8C6822]">
                  0{idx + 1}. {place.category}
                </p>
                <h2 className="font-display text-3xl font-normal text-[#171614]">
                  {place.title}
                </h2>
                <p className="text-sm sm:text-base leading-relaxed text-[#4A453E]">
                  {place.summary}
                </p>
              </article>
            </EditorialReveal>
          ))}
        </div>

        <section className="border border-[#E6E1D8] bg-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="font-display text-3xl text-[#171614]">
              Return to quiet rest on Lawson Obi Street
            </h2>
            <p className="text-sm text-[#5C574F] leading-relaxed">
              Base your Abraka itinerary at Charlees Hotel &amp; Suites with direct room reservations and real time physical availability.
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
