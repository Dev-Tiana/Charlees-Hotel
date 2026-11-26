import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { ManageBookingClient } from '@/components/public/ManageBookingClient';
import { DevModeNotice } from '@/components/public/DevModeNotice';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Find Booking',
  description:
    'Retrieve your existing Charlees Hotel and Suites reservation using your booking reference and email address to view booking status and cancellation eligibility.',
};

export default async function FindBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();
  const sampleBookings = isDevelopmentMode
    ? HotelDataService.getSampleLookupBookings()
    : [];

  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl px-4 sm:px-8 py-14 sm:py-20 space-y-8">
        <div className="space-y-3 border-b border-[#E6E1D8] pb-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Guest Self Service
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#171614]">
            Find Your Booking
          </h1>
          <p className="text-base text-[#5C574F] max-w-2xl">
            Enter your booking reference and reservation email address to review your room details, current booking status, West Africa Time cancellation eligibility, and refund history.
          </p>
        </div>

        {isDevelopmentMode ? (
          <DevModeNotice
            description="Lookup and cancellation workflows are connected to local mock data (Supabase paused). Use one of the sample reservations below or enter a reference you created during this session."
          />
        ) : null}

        <ManageBookingClient
          initialRef={sp.ref || ''}
          initialEmail={sp.email || ''}
          sampleBookings={sampleBookings}
        />
      </main>
    </PublicShell>
  );
}
