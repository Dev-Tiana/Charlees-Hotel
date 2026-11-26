import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Abraka Top | Pending Verification · Abraka, Delta State',
  description:
    'Abraka Top destination slot near Charlees Hotel & Suites in Abraka, Delta State. Awaiting confirmed location notes and authentic photography.',
};

export default async function AbrakaTopPage() {
  const media = await HotelDataService.getMediaAssets(true);
  const topAssets = media.filter((m) => m.section_key === 'exp_abraka_top');

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-12 sm:py-18 space-y-14">
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
              Experience 03 · Pending Verification
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
              Abraka Top
            </h1>
            <div className="border border-amber-200 bg-amber-50/75 p-4 flex items-start gap-3 text-xs leading-relaxed text-amber-950">
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
              <p>
                <strong>Pending Verification:</strong> Awaiting confirmed location notes, visiting guidance, and authentic photography from Charlees Hotel &amp; Suites management. Unverified descriptions, opening hours, and pricing are intentionally omitted.
              </p>
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
            {topAssets.length > 0 ? (
              <ExperienceMediaGallery
                title="Abraka Top"
                subtitle="Abraka · Delta State"
                assets={topAssets}
                aspectClass="aspect-[4/3]"
                maxWidthClass="max-w-2xl"
              />
            ) : (
              <div className="border border-[#E6E1D8] bg-white p-8 sm:p-12 space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8C6822]">
                  Awaiting Confirmed Location &amp; Photography
                </p>
                <h2 className="font-display text-3xl font-normal text-[#171614]">
                  Media Pending Upload
                </h2>
                <p className="text-sm leading-relaxed text-[#5C574F]">
                  No confirmed visuals or verified venue facts have been published for Abraka Top yet. Verified media uploaded to the <strong>Experience · Abraka Top</strong> section in the Media Library will render here automatically without affecting any other section.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
