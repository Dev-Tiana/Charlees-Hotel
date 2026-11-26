import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cancellation and Refund Policy',
  description:
    'Official advance and same day reservation cancellation deadlines and refund verification procedures for Charlees Hotel and Suites, Abraka.',
};

export default async function CancellationPolicyPage() {
  const settings = await HotelDataService.getHotelSettings();
  const policy = settings.cancellation_policy;

  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-14 sm:py-20 space-y-10">
        <div className="space-y-4 border-b border-[#E6E1D8] pb-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Hotel Policy · West Africa Time
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#171614]">
            Cancellation and Refund Policy
          </h1>
          <p className="text-base leading-relaxed text-[#5C574F]">
            All cancellation deadlines at Charlees Hotel &amp; Suites are calculated and enforced on the server in the hotel local timezone (Africa/Lagos).
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-3xl text-[#171614]">
            1. Advance Reservations
          </h2>
          <p className="text-base leading-relaxed text-[#4A453E]">
            Guests who reserve ahead of their arrival date may cancel their reservation up to {policy.advanceDaysRequired} day before the scheduled arrival date (until 23:59 West Africa Time on the day prior to arrival).
          </p>
        </section>

        <section className="space-y-4 border-t border-[#E6E1D8] pt-8">
          <h2 className="font-display text-3xl text-[#171614]">
            2. Same Day Reservations
          </h2>
          <p className="text-base leading-relaxed text-[#4A453E]">
            When a reservation is created on the same calendar date as the scheduled arrival date in West Africa Time, the guest may cancel within {policy.sameDayWindowMinutes} minutes of the booking creation timestamp.
          </p>
        </section>

        <section className="space-y-4 border-t border-[#E6E1D8] pt-8">
          <h2 className="font-display text-3xl text-[#171614]">
            3. Refund Review and Processing
          </h2>
          <p className="text-base leading-relaxed text-[#4A453E]">
            Refunds are never marked complete automatically upon cancellation submission. Each eligible refund request is linked to the verified original payment reference, reviewed by authorized management, and updated only after payment provider or bank settlement verification.
          </p>
          <div className="border border-[#E6E1D8] bg-white p-6 space-y-2.5 text-sm text-[#4A453E]">
            <p className="font-medium text-[#171614]">
              Operational Parameters Configurable by Management
            </p>
            <p>
              Refund allocation on eligible cancellations:{' '}
              {policy.refundPercentageConfirmedByManagement
                ? `${policy.refundPercentageOnEligible}% of verified payment`
                : `Currently set to ${policy.refundPercentageOnEligible}% (awaiting final management confirmation)`}
            </p>
            <p>Refund timeline: {policy.refundTimelineNote}</p>
            <p>
              Exceptions outside standard deadlines:{' '}
              {policy.allowManagerExceptionOverride
                ? 'Authorized managers may review and approve documented exceptions.'
                : 'Strict deadline enforcement without exception override.'}
            </p>
          </div>
        </section>

        <div className="pt-4">
          <Link
            href="/manage-booking"
            className="inline-flex bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em]"
          >
            Manage or Cancel a Booking
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
