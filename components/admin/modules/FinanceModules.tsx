'use client';

import { useState } from 'react';
import { CancellationRecord, RefundRecord, RoleSlug } from '@/lib/types';
import { formatLagosDateTime, formatNaira } from '@/lib/timezone';
import { roleHasPermission } from '@/lib/auth/permissions';
import { AdminSnapshotData } from '@/components/admin/admin-types';

export function PaymentsTransactionsModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canVerify = roleHasPermission(role, 'payments:verify');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<'all' | 'online_paystack' | 'bank_transfer' | 'pos'>('all');
  const [search, setSearch] = useState('');

  const confirmedTotal = data.payments
    .filter((p) => p.status === 'confirmed')
    .reduce((acc, p) => acc + p.amount_ngn, 0);
  const pendingTotal = data.payments
    .filter((p) => ['pending', 'pending_verification'].includes(p.status))
    .reduce((acc, p) => acc + p.amount_ngn, 0);

  const filtered = data.payments.filter((pay) => {
    const res = data.reservations.find((r) => r.id === pay.reservation_id);
    const matchesMethod = methodFilter === 'all' || pay.method === methodFilter;
    const matchesSearch =
      !search.trim() ||
      (res?.booking_reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (pay.provider_reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (pay.bank_transfer_reference || '').toLowerCase().includes(search.toLowerCase());
    return matchesMethod && matchesSearch;
  });

  const handleConfirm = async (paymentId: string) => {
    setBusyId(paymentId);
    try {
      await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          notes: 'Payment confirmed by hotel operations.',
        }),
      });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5DFD5] p-5">
          <p className="text-xs text-[#6B6459]">Confirmed Collections</p>
          <p className="mt-1 text-2xl font-mono tabular-nums font-semibold text-[#171614]">
            {formatNaira(confirmedTotal)}
          </p>
        </div>
        <div className="bg-white border border-[#E5DFD5] p-5">
          <p className="text-xs text-[#6B6459]">Pending Verification / Balance</p>
          <p className="mt-1 text-2xl font-mono tabular-nums font-semibold text-amber-800">
            {formatNaira(pendingTotal)}
          </p>
        </div>
        <div className="bg-white border border-[#E5DFD5] p-5">
          <p className="text-xs text-[#6B6459]">Total Payment Records</p>
          <p className="mt-1 text-2xl font-mono tabular-nums font-semibold text-[#171614]">
            {data.payments.length}
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E5DFD5] p-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search booking or payment reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
        />
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
          aria-label="Filter payments by method"
          className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
        >
          <option value="all">All Payment Channels</option>
          <option value="online_paystack">Paystack Online</option>
          <option value="bank_transfer">GT Bank Transfer</option>
          <option value="pos">Front Desk POS</option>
        </select>
      </div>

      <div className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Booking Ref</th>
              <th className="py-3 px-4 font-medium">Channel</th>
              <th className="py-3 px-4 font-medium">Provider / Transfer Ref</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Amount</th>
              <th className="py-3 px-4 font-medium">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#6B6459]">
                  No payment records match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((pay) => {
                const res = data.reservations.find((r) => r.id === pay.reservation_id);
                return (
                  <tr key={pay.id} className="hover:bg-[#FAF8F4]">
                    <td className="py-3 px-4 font-mono font-medium text-[#171614] whitespace-nowrap">
                      {res?.booking_reference || pay.reservation_id}
                    </td>
                    <td className="py-3 px-4 capitalize text-[#3F3A32]">
                      {pay.method === 'online_paystack'
                        ? 'Paystack Online'
                        : pay.method === 'bank_transfer'
                        ? 'GT Bank Transfer'
                        : 'Front Desk POS'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#5C574F]">
                      {pay.provider_reference ||
                        (pay.bank_transfer_reference
                          ? `${pay.bank_transfer_sender || 'Transfer'} · ${pay.bank_transfer_reference}`
                          : 'Awaiting reference')}
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-[#171614]">
                      {pay.status.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#171614] whitespace-nowrap">
                      {formatNaira(pay.amount_ngn)}
                    </td>
                    <td className="py-3 px-4">
                      {canVerify && ['pending', 'pending_verification'].includes(pay.status) ? (
                        <button
                          type="button"
                          disabled={busyId === pay.id}
                          onClick={() => handleConfirm(pay.id)}
                          className="px-3 py-1 bg-[#0D0D0E] text-[#FAF9F6] text-[11px] hover:bg-[#24211D] whitespace-nowrap"
                        >
                          {busyId === pay.id ? 'Confirming...' : 'Verify & Confirm'}
                        </button>
                      ) : (
                        <span className="text-[#6B6459] font-mono text-[11px]">
                          {pay.verified_at ? formatLagosDateTime(pay.verified_at) : pay.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BankTransferConfirmationsModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canVerify = roleHasPermission(role, 'payments:verify');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const transferPayments = data.payments.filter((p) => p.method === 'bank_transfer');
  const pendingTransfers = transferPayments.filter((p) =>
    ['pending', 'pending_verification'].includes(p.status)
  );
  const verifiedTransfers = transferPayments.filter((p) => p.status === 'confirmed');

  const handleConfirmTransfer = async (paymentId: string) => {
    setBusyId(paymentId);
    setMessage('');
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          method: 'bank_transfer',
          notes: noteInputs[paymentId]?.trim() || 'GT Bank transfer verified in hotel account statement.',
        }),
      });
      if (res.ok) {
        setMessage('Bank transfer confirmed and reservation status updated to Confirmed.');
        await onRefresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#FAF6EE] border border-[#E2D5BE] p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <p className="font-semibold text-[#171614]">
            Designated Account: {data.settings.hotel_profile.bankName} · {data.settings.hotel_profile.bankAccountNumber}
          </p>
          <p className="text-[#5C574F] mt-0.5">
            Account Name: {data.settings.hotel_profile.bankAccountName}. Confirm transfers only after reconciling credit alert or bank statement.
          </p>
        </div>
        <div className="font-mono tabular-nums text-[#171614]">
          Pending: <strong>{pendingTransfers.length}</strong> · Verified: <strong>{verifiedTransfers.length}</strong>
        </div>
      </div>

      {message ? (
        <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 p-3">{message}</p>
      ) : null}

      <section className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <div className="p-4 border-b border-[#EFEAE0]">
          <h2 className="text-sm font-semibold text-[#171614]">
            Pending Bank Transfer Queue ({pendingTransfers.length})
          </h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Booking Ref &amp; Guest</th>
              <th className="py-3 px-4 font-medium">Sender &amp; Reference</th>
              <th className="py-3 px-4 font-medium">Stay Dates</th>
              <th className="py-3 px-4 font-medium text-right">Amount</th>
              <th className="py-3 px-4 font-medium">Verification Note &amp; Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {pendingTransfers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#6B6459]">
                  No bank transfers awaiting confirmation.
                </td>
              </tr>
            ) : (
              pendingTransfers.map((pay) => {
                const res = data.reservations.find((r) => r.id === pay.reservation_id);
                const guest = res ? data.guests.find((g) => g.id === res.primary_guest_id) : null;
                return (
                  <tr key={pay.id} className="hover:bg-[#FAF8F4]">
                    <td className="py-3 px-4">
                      <p className="font-mono font-medium text-[#171614]">
                        {res?.booking_reference || pay.reservation_id}
                      </p>
                      <p className="text-[11px] text-[#5C574F]">{guest?.full_name || 'Guest'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[#171614]">
                        {pay.bank_transfer_sender || 'Sender details not submitted yet'}
                      </p>
                      <p className="text-[11px] font-mono text-[#6B6459]">
                        {pay.bank_transfer_reference || 'Awaiting guest reference'}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[#5C574F] whitespace-nowrap">
                      {res ? `${res.check_in_date} / ${res.check_out_date}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#171614] whitespace-nowrap">
                      {formatNaira(pay.amount_ngn)}
                    </td>
                    <td className="py-3 px-4">
                      {canVerify ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="Optional reconciliation note"
                            value={noteInputs[pay.id] || ''}
                            onChange={(e) =>
                              setNoteInputs((prev) => ({ ...prev, [pay.id]: e.target.value }))
                            }
                            className="h-8 px-2 text-[11px] border border-[#D8D1C5] bg-[#FAF9F6] w-44"
                          />
                          <button
                            type="button"
                            disabled={busyId === pay.id}
                            onClick={() => handleConfirmTransfer(pay.id)}
                            className="h-8 px-3 bg-emerald-800 text-white text-[11px] font-medium hover:bg-emerald-900 whitespace-nowrap"
                          >
                            {busyId === pay.id ? 'Confirming...' : 'Confirm Transfer'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#6B6459]">Read-only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function CancellationRequestsModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canReview = roleHasPermission(role, 'cancellations:review');
  const [filter, setFilter] = useState<'requested' | 'all'>('requested');
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const items = data.cancellations.filter((c) => (filter === 'requested' ? c.status === 'requested' : true));

  const handleReview = async (record: CancellationRecord, decision: 'approve' | 'reject') => {
    setError('');
    setBusyId(record.id);
    try {
      const res = await fetch('/api/admin/cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationId: record.id,
          decision,
          decisionReason: decisionNotes[record.id]?.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not process cancellation decision.');
      } else {
        await onRefresh();
      }
    } catch {
      setError('Network error processing cancellation request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E5DFD5] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#171614]">Guest Cancellation Requests</h2>
          <p className="text-xs text-[#6B6459]">
            Approving cancels the booking and opens a refund item when payment was confirmed. Rejecting restores the previous booking status.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#F2EDE4]">
          <button
            type="button"
            onClick={() => setFilter('requested')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'requested' ? 'bg-white text-[#171614]' : 'text-[#5C574F]'
            }`}
          >
            Pending Review ({data.cancellations.filter((c) => c.status === 'requested').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'all' ? 'bg-white text-[#171614]' : 'text-[#5C574F]'
            }`}
          >
            All Requests ({data.cancellations.length})
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-red-800 bg-red-50 border border-red-200 p-3">{error}</p>
      ) : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-white border border-[#E5DFD5] p-8 text-center text-xs text-[#6B6459]">
            No cancellation requests in this view.
          </div>
        ) : (
          items.map((item) => {
            const res = data.reservations.find((r) => r.id === item.reservation_id);
            const guest = res ? data.guests.find((g) => g.id === res.primary_guest_id) : null;
            const cat = res ? data.categories.find((c) => c.id === res.category_id) : null;
            return (
              <div key={item.id} className="bg-white border border-[#E5DFD5] p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F2EDE4] pb-3">
                  <div>
                    <p className="text-sm font-semibold text-[#171614]">
                      <span className="font-mono">{res?.booking_reference || item.reservation_id}</span> ·{' '}
                      {guest?.full_name || 'Guest'}
                    </p>
                    <p className="text-xs text-[#5C574F] mt-0.5">
                      {cat?.name || 'Room'} · {res?.check_in_date} / {res?.check_out_date} ·{' '}
                      <span className="font-mono">{res ? formatNaira(res.total_amount_ngn) : ''}</span>
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-medium capitalize text-[#171614]">Status: {item.status}</p>
                    <p className="text-[11px] text-[#6B6459] font-mono">
                      Submitted: {formatLagosDateTime(item.cancelled_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium text-[#5C574F]">Guest Reason</p>
                    <p className="text-[#171614] mt-1">{item.reason}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[#5C574F]">Policy Window Check</p>
                    <p className="text-[#171614] mt-1">
                      {item.was_within_policy ? 'Submitted within policy window' : 'Exception / Outside window'} · Deadline:{' '}
                      <span className="font-mono">{formatLagosDateTime(item.policy_deadline_at)}</span>
                    </p>
                  </div>
                </div>

                {item.status === 'requested' && canReview ? (
                  <div className="pt-3 border-t border-[#F2EDE4] flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder="Decision notes for guest & audit trail..."
                      value={decisionNotes[item.id] || ''}
                      onChange={(e) =>
                        setDecisionNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="h-9 flex-1 min-w-56 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
                    />
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleReview(item, 'approve')}
                      className="h-9 px-4 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium hover:bg-[#24211D] disabled:opacity-60 whitespace-nowrap"
                    >
                      {busyId === item.id ? 'Processing...' : 'Approve Request'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleReview(item, 'reject')}
                      className="h-9 px-4 border border-red-300 text-red-800 text-xs font-medium hover:bg-red-50 disabled:opacity-60 whitespace-nowrap"
                    >
                      Reject Request
                    </button>
                  </div>
                ) : item.decision_reason ? (
                  <p className="text-xs text-[#5C574F] pt-2 border-t border-[#F2EDE4]">
                    Management Note: {item.decision_reason}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function RefundManagementModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canApprove = roleHasPermission(role, 'refunds:approve');
  const canProcess = roleHasPermission(role, 'refunds:process');
  const [providerRefs, setProviderRefs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleRefundAction = async (
    rf: RefundRecord,
    action: 'approve' | 'reject' | 'mark_processing' | 'complete' | 'fail',
    attemptPaystackRefund = false
  ) => {
    setError('');
    setBusyId(rf.id);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundId: rf.id,
          action,
          providerRefundReference: providerRefs[rf.id],
          attemptPaystackRefund,
          originalPaymentReference: rf.original_payment_reference || undefined,
          amountNgn: rf.amount_ngn,
        }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || 'Refund action failed.');
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-xs text-red-800 bg-red-50 border border-red-200 p-3">{error}</p>
      ) : null}

      <div className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Booking Ref</th>
              <th className="py-3 px-4 font-medium">Channel &amp; Payment Ref</th>
              <th className="py-3 px-4 font-medium">Policy Eligibility</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Amount</th>
              <th className="py-3 px-4 font-medium">Workflow Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {data.refunds.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#6B6459]">
                  No refund requests recorded.
                </td>
              </tr>
            ) : (
              data.refunds.map((rf) => {
                const res = data.reservations.find((r) => r.id === rf.reservation_id);
                const payment = data.payments.find((p) => p.id === rf.payment_id);
                const isPaystack = payment?.method === 'online_paystack';
                return (
                  <tr key={rf.id} className="hover:bg-[#FAF8F4]">
                    <td className="py-3 px-4 font-mono font-medium text-[#171614] whitespace-nowrap">
                      {res?.booking_reference || rf.reservation_id}
                    </td>
                    <td className="py-3 px-4">
                      <p className="capitalize text-[#171614]">
                        {isPaystack ? 'Paystack Refund' : 'Manual Bank Refund'}
                      </p>
                      <p className="font-mono text-[11px] text-[#6B6459]">
                        {rf.original_payment_reference || payment?.bank_transfer_reference || 'Bank Transfer'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-[#3F3A32]">
                      {rf.eligible ? 'Eligible under policy' : 'Outside policy'}
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-[#171614]">
                      {rf.request_status}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#171614] whitespace-nowrap">
                      {formatNaira(rf.amount_ngn)}
                    </td>
                    <td className="py-3 px-4 space-y-2">
                      {rf.request_status === 'requested' && canApprove ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === rf.id}
                            onClick={() => handleRefundAction(rf, 'approve')}
                            className="px-2.5 py-1 bg-[#0D0D0E] text-[#FAF9F6] text-[11px] whitespace-nowrap"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === rf.id}
                            onClick={() => handleRefundAction(rf, 'reject')}
                            className="px-2.5 py-1 border border-red-300 text-red-800 text-[11px] whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                      {['approved', 'processing'].includes(rf.request_status) && canProcess ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Bank / Paystack Refund Ref"
                            value={providerRefs[rf.id] || ''}
                            onChange={(e) =>
                              setProviderRefs((prev) => ({ ...prev, [rf.id]: e.target.value }))
                            }
                            className="h-7 px-2 text-[11px] border border-[#D8D1C5] bg-[#FAF9F6] font-mono w-40"
                          />
                          {isPaystack && rf.original_payment_reference ? (
                            <button
                              type="button"
                              disabled={busyId === rf.id}
                              onClick={() => handleRefundAction(rf, 'complete', true)}
                              className="px-2.5 py-1 bg-[#8C6822] text-white text-[11px] whitespace-nowrap"
                            >
                              Paystack Refund
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busyId === rf.id}
                            onClick={() => handleRefundAction(rf, 'complete', false)}
                            className="px-2.5 py-1 bg-emerald-800 text-white text-[11px] whitespace-nowrap"
                          >
                            Mark Completed
                          </button>
                        </div>
                      ) : null}
                      {rf.request_status === 'completed' ? (
                        <span className="font-mono text-[11px] text-emerald-800">
                          Ref: {rf.provider_refund_reference}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
