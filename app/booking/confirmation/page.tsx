import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { ConfirmationActionsClient } from '@/components/public/ConfirmationActionsClient';
import { CopyReferenceButton } from '@/components/public/CopyReferenceButton';
import { PaymentReceiptCard } from '@/components/public/PaymentReceiptCard';
import { DevModeNotice } from '@/components/public/DevModeNotice';
import { HotelDataService } from '@/lib/services/hotel-data-service';
import {
  isPaystackServerConfigured,
  verifyPaystackTransaction,
  type PaystackVerificationOutcome,
} from '@/lib/payments/paystack';
import { formatLagosDateTime, formatNaira } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reservation Confirmation',
  description:
    'View your Charlees Hotel and Suites booking reference, payment reference, room details, and verified payment status.',
};

function formatHumanReservationStatus(status: string, paymentStatus: string): string {
  if (status === 'cancellation_requested') return 'Cancellation Requested';
  if (status === 'pending_payment' && paymentStatus === 'pending_verification') {
    return 'Payment Pending Confirmation';
  }
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatHumanPaymentStatus(status: string): string {
  if (status === 'pending_verification' || status === 'pending') {
    return 'Payment Pending Confirmation';
  }
  if (status === 'confirmed' || status === 'paid') return 'Paid & Verified';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPaymentMethodLabel(method?: string): string {
  if (method === 'online_paystack') return 'Online Card Payment (Paystack)';
  if (method === 'pos') return 'POS / Front Desk Settlement';
  if (method === 'cash') return 'Front Desk Cash Settlement';
  return 'Bank Transfer (GT Bank)';
}

export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    email?: string;
    trxref?: string;
    reference?: string;
    gateway?: string;
  }>;
}) {
  const sp = await searchParams;
  const ref = sp.ref || '';
  const email = sp.email || '';
  const paystackRef = (sp.reference || sp.trxref || '').trim();

  let paystackOutcome: PaystackVerificationOutcome | null = null;
  if (paystackRef) {
    paystackOutcome = await verifyPaystackTransaction({
      paystackReference: paystackRef,
      expectedBookingReference: ref || undefined,
    });
  }

  const [found, settings] = await Promise.all([
    ref && email
      ? HotelDataService.lookupReservationByReference(ref, email)
      : ref
        ? HotelDataService.lookupReservationByReference(ref)
        : Promise.resolve(null),
    HotelDataService.getHotelSettings(),
  ]);
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();

  if (!found) {
    return (
      <PublicShell>
        <main className="mx-auto max-w-3xl px-4 sm:px-8 py-20 text-center space-y-6">
          <h1 className="font-display text-4xl text-[#171614]">
            Reservation Verification Required
          </h1>
          <p className="text-base text-[#5C574F]">
            Provide both your booking reference and email address in Find Booking to view your reservation details.
          </p>
          <Link
            href="/find-booking"
            className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs uppercase tracking-[0.18em]"
          >
            <span>Open Find Booking</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </main>
      </PublicShell>
    );
  }

  const { reservation, guest, category, physicalRoom, payments } = found;
  const latestPayment = payments[0] || null;
  const displayPaymentRef =
    latestPayment?.provider_reference ||
    latestPayment?.bank_transfer_reference ||
    paystackOutcome?.providerReference ||
    'Not yet assigned';

  const isConfirmedPaid =
    reservation.payment_status === 'paid' && latestPayment?.status === 'confirmed';
  const isBankPending =
    latestPayment?.method === 'bank_transfer' && !isConfirmedPaid;

  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-14 sm:py-20 space-y-8">
        {isDevelopmentMode ? (
          <DevModeNotice
            title="Development Mode · Temporary Reservation Preview"
            description="Reservation records are stored in temporary local storage while Supabase is paused. Paystack server verification still runs live against Paystack whenever PAYSTACK_SECRET_KEY is configured."
          />
        ) : null}

        {paystackOutcome ? (
          <div
            role="status"
            className={`border p-4 flex items-start gap-3 text-sm ${
              paystackOutcome.verified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : paystackOutcome.status === 'pending'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            {paystackOutcome.verified ? (
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <div>
              <p className="font-medium">
                {paystackOutcome.verified
                  ? 'Paystack Payment Verified'
                  : paystackOutcome.status === 'pending'
                    ? 'Paystack Transaction Pending'
                    : 'Online Card Payment Not Confirmed'}
              </p>
              <p className="mt-0.5 text-xs">{paystackOutcome.message}</p>
            </div>
          </div>
        ) : null}

        <div className="no-print border-b border-[#E6E1D8] pb-8 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8C6822]">
            {isConfirmedPaid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            ) : (
              <Clock className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
            )}
            <span>
              {formatHumanReservationStatus(reservation.status, reservation.payment_status)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-3xl sm:text-5xl font-normal text-[#171614]">
              Reference{' '}
              <span className="font-mono-tabular font-medium">
                {reservation.booking_reference}
              </span>
            </h1>
            {!isConfirmedPaid ? (
              <CopyReferenceButton reference={reservation.booking_reference} />
            ) : null}
          </div>

          <p className="text-sm sm:text-base text-[#5C574F]">
            Thank you{guest ? `, ${guest.full_name}` : ''}.{' '}
            {isConfirmedPaid
              ? 'Your verified payment receipt is below and remains accessible anytime on Find Booking.'
              : 'Save your booking reference above to retrieve your stay anytime on Find Booking.'}
          </p>
        </div>

        {isConfirmedPaid ? (
          <>
            <PaymentReceiptCard
              bookingReference={reservation.booking_reference}
              paymentReference={displayPaymentRef}
              guestName={guest?.full_name || 'Charlees Guest'}
              roomCategoryName={category?.name || 'Guest Room'}
              roomNumber={physicalRoom?.room_number || null}
              checkInDate={reservation.check_in_date}
              checkOutDate={reservation.check_out_date}
              nights={reservation.nights}
              adults={reservation.adults}
              childrenCount={reservation.children}
              amountPaidNgn={latestPayment?.amount_ngn || reservation.total_amount_ngn}
              paymentMethodLabel={formatPaymentMethodLabel(latestPayment?.method)}
              paymentDateIso={
                latestPayment?.verified_at ||
                latestPayment?.created_at ||
                reservation.created_at
              }
              hotelAddress={settings.hotel_profile.address}
              hotelPhone={settings.hotel_profile.phone}
            />

            <div className="no-print border border-[#E6E1D8] bg-white p-6 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                Cancellation Policy Deadline (Africa/Lagos)
              </p>
              <p className="mt-1 font-mono-tabular text-[#171614]">
                {formatLagosDateTime(reservation.cancellation_deadline_at)}
              </p>
              <p className="text-xs text-[#5C574F] mt-1">
                {reservation.is_same_day_booking
                  ? 'Same-day booking rule: eligible to request cancellation within 1 hour of creation.'
                  : 'Advance booking rule: eligible to request cancellation up to 1 day before check-in.'}
              </p>
            </div>
          </>
        ) : (
          <div className="border border-[#E6E1D8] bg-white p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">Room Details</p>
              <p className="mt-1 font-display text-2xl text-[#171614]">{category?.name}</p>
              {physicalRoom ? (
                <p className="text-xs text-[#5C574F] font-mono-tabular mt-1">
                  Assigned Room {physicalRoom.room_number} · {physicalRoom.floor_label}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                Settlement Amount Due
              </p>
              <p className="mt-1 font-mono-tabular text-2xl font-medium text-[#171614]">
                {formatNaira(reservation.total_amount_ngn)}
              </p>
              <p className="text-xs text-[#5C574F] mt-1">
                Booking: <strong>{formatHumanReservationStatus(reservation.status, reservation.payment_status)}</strong> ·{' '}
                Payment: <strong>{formatHumanPaymentStatus(latestPayment?.status || reservation.payment_status)}</strong>
              </p>
            </div>

            <div className="border-t border-[#EFEAE0] pt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                Check-In &amp; Check-Out Dates
              </p>
              <p className="mt-1 font-mono-tabular text-[#171614]">
                Check-In {reservation.check_in_date} · Check-Out {reservation.check_out_date}
              </p>
              <p className="text-xs text-[#5C574F] mt-1">
                {reservation.nights} {reservation.nights === 1 ? 'night' : 'nights'} ·{' '}
                {reservation.adults} {reservation.adults === 1 ? 'adult' : 'adults'}
              </p>
            </div>

            <div className="border-t border-[#EFEAE0] pt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                Payment Method
              </p>
              <p className="mt-1 text-[#171614]">
                {formatPaymentMethodLabel(latestPayment?.method)}
              </p>
              <p className="text-xs text-[#5C574F] mt-1">
                Receipt is issued automatically once payment is paid and verified.
              </p>
            </div>

            <div className="border-t border-[#EFEAE0] pt-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                Cancellation Policy Deadline (Africa/Lagos)
              </p>
              <p className="mt-1 font-mono-tabular text-[#171614]">
                {formatLagosDateTime(reservation.cancellation_deadline_at)}
              </p>
              <p className="text-xs text-[#5C574F] mt-1">
                {reservation.is_same_day_booking
                  ? 'Same-day booking rule: eligible to request cancellation within 1 hour of creation.'
                  : 'Advance booking rule: eligible to request cancellation up to 1 day before check-in.'}
              </p>
            </div>
          </div>
        )}

        {isBankPending ? (
          <div className="no-print bg-amber-50/70 border border-amber-200 p-4 text-xs leading-relaxed text-amber-950">
            <strong>Payment Pending Confirmation:</strong> Your bank transfer reservation is currently awaiting deposit verification into{' '}
            <strong>{settings.hotel_profile.bankName}</strong> ({settings.hotel_profile.bankAccountNumber} · {settings.hotel_profile.bankAccountName}). Our team will confirm the reservation as soon as funds clear.
          </div>
        ) : null}

        {latestPayment && !isConfirmedPaid ? (
          <ConfirmationActionsClient
            bookingReference={reservation.booking_reference}
            guestEmail={guest?.email || email}
            amountNgn={reservation.total_amount_ngn}
            paymentMethod={latestPayment.method}
            paymentStatus={latestPayment.status}
            onlinePaystackEnabled={isPaystackServerConfigured()}
            bankDetails={{
              bankName: settings.hotel_profile.bankName,
              bankAccountName: settings.hotel_profile.bankAccountName,
              bankAccountNumber: settings.hotel_profile.bankAccountNumber,
            }}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href={`/find-booking?ref=${encodeURIComponent(reservation.booking_reference)}&email=${encodeURIComponent(guest?.email || email)}`}
            className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs uppercase tracking-[0.18em]"
          >
            <span>Find / Manage This Booking</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-[#D8D1C5] px-6 py-3 text-xs uppercase tracking-[0.18em] text-[#171614]"
          >
            <span>Return Home</span>
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
