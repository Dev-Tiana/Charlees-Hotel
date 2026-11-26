'use client';

import { useState } from 'react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { formatNaira } from '@/lib/timezone';

export function ConfirmationActionsClient({
  bookingReference,
  guestEmail,
  amountNgn,
  paymentMethod,
  paymentStatus,
  onlinePaystackEnabled,
  bankDetails,
}: {
  bookingReference: string;
  guestEmail: string;
  amountNgn: number;
  paymentMethod: string;
  paymentStatus: string;
  onlinePaystackEnabled: boolean;
  bankDetails: {
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
  };
}) {
  const [senderName, setSenderName] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [paystackError, setPaystackError] = useState('');

  if (paymentStatus === 'confirmed') {
    return null;
  }

  const handlePaystackRetry = async () => {
    setPaystackLoading(true);
    setPaystackError('');
    try {
      const res = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference,
          guestEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.authorizationUrl) {
        setPaystackError(json.error || 'Unable to launch Paystack checkout.');
        setPaystackLoading(false);
        return;
      }
      window.location.assign(json.authorizationUrl);
    } catch {
      setPaystackError('Network error while connecting to Paystack.');
      setPaystackLoading(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bank_transfer',
          bookingReference,
          senderName,
          transferReference,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Unable to record transfer details.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error submitting transfer proof.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {guestEmail && (paymentMethod === 'online_paystack' || onlinePaystackEnabled) ? (
        <div className="border border-[#0D0D0E] bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8C6822]">
                Online Card Payment
              </p>
              <h3 className="font-display text-2xl text-[#171614]">
                Complete Payment with Paystack ({formatNaira(amountNgn)})
              </h3>
              <p className="text-xs text-[#5C574F] mt-1">
                {onlinePaystackEnabled
                  ? 'Proceed to Paystack secure checkout to pay immediately by card or USSD.'
                  : 'Paystack Checkout requires PAYSTACK_SECRET_KEY on the server.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePaystackRetry}
              disabled={paystackLoading}
              className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-5 py-3 text-xs uppercase tracking-[0.16em] hover:bg-[#26231F] disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4 text-[#D6B46A]" aria-hidden="true" />
              <span>{paystackLoading ? 'Redirecting...' : 'Pay Now via Paystack'}</span>
            </button>
          </div>
          {paystackError ? (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3">
              {paystackError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border border-[#E6E1D8] bg-white p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8C6822]">
            Bank Transfer Settlement
          </p>
          <h3 className="font-display text-2xl text-[#171614]">
            Transfer Details &amp; Proof Submission
          </h3>
          <p className="text-xs leading-relaxed text-[#5C574F]">
            Bank transfers remain in <strong>Payment Pending Confirmation</strong> status until confirmed by our accounting or front desk staff.
          </p>
        </div>

        <div className="bg-[#FAF9F6] border border-[#E6E1D8] p-4 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[#6B6459]">Bank: <strong className="text-[#171614]">{bankDetails.bankName}</strong></p>
            <p className="text-[#6B6459]">Account Name: <strong className="text-[#171614]">{bankDetails.bankAccountName}</strong></p>
            <p className="font-mono-tabular text-sm font-semibold text-[#171614] mt-0.5">
              Account Number: {bankDetails.bankAccountNumber}
            </p>
          </div>
          <div>
            <p className="text-[#6B6459]">Exact Amount Due:</p>
            <p className="font-mono-tabular text-base font-semibold text-[#171614]">
              {formatNaira(amountNgn)}
            </p>
            <p className="text-[#6B6459] mt-0.5">Narration: {bookingReference}</p>
          </div>
        </div>

        {submitted ? (
          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Transfer proof recorded. Your reservation stays in Payment Pending Confirmation until our team verifies the deposit into {bankDetails.bankName}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitProof} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sender-name" className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1">
                  Account Sender Name
                </label>
                <input
                  id="sender-name"
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5]"
                />
              </div>
              <div>
                <label htmlFor="transfer-ref" className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1">
                  Transfer Reference / Session ID
                </label>
                <input
                  id="transfer-ref"
                  type="text"
                  required
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] font-mono-tabular"
                />
              </div>
            </div>

            {error ? <p className="text-xs text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="bg-[#0D0D0E] text-[#FAF9F6] px-5 py-2.5 text-xs uppercase tracking-[0.16em] hover:bg-[#26231F]"
            >
              {loading ? 'Recording Reference...' : 'Submit Transfer Proof'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
