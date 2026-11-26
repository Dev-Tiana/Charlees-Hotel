'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, CreditCard, Search, XCircle } from 'lucide-react';
import { formatLagosDateTime, formatNaira } from '@/lib/timezone';
import { CopyReferenceButton } from '@/components/public/CopyReferenceButton';
import { PaymentReceiptCard } from '@/components/public/PaymentReceiptCard';
import {
  CancellationRecord,
  Guest,
  PaymentRecord,
  PhysicalRoom,
  RefundRecord,
  Reservation,
  RoomCategory,
} from '@/lib/types';
import type { SampleBookingPreview } from '@/lib/db/seed-data';

interface LookupPayload {
  reservation: Reservation;
  guest: Guest | null;
  category: RoomCategory | null;
  physicalRoom: PhysicalRoom | null;
  payments: PaymentRecord[];
  cancellation: CancellationRecord | null;
  refunds: RefundRecord[];
  bankDetails?: {
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
  };
  cancellationPolicy: {
    withinPolicyWindow: boolean;
    canRequestCancellation: boolean;
    hasPendingRequest: boolean;
    isExpired: boolean;
    expiredMessage: string;
    deadlineAt: string;
    isSameDayBooking: boolean;
    refundTimelineNote: string;
    refundPercentageConfirmedByManagement: boolean;
  };
}

function formatBookingStatus(status: string, paymentStatus: string): string {
  if (status === 'cancellation_requested') return 'Cancellation Requested';
  if (status === 'pending_payment' && paymentStatus === 'pending_verification') {
    return 'Payment Pending Confirmation';
  }
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ManageBookingClient({
  initialRef = '',
  initialEmail = '',
  sampleBookings = [],
}: {
  initialRef?: string;
  initialEmail?: string;
  sampleBookings?: SampleBookingPreview[];
}) {
  const [reference, setReference] = useState(initialRef);
  const [email, setEmail] = useState(initialEmail);
  const [data, setData] = useState<LookupPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [reason, setReason] = useState('');
  const [refundAccountName, setRefundAccountName] = useState('');
  const [refundBankName, setRefundBankName] = useState('');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [requestingCancel, setRequestingCancel] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [senderName, setSenderName] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofMsg, setProofMsg] = useState('');
  const [paystackRetryError, setPaystackRetryError] = useState('');
  const [paystackRetrying, setPaystackRetrying] = useState(false);

  const performLookup = async (refVal: string, emailVal: string) => {
    if (!refVal.trim() || !emailVal.trim()) return;
    setLoading(true);
    setError('');
    setCancelFeedback('');
    setCancelError('');
    setProofMsg('');
    setPaystackRetryError('');
    try {
      const res = await fetch(
        `/api/bookings/lookup?reference=${encodeURIComponent(refVal)}&email=${encodeURIComponent(emailVal)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Reservation not found.');
        setData(null);
      } else {
        setData(json as LookupPayload);
      }
    } catch {
      setError('Unable to reach the reservation server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialRef || !initialEmail) return;
    let active = true;
    fetch(
      `/api/bookings/lookup?reference=${encodeURIComponent(initialRef)}&email=${encodeURIComponent(initialEmail)}`
    )
      .then(async (res) => {
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(json.error || 'Reservation not found.');
          setData(null);
        } else {
          setError('');
          setData(json as LookupPayload);
        }
      })
      .catch(() => {
        if (active) setError('Unable to reach the reservation server.');
      });
    return () => {
      active = false;
    };
  }, [initialRef, initialEmail]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(reference, email);
  };

  const handleRequestCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!/^\d{6,20}$/.test(refundAccountNumber.trim())) {
      setCancelError('Please enter a valid numeric bank account number (6 to 20 digits).');
      return;
    }
    setRequestingCancel(true);
    setCancelFeedback('');
    setCancelError('');

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: data.reservation.booking_reference,
          guestEmail: data.guest?.email || email,
          reason,
          refundAccountName: refundAccountName.trim(),
          refundBankName: refundBankName.trim(),
          refundAccountNumber: refundAccountNumber.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCancelError(json.error || 'Unable to submit cancellation request.');
      } else {
        setCancelFeedback(
          json.message ||
            'Your cancellation request has been submitted and is awaiting review by Charlees Hotel & Suites.'
        );
        setReason('');
        setRefundAccountName('');
        setRefundBankName('');
        setRefundAccountNumber('');
        await performLookup(data.reservation.booking_reference, data.guest?.email || email);
      }
    } catch {
      setCancelError('Network error while submitting cancellation request.');
    } finally {
      setRequestingCancel(false);
    }
  };

  const handleTransferProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setProofLoading(true);
    setProofMsg('');
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bank_transfer',
          bookingReference: data.reservation.booking_reference,
          senderName,
          transferReference: transferRef,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setProofMsg(json.error || 'Could not save bank transfer proof.');
      } else {
        setProofMsg(json.message || 'Transfer details submitted.');
        await performLookup(data.reservation.booking_reference, data.guest?.email || email);
      }
    } catch {
      setProofMsg('Network error submitting transfer proof.');
    } finally {
      setProofLoading(false);
    }
  };

  const handlePaystackPayment = async () => {
    if (!data) return;
    setPaystackRetrying(true);
    setPaystackRetryError('');
    try {
      const res = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: data.reservation.booking_reference,
          guestEmail: data.guest?.email || email,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.authorizationUrl) {
        setPaystackRetryError(json.error || 'Unable to initialize Paystack Checkout.');
        setPaystackRetrying(false);
        return;
      }
      window.location.assign(json.authorizationUrl);
    } catch {
      setPaystackRetryError('Network error starting Paystack Checkout.');
      setPaystackRetrying(false);
    }
  };

  const latestPayment = data?.payments[0] || null;
  const isConfirmedPaid = Boolean(
    data &&
      data.reservation.payment_status === 'paid' &&
      latestPayment?.status === 'confirmed'
  );
  const needsPaymentAction =
    data &&
    !['cancelled', 'checked_out', 'no_show'].includes(data.reservation.status) &&
    data.reservation.payment_status !== 'paid' &&
    data.reservation.payment_status !== 'refunded';

  return (
    <div className="space-y-10">
      <form onSubmit={handleSearch} className="no-print border border-[#E6E1D8] bg-white p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="lookup-ref"
              className="block text-xs uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
            >
              Booking Reference
            </label>
            <input
              id="lookup-ref"
              type="text"
              required
              placeholder="CH-261124-A1B2C3"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] font-mono-tabular uppercase focus:outline-none focus:border-[#8C6822]"
            />
          </div>

          <div className="md:col-span-5">
            <label
              htmlFor="lookup-email"
              className="block text-xs uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
            >
              Guest Email Address
            </label>
            <input
              id="lookup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-4 text-xs uppercase tracking-[0.16em] hover:bg-[#26231F]"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{loading ? 'Searching' : 'Find Booking'}</span>
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 p-3">
            {error}
          </p>
        ) : null}

        {sampleBookings.length > 0 ? (
          <div className="mt-5 pt-4 border-t border-[#EFEAE0] space-y-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Sample Mock Bookings (Click to Load)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sampleBookings.map((sample) => (
                <button
                  key={sample.bookingReference}
                  type="button"
                  onClick={() => {
                    setReference(sample.bookingReference);
                    setEmail(sample.guestEmail);
                    performLookup(sample.bookingReference, sample.guestEmail);
                  }}
                  className="text-left border border-[#E6E1D8] bg-[#FAF9F6] p-3 hover:border-[#8C6822] transition-colors"
                >
                  <p className="font-mono-tabular text-xs font-semibold text-[#171614]">
                    {sample.bookingReference}
                  </p>
                  <p className="text-xs text-[#4A453E] mt-0.5">{sample.roomLabel}</p>
                  <p className="text-[11px] text-[#6B6459] mt-0.5">{sample.statusLabel}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>

      {data ? (
        <div className="space-y-8">
          <section className="no-print border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFEAE0] pb-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                  Reservation Details
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-3xl text-[#171614]">
                    {data.reservation.booking_reference}
                  </h2>
                  <CopyReferenceButton reference={data.reservation.booking_reference} />
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 border border-[#0D0D0E] bg-[#FAF9F6] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#171614]">
                {formatBookingStatus(data.reservation.status, data.reservation.payment_status)}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <dt className="text-xs text-[#6B6459]">Room Tier &amp; Room</dt>
                <dd className="mt-1 font-medium text-[#171614]">
                  {data.category?.name}{' '}
                  {data.physicalRoom ? `(Room ${data.physicalRoom.room_number})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B6459]">Stay Dates</dt>
                <dd className="mt-1 font-mono-tabular text-[#171614]">
                  {data.reservation.check_in_date} to {data.reservation.check_out_date}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B6459]">Total &amp; Payment Status</dt>
                <dd className="mt-1 font-mono-tabular text-[#171614]">
                  {formatNaira(data.reservation.total_amount_ngn)} (
                  {data.reservation.payment_status === 'pending_verification'
                    ? 'Payment Pending Confirmation'
                    : data.reservation.payment_status.replace(/_/g, ' ')})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B6459]">Cancellation Window (WAT)</dt>
                <dd className="mt-1 font-mono-tabular text-[#171614]">
                  {formatLagosDateTime(data.cancellationPolicy.deadlineAt)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Verified Payment Receipt — Shown ONLY when Paid & Confirmed */}
          {isConfirmedPaid && latestPayment ? (
            <PaymentReceiptCard
              bookingReference={data.reservation.booking_reference}
              paymentReference={
                latestPayment.provider_reference ||
                latestPayment.bank_transfer_reference ||
                data.reservation.booking_reference
              }
              guestName={data.guest?.full_name || 'Charlees Guest'}
              roomCategoryName={data.category?.name || 'Guest Room'}
              roomNumber={data.physicalRoom?.room_number || null}
              checkInDate={data.reservation.check_in_date}
              checkOutDate={data.reservation.check_out_date}
              nights={data.reservation.nights}
              adults={data.reservation.adults}
              childrenCount={data.reservation.children}
              amountPaidNgn={latestPayment.amount_ngn || data.reservation.total_amount_ngn}
              paymentMethodLabel={
                latestPayment.method === 'online_paystack'
                  ? 'Online Card Payment (Paystack)'
                  : latestPayment.method === 'pos'
                    ? 'POS / Front Desk Settlement'
                    : latestPayment.method === 'cash'
                      ? 'Front Desk Cash Settlement'
                      : 'Bank Transfer (GT Bank)'
              }
              paymentDateIso={
                latestPayment.verified_at ||
                latestPayment.created_at ||
                data.reservation.created_at
              }
            />
          ) : data.reservation.payment_status === 'pending_verification' ? (
            <div className="no-print border border-amber-200 bg-amber-50/75 p-4 text-xs text-amber-950 leading-relaxed">
              <strong>Payment Pending Confirmation:</strong> Your bank transfer reservation is waiting for staff verification. A payment receipt becomes available automatically once settlement is confirmed.
            </div>
          ) : null}

          {/* Pending Payment Options */}
          {needsPaymentAction ? (
            <section className="border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFEAE0] pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                    Pending Settlement
                  </p>
                  <h3 className="font-display text-2xl text-[#171614]">
                    Complete Payment ({formatNaira(data.reservation.total_amount_ngn)})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handlePaystackPayment}
                  disabled={paystackRetrying}
                  className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-5 py-2.5 text-xs uppercase tracking-[0.16em] hover:bg-[#26231F]"
                >
                  <CreditCard className="w-4 h-4 text-[#D6B46A]" aria-hidden="true" />
                  <span>{paystackRetrying ? 'Redirecting...' : 'Pay Online via Paystack'}</span>
                </button>
              </div>

              {paystackRetryError ? (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3">
                  {paystackRetryError}
                </p>
              ) : null}

              <div className="bg-[#FAF9F6] border border-[#E6E1D8] p-4 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="uppercase tracking-[0.14em] text-[#8C6822]">Bank Transfer Account</p>
                  <p className="mt-1 font-medium text-[#171614]">
                    {data.bankDetails?.bankName || 'GT Bank'} ·{' '}
                    <span className="font-mono-tabular">{data.bankDetails?.bankAccountNumber || '0222817122'}</span>
                  </p>
                  <p className="text-[#5C574F]">{data.bankDetails?.bankAccountName || 'Charlees Hotel & Suites'}</p>
                </div>
                <form onSubmit={handleTransferProof} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Sender Name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="h-9 px-2.5 text-xs bg-white border border-[#D8D1C5]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Transfer Reference"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="h-9 px-2.5 text-xs bg-white border border-[#D8D1C5] font-mono-tabular"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={proofLoading}
                    className="bg-[#0D0D0E] text-[#FAF9F6] px-4 py-2 text-[11px] uppercase tracking-[0.14em]"
                  >
                    {proofLoading ? 'Submitting...' : 'Submit Bank Transfer Proof'}
                  </button>
                  {proofMsg ? <p className="text-xs text-[#171614]">{proofMsg}</p> : null}
                </form>
              </div>
            </section>
          ) : null}

          {/* Refund Tracking */}
          {data.refunds.length > 0 ? (
            <section className="border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-4">
              <h3 className="font-display text-2xl text-[#171614]">Refund Tracking</h3>
              {data.refunds.map((rf) => (
                <div
                  key={rf.id}
                  className="border border-[#EFEAE0] bg-[#FAF9F6] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm"
                >
                  <div>
                    <p className="text-xs text-[#6B6459]">Refund Status</p>
                    <p className="font-medium uppercase text-[#171614] mt-0.5">
                      {rf.request_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B6459]">Eligible Amount</p>
                    <p className="font-mono-tabular text-[#171614] mt-0.5">
                      {formatNaira(rf.amount_ngn)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B6459]">Reference / Note</p>
                    <p className="text-xs text-[#4A453E] mt-0.5">
                      {rf.provider_refund_reference || rf.notes}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {/* Cancellation Request Section (Staff Review Required) */}
          <section className="border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-5">
            <h3 className="font-display text-2xl text-[#171614]">
              Cancellation Request Status
            </h3>

            {cancelFeedback ? (
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-950">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <p>{cancelFeedback}</p>
              </div>
            ) : null}

            {data.reservation.status === 'cancelled' ? (
              <div className="border border-[#E6E1D8] bg-[#F2EFE9] p-5 text-sm text-[#4A453E] space-y-1">
                <p className="font-medium text-[#171614]">Cancellation Approved</p>
                <p>
                  This reservation was cancelled on{' '}
                  <span className="font-mono-tabular">
                    {data.cancellation
                      ? formatLagosDateTime(data.cancellation.reviewed_at || data.cancellation.cancelled_at)
                      : ''}
                  </span>
                  . Reason: {data.cancellation?.reason}
                </p>
                {data.cancellation?.decision_reason ? (
                  <p className="text-xs text-[#5C574F]">
                    Management note: {data.cancellation.decision_reason}
                  </p>
                ) : null}
              </div>
            ) : data.cancellationPolicy.hasPendingRequest ||
              data.reservation.status === 'cancellation_requested' ? (
              <div className="border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 flex items-start gap-3">
                <Clock className="w-5 h-5 mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-semibold uppercase tracking-[0.12em] text-xs">
                    Cancellation Requested · Pending Hotel Review
                  </p>
                  <p>
                    Submitted on{' '}
                    <span className="font-mono-tabular">
                      {data.cancellation ? formatLagosDateTime(data.cancellation.cancelled_at) : ''}
                    </span>
                    . Reason: {data.cancellation?.reason}
                  </p>
                  <p className="text-xs">
                    Awaiting review by Charlees Hotel &amp; Suites management before room release and any eligible refund processing.
                  </p>
                  {data.cancellation?.refund_bank_name ? (
                    <p className="text-xs font-mono-tabular text-amber-900">
                      Refund account on file: {data.cancellation.refund_account_name} ·{' '}
                      {data.cancellation.refund_bank_name} ({data.cancellation.refund_account_number})
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                {data.cancellation?.status === 'rejected' ? (
                  <div className="border border-[#E6E1D8] bg-[#FAF9F6] p-4 text-xs text-[#4A453E] space-y-1">
                    <p className="font-semibold text-[#171614] uppercase tracking-[0.12em]">
                      Previous Cancellation Request Declined
                    </p>
                    <p>{data.cancellation.decision_reason || 'Declined by hotel management.'}</p>
                  </div>
                ) : null}

                {data.cancellationPolicy.canRequestCancellation ? (
                  <form onSubmit={handleRequestCancellation} className="space-y-5">
                    <p className="text-sm text-[#4A453E]">
                      Your booking is within the cancellation request window until{' '}
                      <span className="font-mono-tabular font-medium">
                        {formatLagosDateTime(data.cancellationPolicy.deadlineAt)}
                      </span>{' '}
                      (West Africa Time). Requests are reviewed by our staff before final cancellation and refund processing.
                    </p>

                    <div className="border border-[#E6E1D8] bg-[#FAF9F6] p-4 space-y-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#8C6822] font-medium">
                        Guest Bank Details for Eligible Refund
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor="refund-account-name"
                            className="block text-[11px] uppercase tracking-[0.14em] text-[#5C574F] mb-1"
                          >
                            Account Name
                          </label>
                          <input
                            id="refund-account-name"
                            type="text"
                            required
                            placeholder="Full account name"
                            value={refundAccountName}
                            onChange={(e) => setRefundAccountName(e.target.value)}
                            className="w-full h-10 px-3 text-sm bg-white border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="refund-bank-name"
                            className="block text-[11px] uppercase tracking-[0.14em] text-[#5C574F] mb-1"
                          >
                            Bank Name
                          </label>
                          <input
                            id="refund-bank-name"
                            type="text"
                            required
                            placeholder="e.g. GTBank / Access Bank"
                            value={refundBankName}
                            onChange={(e) => setRefundBankName(e.target.value)}
                            className="w-full h-10 px-3 text-sm bg-white border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="refund-account-number"
                            className="block text-[11px] uppercase tracking-[0.14em] text-[#5C574F] mb-1"
                          >
                            Account Number
                          </label>
                          <input
                            id="refund-account-number"
                            type="text"
                            inputMode="numeric"
                            pattern="\d{6,20}"
                            required
                            placeholder="10-digit NUBAN"
                            value={refundAccountNumber}
                            onChange={(e) => setRefundAccountNumber(e.target.value.replace(/\s+/g, ''))}
                            className="w-full h-10 px-3 text-sm bg-white border border-[#D8D1C5] font-mono-tabular focus:outline-none focus:border-[#8C6822]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="cancel-reason"
                        className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
                      >
                        Reason for Cancellation Request
                      </label>
                      <textarea
                        id="cancel-reason"
                        rows={3}
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
                      />
                    </div>
                    {cancelError ? (
                      <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">
                        {cancelError}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={requestingCancel}
                      className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs uppercase tracking-[0.18em] hover:bg-[#26231F]"
                    >
                      <XCircle className="w-4 h-4 text-[#D6B46A]" aria-hidden="true" />
                      <span>
                        {requestingCancel ? 'Submitting Request...' : 'Request Cancellation'}
                      </span>
                    </button>
                  </form>
                ) : (
                  <div className="flex items-start gap-3 text-sm text-[#5C574F] bg-[#FAF9F6] border border-[#E6E1D8] p-4">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-[#8C6822] shrink-0" aria-hidden="true" />
                    <p>{data.cancellationPolicy.expiredMessage}</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
