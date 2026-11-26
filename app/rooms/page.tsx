import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { AvailabilityBar } from '@/components/public/AvailabilityBar';
import { RoomShowcaseAndBooking } from '@/components/public/RoomShowcaseAndBooking';
import { HotelDataService } from '@/lib/services/hotel-data-service';
import { getLagosDateString, getLagosTomorrowDateString } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rooms & Accommodation',
  description:
    'Explore Standard, Twin, Deluxe, and Luxury rooms at Charlees Hotel and Suites in Abraka, Delta State.',
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; book?: string }>;
}) {
  const sp = await searchParams;
  const today = getLagosDateString();
  const tomorrow = getLagosTomorrowDateString();

  const [categories, media, settings, initialAvailability] = await Promise.all([
    HotelDataService.getRoomCategories(),
    HotelDataService.getMediaAssets(true),
    HotelDataService.getHotelSettings(),
    HotelDataService.checkAvailability(today, tomorrow),
  ]);

  const onlinePaystackEnabled = Boolean(process.env.PAYSTACK_SECRET_KEY);
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="max-w-3xl space-y-4 pb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Accommodation · Abraka
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#171614] text-balance">
            Guest rooms designed for calm stays in Delta State
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-[#5C574F]">
            Explore all four room categories below with verified room photographs, bed configurations, and direct reservation options.
          </p>
        </div>

        <div className="mb-14">
          <AvailabilityBar categories={categories} />
        </div>

        <RoomShowcaseAndBooking
          categories={categories}
          media={media}
          initialToday={today}
          initialTomorrow={tomorrow}
          initialAvailability={initialAvailability}
          bankDetails={settings.hotel_profile}
          onlinePaystackEnabled={onlinePaystackEnabled}
          advanceDaysRequired={settings.cancellation_policy.advanceDaysRequired}
          sameDayWindowMinutes={settings.cancellation_policy.sameDayWindowMinutes}
          initialRoomSlug={sp.room || ''}
          initialOpenBooking={sp.book === '1'}
          expandAllOnMount={!sp.room}
          isDevelopmentMode={isDevelopmentMode}
        />
      </main>
    </PublicShell>
  );
}
