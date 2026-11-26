import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { GalleryArchiveClient } from '@/components/public/GalleryArchiveClient';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Property Photography & Video Gallery',
  description:
    'Photographs and video walkthroughs of Charlees Hotel and Suites, including exterior architecture, rooms, swimming pool, and rooftop.',
};

export default async function GalleryPage() {
  const media = await HotelDataService.getMediaAssets(true);
  const galleryItems = media.filter((m) => m.section_key !== 'logo');

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="max-w-3xl space-y-4 pb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Visual Archive
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#171614]">
            Property Gallery
          </h1>
          <p className="text-base leading-relaxed text-[#5C574F]">
            Explore architectural views, interior photographs, and video walkthroughs across Charlees Hotel &amp; Suites and the surrounding Abraka river corridor.
          </p>
        </div>

        <GalleryArchiveClient assets={galleryItems} />
      </main>
    </PublicShell>
  );
}
