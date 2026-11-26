import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { ManageBookingClient } from '@/components/public/ManageBookingClient';
import { DevModeNotice } from '@/components/public/DevModeNotice';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manage Your Booking',
  description:
    'Check your reservation status, view West Africa Time cancellation deadlines, submit an eligible cancellation, or track refund progress at Charlees Hotel and Suites.',
};

export default async function ManageBookingPage({
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
            Manage Your Reservation
          </h1>
          <p className="text-base text-[#5C574F] max-w-2xl">
            Enter your booking reference and reservation email address to review your room status, payment verification, West Africa Time cancellation deadline, and refund history.
          </p>
        </div>

        {isDevelopmentMode ? (
          <DevModeNotice
            description="Self-service management and cancellations run on temporary local mock data while Supabase is paused. Changes reset when the mock store is reset."
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
