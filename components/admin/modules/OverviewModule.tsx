'use client';

import { ArrowRight } from 'lucide-react';
import { AdminSnapshotData } from '@/components/admin/admin-types';
import { formatLagosDateTime, formatNaira, getLagosDateString } from '@/lib/timezone';

export function OverviewModule({
  data,
  onNavigate,
}: {
  data: AdminSnapshotData;
  onNavigate: (tab: string) => void;
}) {
  const today = getLagosDateString();
  const activeRooms = data.rooms.filter((r) => r.is_active);
  const occupiedCount = activeRooms.filter((r) => r.operational_status === 'occupied').length;
  const blockedCount = activeRooms.filter(
    (r) => r.operational_status === 'maintenance' || r.operational_status === 'blocked'
  ).length;
  const availableNowCount = activeRooms.filter((r) => r.operational_status === 'available').length;
  const occupancyPct = activeRooms.length > 0 ? Math.round((occupiedCount / activeRooms.length) * 100) : 0;

  const upcomingCheckIns = data.reservations.filter(
    (r) => r.check_in_date === today && ['confirmed', 'pending_payment'].includes(r.status)
  );
  const upcomingCheckOuts = data.reservations.filter(
    (r) => r.check_out_date === today && r.status === 'checked_in'
  );
  const pendingTransfers = data.payments.filter(
    (p) => p.method === 'bank_transfer' && ['pending', 'pending_verification'].includes(p.status)
  );
  const pendingCancellations = data.cancellations.filter((c) => c.status === 'requested');
  const openRefunds = data.refunds.filter((rf) =>
    ['requested', 'approved', 'processing'].includes(rf.request_status)
  );
  const unreadChats = data.chatConversations.reduce((sum, c) => sum + c.unread_staff_count, 0);
  const confirmedRevenue = data.payments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount_ngn, 0);

  const stats = [
    {
      label: 'Confirmed Collections',
      value: formatNaira(confirmedRevenue),
      sub: `${data.payments.filter((p) => p.status === 'confirmed').length} verified transactions`,
      actionLabel: 'Payments',
      tab: 'payments',
    },
    {
      label: 'Current Room Occupancy',
      value: `${occupancyPct}%`,
      sub: `${occupiedCount} occupied · ${availableNowCount} available · ${blockedCount} blocked`,
      actionLabel: 'Room Availability',
      tab: 'availability',
    },
    {
      label: "Today's Arrivals / Departures",
      value: `${upcomingCheckIns.length} / ${upcomingCheckOuts.length}`,
      sub: `${data.reservations.length} total active & archived bookings`,
      actionLabel: 'Reservations',
      tab: 'reservations',
    },
    {
      label: 'Pending Bank Transfers',
      value: String(pendingTransfers.length),
      sub: 'Awaiting GT Bank confirmation',
      actionLabel: 'Confirm Transfers',
      tab: 'bank_transfers',
    },
    {
      label: 'Cancellation Requests',
      value: String(pendingCancellations.length),
      sub: `${openRefunds.length} open refund items`,
      actionLabel: 'Review Requests',
      tab: 'cancellations',
    },
    {
      label: 'Guest Live Chat',
      value: String(unreadChats),
      sub: `${data.chatConversations.filter((c) => c.status === 'open').length} open guest threads`,
      actionLabel: 'Open Inbox',
      tab: 'chat',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-[#E5DFD5] p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <p className="text-xs font-medium text-[#5C574F]">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#171614] tabular-nums font-mono">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-[#6B6459]">{item.sub}</p>
            </div>
            <div className="pt-3 border-t border-[#F2EDE4]">
              <button
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C6822] hover:text-[#171614] transition-colors"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Attention Required Strip */}
      {(pendingTransfers.length > 0 || pendingCancellations.length > 0 || openRefunds.length > 0) ? (
        <div className="bg-[#FAF6EE] border border-[#E2D5BE] p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[#171614]">Action Queue Summary</p>
            <p className="text-[#5C574F]">
              {pendingTransfers.length} bank transfers pending verification · {pendingCancellations.length} cancellation requests awaiting review · {openRefunds.length} refunds awaiting processing
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingTransfers.length > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('bank_transfers')}
                className="px-3 py-1.5 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium hover:bg-[#24211D] whitespace-nowrap"
              >
                Verify Bank Transfers ({pendingTransfers.length})
              </button>
            ) : null}
            {pendingCancellations.length > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('cancellations')}
                className="px-3 py-1.5 border border-[#0D0D0E] text-[#171614] text-xs font-medium hover:bg-white whitespace-nowrap"
              >
                Review Cancellations ({pendingCancellations.length})
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-[#E5DFD5] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EFEAE0] pb-3">
            <h2 className="text-sm font-semibold text-[#171614]">Recent Reservations</h2>
            <button
              type="button"
              onClick={() => onNavigate('reservations')}
              className="text-xs font-medium text-[#8C6822] hover:text-[#171614]"
            >
              Manage All
            </button>
          </div>
          {data.reservations.length === 0 ? (
            <p className="text-xs text-[#6B6459] py-6 text-center">
              No reservations recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5DFD5] text-[#6B6459]">
                    <th className="py-2 pr-3 font-medium">Reference</th>
                    <th className="py-2 pr-3 font-medium">Guest</th>
                    <th className="py-2 pr-3 font-medium">Dates</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EDE4]">
                  {data.reservations.slice(0, 8).map((res) => {
                    const guest = data.guests.find((g) => g.id === res.primary_guest_id);
                    return (
                      <tr key={res.id} className="hover:bg-[#FAF8F4]">
                        <td className="py-2.5 pr-3 font-mono text-[#171614]">{res.booking_reference}</td>
                        <td className="py-2.5 pr-3 text-[#3F3A32]">{guest?.full_name || 'Guest'}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-[#5C574F]">
                          {res.check_in_date} / {res.check_out_date}
                        </td>
                        <td className="py-2.5 pr-3 text-[#3F3A32] capitalize">
                          {res.status.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-[#171614]">
                          {formatNaira(res.total_amount_ngn)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-[#E5DFD5] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EFEAE0] pb-3">
            <h2 className="text-sm font-semibold text-[#171614]">Operational Activity</h2>
            <span className="text-xs text-[#6B6459] font-mono tabular-nums">
              {data.notifications.length} items
            </span>
          </div>
          {data.notifications.length === 0 ? (
            <p className="text-xs text-[#6B6459] py-6 text-center">
              No system notifications yet.
            </p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {data.notifications.slice(0, 8).map((note) => (
                <li key={note.id} className="border-b border-[#F2EDE4] pb-2.5 last:border-0">
                  <p className="text-xs font-medium text-[#171614]">{note.title}</p>
                  <p className="text-xs text-[#5C574F] mt-0.5">{note.message}</p>
                  <p className="text-[11px] text-[#7A7267] font-mono tabular-nums mt-1">
                    {formatLagosDateTime(note.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
