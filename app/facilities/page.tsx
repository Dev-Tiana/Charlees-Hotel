import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Clock, Users } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { MediaFrame } from '@/components/public/MediaFrame';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';
import { RooftopVideoPlayer } from '@/components/public/RooftopVideoPlayer';
import { EditorialReveal } from '@/components/public/EditorialMotion';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Swimming Pool & Rooftop Facilities',
  description:
    'Discover the swimming pool, rooftop lounge, and dining facilities belonging to Charlees Hotel and Suites in Abraka, Delta State.',
};

export default async function FacilitiesPage() {
  const [media, facilities] = await Promise.all([
    HotelDataService.getMediaAssets(true),
    HotelDataService.getFacilities(),
  ]);

  const poolAssets = media.filter((m) => m.section_key === 'pool');
  const rooftopAsset = media.find((m) => m.section_key === 'rooftop') ?? null;
  const diningAsset = media.find((m) => m.section_key === 'dining') ?? null;

  const pool = facilities.find((f) => f.slug === 'swimming-pool');
  const rooftop = facilities.find((f) => f.slug === 'rooftop-lounge');
  const dining = facilities.find((f) => f.slug === 'dining-refreshments');

  return (
    <PublicShell>
      <main>
        <section className="mx-auto max-w-7xl px-4 sm:px-8 pt-14 sm:pt-20 pb-14">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
              On Site Facilities
            </p>
            <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#171614] text-balance">
              Swimming pool, rooftop lounge, and dining spaces within the grounds
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#5C574F]">
              Charlees Hotel &amp; Suites maintains dedicated leisure and hospitality spaces on property for resident guests seeking calm afternoons by the water and open evening air above Lawson Obi Street.
            </p>
          </div>
        </section>

        {/* Swimming Pool */}
        <section className="border-t border-[#E6E1D8] bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <EditorialReveal className="lg:col-span-6">
                <ExperienceMediaGallery
                  title={pool?.name || 'The Swimming Pool'}
                  subtitle="Facility 01 · Swimming Pool"
                  assets={poolAssets}
                  aspectClass="aspect-[4/5]"
                  maxWidthClass="max-w-[460px] lg:mx-0"
                />
              </EditorialReveal>
              <EditorialReveal delay={0.1} className="lg:col-span-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                    {pool?.eyebrow || '01. Water & Daylight'}
                  </p>
                  <h2 className="font-display text-3xl sm:text-5xl font-normal text-[#171614]">
                    {pool?.name || 'The Swimming Pool'}
                  </h2>
                </div>
                <p className="text-base leading-relaxed text-[#4A453E]">
                  {pool?.summary}
                </p>

                {pool ? (
                  <div className="border-t border-[#E6E1D8] pt-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#4A453E]">
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-[#8C6822] shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="uppercase tracking-[0.14em] text-[#8C6822] font-medium">Hours</p>
                          <p className="mt-0.5 font-mono-tabular text-[#171614]">{pool.operating_hours}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Users className="w-4 h-4 text-[#8C6822] shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="uppercase tracking-[0.14em] text-[#8C6822] font-medium">Deck Setting</p>
                          <p className="mt-0.5 text-[#171614]">{pool.capacity_note}</p>
                        </div>
                      </div>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-[#5C574F]">
                      {pool.highlights.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#8C6822] shrink-0" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-[#6B6459] pt-1">{pool.access_note}</p>
                  </div>
                ) : null}
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* Rooftop */}
        <section className="bg-[#0D0D0E] text-[#FAF9F6] border-t border-[#26231E]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <EditorialReveal className="lg:col-span-6 space-y-6 order-2 lg:order-1">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#D6B46A]">
                    {rooftop?.eyebrow || '02. Open Air Elevation'}
                  </p>
                  <h2 className="font-display text-3xl sm:text-5xl font-normal text-[#FAF9F6]">
                    {rooftop?.name || 'The Rooftop Lounge'}
                  </h2>
                </div>
                <p className="text-base leading-relaxed text-[#B5AFA4]">
                  {rooftop?.summary}
                </p>

                {rooftop ? (
                  <div className="border-t border-[#26231E] pt-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#D6D0C4]">
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-[#D6B46A] shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="uppercase tracking-[0.14em] text-[#D6B46A] font-medium">Hours</p>
                          <p className="mt-0.5 font-mono-tabular text-[#FAF9F6]">{rooftop.operating_hours}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Users className="w-4 h-4 text-[#D6B46A] shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="uppercase tracking-[0.14em] text-[#D6B46A] font-medium">Terrace</p>
                          <p className="mt-0.5 text-[#FAF9F6]">{rooftop.capacity_note}</p>
                        </div>
                      </div>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-[#B5AFA4]">
                      {rooftop.highlights.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#D6B46A] shrink-0" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-[#8F897D] pt-1">{rooftop.access_note}</p>
                  </div>
                ) : null}

                <div className="pt-2">
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-2 bg-[#D6B46A] text-[#0D0D0E] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#E2C581]"
                  >
                    <span>Reserve a Room</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </EditorialReveal>

              <EditorialReveal delay={0.1} className="lg:col-span-6 order-1 lg:order-2">
                <RooftopVideoPlayer
                  asset={rooftopAsset}
                  title={rooftop?.name || 'The Rooftop Lounge'}
                  tone="dark"
                  maxWidthClass="max-w-[390px] lg:ml-auto lg:mr-0"
                />
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* Dining Room */}
        {dining ? (
          <section className="border-t border-[#E6E1D8] bg-[#FAF9F6]">
            <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <EditorialReveal className="lg:col-span-6">
                  <MediaFrame
                    asset={diningAsset}
                    fallbackTitle="Dining & Refreshment Space"
                    figureCode="Facility 03 · Dining Salon"
                    aspectClass="aspect-[4/3]"
                  />
                </EditorialReveal>
                <EditorialReveal delay={0.1} className="lg:col-span-6 space-y-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                    {dining.eyebrow}
                  </p>
                  <h2 className="font-display text-3xl sm:text-5xl font-normal text-[#171614]">
                    {dining.name}
                  </h2>
                  <p className="text-base leading-relaxed text-[#4A453E]">
                    {dining.summary}
                  </p>
                  <p className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[#8C6822]">
                    {dining.operating_hours}
                  </p>
                  <Link
                    href="/dining"
                    className="inline-flex items-center gap-2 border border-[#D8D1C5] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#171614] hover:border-[#8C6822]"
                  >
                    <span>View Dining Details</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </EditorialReveal>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </PublicShell>
  );
}
