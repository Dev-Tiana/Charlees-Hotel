import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { BookingEngineClient } from '@/components/public/BookingEngineClient';
import { DevModeNotice } from '@/components/public/DevModeNotice';
import { HotelDataService } from '@/lib/services/hotel-data-service';
import { getLagosDateString, getLagosTomorrowDateString } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reserve Your Stay',
  description:
    'Check real time room availability and book directly at Charlees Hotel and Suites in Abraka, Delta State.',
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    room?: string;
  }>;
}) {
  const sp = await searchParams;
  const settings = await HotelDataService.getHotelSettings();
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();

  const today = getLagosDateString();
  const tomorrow = getLagosTomorrowDateString();

  const checkIn =
    sp.checkIn && /^\d{4}-\d{2}-\d{2}$/.test(sp.checkIn) && sp.checkIn >= today
      ? sp.checkIn
      : today;
  const checkOut =
    sp.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(sp.checkOut) && sp.checkOut > checkIn
      ? sp.checkOut
      : tomorrow > checkIn
        ? tomorrow
        : getLagosDateString(
            new Date(new Date(`${checkIn}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000)
          );

  const adults = Math.min(6, Math.max(1, Number(sp.adults || 1) || 1));
  const roomSlug = sp.room || 'standard-room';

  const [initialAvailability, media] = await Promise.all([
    HotelDataService.checkAvailability(checkIn, checkOut),
    HotelDataService.getMediaAssets(true),
  ]);

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-12 sm:py-16 space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Direct Reservations · Abraka
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#171614]">
            Reserve Your Room at Charlees Hotel &amp; Suites
          </h1>
          <p className="text-sm sm:text-base text-[#5C574F]">
            Review your selected room gallery, verified features, and live West Africa Time availability, then proceed directly with Online Card Payment (Paystack) or Bank Transfer.
          </p>
        </div>

        {isDevelopmentMode ? <DevModeNotice /> : null}

        <BookingEngineClient
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialAdults={adults}
          initialRoomSlug={roomSlug}
          initialAvailability={initialAvailability}
          media={media}
          settings={settings}
          onlinePaystackEnabled={Boolean(process.env.PAYSTACK_SECRET_KEY)}
        />
      </main>
    </PublicShell>
  );
}
