'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PaymentMethod, Reservation, RoleSlug } from '@/lib/types';
import { formatNaira, getLagosDateString, getLagosTomorrowDateString } from '@/lib/timezone';
import { roleHasPermission } from '@/lib/auth/permissions';
import { AdminSnapshotData } from '@/components/admin/admin-types';

export function ReservationsModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const today = getLagosDateString();
  const tomorrow = getLagosTomorrowDateString();
  const [categorySlug, setCategorySlug] = useState(data.categories[0]?.slug || 'standard-room');
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pos' | 'bank_transfer' | 'online_paystack'>('pos');
  const [markPaidImmediately, setMarkPaidImmediately] = useState(true);

  const canManage = roleHasPermission(role, 'reservations:manage');
  const canOverride = roleHasPermission(role, 'reservations:cancel_override');

  const filtered = data.reservations.filter((r) => {
    const guest = data.guests.find((g) => g.id === r.primary_guest_id);
    const matchText =
      !search.trim() ||
      r.booking_reference.toLowerCase().includes(search.toLowerCase()) ||
      (guest?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (guest?.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchText && matchStatus;
  });

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusyId('create');
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          categorySlug,
          checkInDate,
          checkOutDate,
          adults: 1,
          children: 0,
          guestName,
          guestEmail,
          guestPhone,
          paymentMethod,
          markPaidImmediately: paymentMethod === 'pos' ? markPaidImmediately : false,
          bookingSource: 'front_desk',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not create reservation.');
      } else {
        setShowCreate(false);
        setGuestName('');
        setGuestEmail('');
        setGuestPhone('');
        await onRefresh();
      }
    } catch {
      setError('Network error creating reservation.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdate = async (
    reservationId: string,
    payload: { status?: Reservation['status']; physicalRoomId?: string }
  ) => {
    setError('');
    setBusyId(reservationId);
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', reservationId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || 'Update failed.');
      await onRefresh();
    } catch {
      setError('Network error updating reservation.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStaffCancel = async (bookingReference: string, overrideException: boolean) => {
    setError('');
    setBusyId(bookingReference);
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          bookingReference,
          reason: overrideException
            ? 'Cancelled by authorized management under exception override'
            : 'Cancelled by hotel staff',
          overrideException,
        }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || 'Cancellation failed.');
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E5DFD5] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search reference, guest name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6] text-[#171614]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter reservations by status"
            className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6] text-[#171614]"
          >
            <option value="all">All Statuses</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="cancellation_requested">Cancellation Requested</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setShowCreate((p) => !p)}
            className="inline-flex items-center gap-1.5 bg-[#0D0D0E] text-[#FAF9F6] px-4 py-2 text-xs font-medium hover:bg-[#24211D] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Walk-In Reservation</span>
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-red-800 bg-red-50 border border-red-200 p-3">
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <form onSubmit={handleCreateWalkIn} className="bg-white border border-[#E5DFD5] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#171614]">Create Front Desk Reservation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              {data.categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({formatNaira(c.nightly_rate_ngn)})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Guest Full Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <input
              type="email"
              required
              placeholder="Guest Email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <input
              type="tel"
              required
              placeholder="Phone Number"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value as Extract<PaymentMethod, 'pos' | 'bank_transfer' | 'online_paystack'>
                )
              }
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              <option value="pos">POS Terminal at Desk</option>
              <option value="bank_transfer">GT Bank Transfer</option>
              <option value="online_paystack">Paystack Online Checkout</option>
            </select>
            {paymentMethod === 'pos' ? (
              <label className="inline-flex items-center gap-2 text-xs text-[#3F3A32]">
                <input
                  type="checkbox"
                  checked={markPaidImmediately}
                  onChange={(e) => setMarkPaidImmediately(e.target.checked)}
                />
                <span>Mark POS payment confirmed immediately</span>
              </label>
            ) : null}
            <button
              type="submit"
              disabled={busyId === 'create'}
              className="bg-[#0D0D0E] text-[#FAF9F6] px-4 py-2 text-xs font-medium hover:bg-[#24211D] disabled:opacity-60"
            >
              {busyId === 'create' ? 'Booking...' : 'Create Reservation'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Reference</th>
              <th className="py-3 px-4 font-medium">Guest</th>
              <th className="py-3 px-4 font-medium">Category &amp; Room</th>
              <th className="py-3 px-4 font-medium">Dates</th>
              <th className="py-3 px-4 font-medium">Status / Payment</th>
              <th className="py-3 px-4 font-medium text-right">Total</th>
              <th className="py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#6B6459]">
                  No reservations match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((res) => {
                const guest = data.guests.find((g) => g.id === res.primary_guest_id);
                const cat = data.categories.find((c) => c.id === res.category_id);
                const room = data.rooms.find((rm) => rm.id === res.physical_room_id);
                const catRooms = data.rooms.filter(
                  (rm) => rm.category_id === res.category_id && rm.is_active
                );

                return (
                  <tr key={res.id} className="hover:bg-[#FAF8F4]">
                    <td className="py-3 px-4 font-mono text-[#171614] whitespace-nowrap">
                      {res.booking_reference}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#171614]">{guest?.full_name}</p>
                      <p className="text-[11px] text-[#6B6459]">{guest?.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[#171614]">{cat?.name}</p>
                      {canManage ? (
                        <select
                          aria-label={`Assign room for ${res.booking_reference}`}
                          value={res.physical_room_id || ''}
                          onChange={(e) =>
                            handleUpdate(res.id, { physicalRoomId: e.target.value })
                          }
                          className="mt-1 h-7 px-1.5 text-[11px] border border-[#D8D1C5] bg-white font-mono"
                        >
                          {catRooms.map((cr) => (
                            <option key={cr.id} value={cr.id}>
                              Room {cr.room_number}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] font-mono text-[#6B6459]">
                          Room {room?.room_number || 'Unassigned'}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[#3F3A32] whitespace-nowrap">
                      {res.check_in_date} / {res.check_out_date}
                    </td>
                    <td className="py-3 px-4">
                      <p
                        className={`font-medium capitalize ${
                          res.status === 'cancellation_requested'
                            ? 'text-amber-800'
                            : res.status === 'cancelled'
                            ? 'text-red-800'
                            : 'text-[#171614]'
                        }`}
                      >
                        {res.status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] text-[#6B6459] capitalize">
                        Payment: {res.payment_status.replace(/_/g, ' ')}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#171614] whitespace-nowrap">
                      {formatNaira(res.total_amount_ngn)}
                    </td>
                    <td className="py-3 px-4">
                      {canManage ? (
                        <div className="flex flex-wrap gap-1.5">
                          {res.status === 'pending_payment' ? (
                            <button
                              type="button"
                              disabled={busyId === res.id}
                              onClick={() => handleUpdate(res.id, { status: 'confirmed' })}
                              className="px-2.5 py-1 border border-[#D8D1C5] text-[11px] text-[#171614] hover:bg-[#F5F2EC] whitespace-nowrap"
                            >
                              Confirm
                            </button>
                          ) : null}
                          {res.status === 'confirmed' ? (
                            <button
                              type="button"
                              disabled={busyId === res.id}
                              onClick={() => handleUpdate(res.id, { status: 'checked_in' })}
                              className="px-2.5 py-1 bg-[#0D0D0E] text-[#FAF9F6] text-[11px] hover:bg-[#24211D] whitespace-nowrap"
                            >
                              Check In
                            </button>
                          ) : null}
                          {res.status === 'checked_in' ? (
                            <button
                              type="button"
                              disabled={busyId === res.id}
                              onClick={() => handleUpdate(res.id, { status: 'checked_out' })}
                              className="px-2.5 py-1 bg-emerald-800 text-white text-[11px] hover:bg-emerald-900 whitespace-nowrap"
                            >
                              Check Out
                            </button>
                          ) : null}
                          {['pending_payment', 'confirmed'].includes(res.status) ? (
                            <button
                              type="button"
                              disabled={busyId === res.booking_reference}
                              onClick={() =>
                                handleStaffCancel(
                                  res.booking_reference,
                                  new Date() > new Date(res.cancellation_deadline_at) && canOverride
                                )
                              }
                              className="px-2.5 py-1 border border-red-300 text-red-800 text-[11px] hover:bg-red-50 whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
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
