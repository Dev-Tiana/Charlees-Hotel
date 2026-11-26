import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { RoomShowcaseAndBooking } from '@/components/public/RoomShowcaseAndBooking';
import { HotelDataService } from '@/lib/services/hotel-data-service';
import {
  getLagosDateString,
  getLagosTomorrowDateString,
} from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await HotelDataService.getRoomCategoryBySlug(slug);
  if (!category) {
    return { title: 'Room Not Found' };
  }
  return {
    title: category.name,
    description: `${category.short_description} Explore and reserve the ${category.name} directly at Charlees Hotel and Suites, Abraka.`,
  };
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await HotelDataService.getRoomCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

  const today = getLagosDateString();
  const tomorrow = getLagosTomorrowDateString();

  const [media, allCategories, settings, initialAvailability] = await Promise.all([
    HotelDataService.getMediaAssets(true),
    HotelDataService.getRoomCategories(),
    HotelDataService.getHotelSettings(),
    HotelDataService.checkAvailability(today, tomorrow),
  ]);

  const onlinePaystackEnabled = Boolean(process.env.PAYSTACK_SECRET_KEY);
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-12 sm:py-16">
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#5C574F] hover:text-[#171614] mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>All Room Categories</span>
        </Link>

        <div className="max-w-3xl space-y-3 pb-10 border-b border-[#E6E1D8] mb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Verified Room Tier · Abraka
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#171614]">
            {category.name}
          </h1>
          <p className="text-base leading-relaxed text-[#5C574F]">
            {category.editorial_description || category.short_description}
          </p>
        </div>

        <RoomShowcaseAndBooking
          categories={allCategories}
          media={media}
          initialToday={today}
          initialTomorrow={tomorrow}
          initialAvailability={initialAvailability}
          bankDetails={settings.hotel_profile}
          onlinePaystackEnabled={onlinePaystackEnabled}
          advanceDaysRequired={settings.cancellation_policy.advanceDaysRequired}
          sameDayWindowMinutes={settings.cancellation_policy.sameDayWindowMinutes}
          initialRoomSlug={category.slug}
          initialOpenBooking={false}
          isDevelopmentMode={isDevelopmentMode}
        />
      </main>
    </PublicShell>
  );
}
