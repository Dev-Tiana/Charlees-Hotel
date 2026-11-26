'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PhysicalRoom, RoomCategory, RoleSlug } from '@/lib/types';
import { formatNaira, getLagosDateString } from '@/lib/timezone';
import { roleHasPermission } from '@/lib/auth/permissions';
import { AdminSnapshotData } from '@/components/admin/admin-types';

function addDaysIso(dateStr: string, offset: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offset));
  return dt.toISOString().slice(0, 10);
}

export function RoomManagementModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canManage = roleHasPermission(role, 'rooms:manage');
  const [newNumber, setNewNumber] = useState('');
  const [newFloor, setNewFloor] = useState('First Level');
  const [newCategoryId, setNewCategoryId] = useState(data.categories[0]?.id || '');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    bed_configuration_note: '',
    max_guests_note: '',
    dimensions_note: '',
    short_description: '',
    editorial_description: '',
    amenitiesText: '',
  });
  const [catSaving, setCatSaving] = useState(false);
  const [error, setError] = useState('');

  const startEditCategory = (cat: RoomCategory) => {
    setEditingCatId(cat.id);
    setCatForm({
      bed_configuration_note: cat.bed_configuration_note || '',
      max_guests_note: cat.max_guests_note || '',
      dimensions_note: cat.dimensions_note || '',
      short_description: cat.short_description,
      editorial_description: cat.editorial_description,
      amenitiesText: cat.verified_amenities.join(', '),
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatId) return;
    setCatSaving(true);
    setError('');
    try {
      const amenities = catForm.amenitiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          id: editingCatId,
          bed_configuration_note: catForm.bed_configuration_note || null,
          max_guests_note: catForm.max_guests_note || null,
          dimensions_note: catForm.dimensions_note || null,
          short_description: catForm.short_description,
          editorial_description: catForm.editorial_description,
          verified_amenities: amenities,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not update room category.');
      } else {
        setEditingCatId(null);
        await onRefresh();
      }
    } catch {
      setError('Network error updating room category.');
    } finally {
      setCatSaving(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'physical_room',
        categoryId: newCategoryId,
        roomNumber: newNumber,
        floorLabel: newFloor,
        operationalStatus: 'available',
        housekeepingStatus: 'inspected',
      }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || 'Could not add room.');
    else {
      setNewNumber('');
      await onRefresh();
    }
  };

  const handleRoomStatus = async (
    room: PhysicalRoom,
    operationalStatus: PhysicalRoom['operational_status']
  ) => {
    await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'physical_room',
        id: room.id,
        categoryId: room.category_id,
        roomNumber: room.room_number,
        floorLabel: room.floor_label,
        operationalStatus,
        housekeepingStatus: room.housekeeping_status,
        notes: room.notes,
        isActive: room.is_active,
      }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E5DFD5] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#171614]">Room Categories &amp; Verified Specs</h2>
          <p className="text-xs text-[#6B6459]">
            Verified room descriptions and amenities displayed on public category pages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {data.categories.map((cat) => (
            <div key={cat.id} className="border border-[#E5DFD5] p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[#171614]">{cat.name}</p>
                <p className="text-xs text-[#6B6459]">
                  {data.rooms.filter((r) => r.category_id === cat.id && r.is_active).length} active rooms · {formatNaira(cat.nightly_rate_ngn)}/night
                </p>
                <p className="text-[11px] text-[#5C574F]">
                  {cat.bed_configuration_note || 'Standard bedding'} · {cat.max_guests_note || 'Up to 2 Guests'}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() =>
                    editingCatId === cat.id ? setEditingCatId(null) : startEditCategory(cat)
                  }
                  className="w-full h-8 border border-[#D8D1C5] text-xs font-medium text-[#171614] hover:bg-[#FAF8F4]"
                >
                  {editingCatId === cat.id ? 'Close Specs Editor' : 'Edit Room Details & Amenities'}
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {editingCatId && canManage ? (
          <form onSubmit={handleSaveCategory} className="border-t border-[#E5DFD5] pt-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5C574F]">
              Editing: {data.categories.find((c) => c.id === editingCatId)?.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[#5C574F] mb-1">Bed Configuration</label>
                <input
                  type="text"
                  value={catForm.bed_configuration_note}
                  onChange={(e) => setCatForm((p) => ({ ...p, bed_configuration_note: e.target.value }))}
                  className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
                />
              </div>
              <div>
                <label className="block text-[#5C574F] mb-1">Max Occupancy</label>
                <input
                  type="text"
                  value={catForm.max_guests_note}
                  onChange={(e) => setCatForm((p) => ({ ...p, max_guests_note: e.target.value }))}
                  className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
                />
              </div>
              <div>
                <label className="block text-[#5C574F] mb-1">Dimensions Note</label>
                <input
                  type="text"
                  value={catForm.dimensions_note}
                  onChange={(e) => setCatForm((p) => ({ ...p, dimensions_note: e.target.value }))}
                  className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#5C574F] mb-1">Short Description</label>
                <input
                  type="text"
                  value={catForm.short_description}
                  onChange={(e) => setCatForm((p) => ({ ...p, short_description: e.target.value }))}
                  className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
                />
              </div>
              <div>
                <label className="block text-[#5C574F] mb-1">Verified Amenities (Comma separated)</label>
                <input
                  type="text"
                  value={catForm.amenitiesText}
                  onChange={(e) => setCatForm((p) => ({ ...p, amenitiesText: e.target.value }))}
                  className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={catSaving}
                className="bg-[#0D0D0E] text-[#FAF9F6] px-4 py-2 text-xs font-medium hover:bg-[#24211D] disabled:opacity-60"
              >
                {catSaving ? 'Saving...' : 'Save Room Specifications'}
              </button>
              <button
                type="button"
                onClick={() => setEditingCatId(null)}
                className="border border-[#D8D1C5] px-4 py-2 text-xs text-[#3F3A32] hover:bg-[#FAF8F4]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {canManage ? (
        <form onSubmit={handleAddRoom} className="bg-white border border-[#E5DFD5] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#171614]">Add Physical Room Unit</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              required
              placeholder="Room Number (e.g. 301)"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
            <input
              type="text"
              required
              placeholder="Floor Label"
              value={newFloor}
              onChange={(e) => setNewFloor(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <button type="submit" className="h-9 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium hover:bg-[#24211D]">
              Add Physical Room
            </button>
          </div>
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </form>
      ) : null}

      <section className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Room #</th>
              <th className="py-3 px-4 font-medium">Category</th>
              <th className="py-3 px-4 font-medium">Level</th>
              <th className="py-3 px-4 font-medium">Operational Status</th>
              <th className="py-3 px-4 font-medium">Housekeeping</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {data.rooms.map((room) => {
              const cat = data.categories.find((c) => c.id === room.category_id);
              return (
                <tr key={room.id} className="hover:bg-[#FAF8F4]">
                  <td className="py-3 px-4 font-mono font-medium text-[#171614]">{room.room_number}</td>
                  <td className="py-3 px-4 text-[#3F3A32]">{cat?.name}</td>
                  <td className="py-3 px-4 text-[#5C574F]">{room.floor_label}</td>
                  <td className="py-3 px-4">
                    {canManage ? (
                      <select
                        aria-label={`Operational status for Room ${room.room_number}`}
                        value={room.operational_status}
                        onChange={(e) =>
                          handleRoomStatus(room, e.target.value as PhysicalRoom['operational_status'])
                        }
                        className="h-8 px-2 text-xs border border-[#D8D1C5] bg-white capitalize"
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    ) : (
                      <span className="capitalize">{room.operational_status}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 capitalize text-[#5C574F]">{room.housekeeping_status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function RoomAvailabilityModule({ data }: { data: AdminSnapshotData }) {
  const [startDate, setStartDate] = useState(getLagosDateString());
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysIso(startDate, i)),
    [startDate]
  );

  const blockingStatuses = ['pending_payment', 'confirmed', 'checked_in', 'cancellation_requested'];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5DFD5] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[#171614]">7-Day Physical Room Availability Matrix</h2>
            <p className="text-xs text-[#6B6459]">
              Displays live occupied, pending payment, cancellation-requested, and maintenance-blocked inventory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="avail-start" className="text-[#5C574F]">Window Start:</label>
          <input
            id="avail-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value || getLagosDateString())}
            className="h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
          />
        </div>
      </div>

      {/* Category Availability Today */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.categories.map((cat) => {
          const catRooms = data.rooms.filter((r) => r.category_id === cat.id && r.is_active);
          const readyRooms = catRooms.filter(
            (r) => r.operational_status !== 'maintenance' && r.operational_status !== 'blocked'
          );
          const reservedToday = data.reservations.filter(
            (res) =>
              res.category_id === cat.id &&
              blockingStatuses.includes(res.status) &&
              res.check_in_date <= startDate &&
              res.check_out_date > startDate
          ).length;
          const freeCount = Math.max(0, readyRooms.length - reservedToday);

          return (
            <div key={cat.id} className="bg-white border border-[#E5DFD5] p-4 space-y-1">
              <p className="text-xs font-medium text-[#5C574F]">{cat.name}</p>
              <p className="text-xl font-mono tabular-nums font-semibold text-[#171614]">
                {freeCount} / {catRooms.length} free
              </p>
              <p className="text-[11px] text-[#6B6459] font-mono">On {startDate}</p>
            </div>
          );
        })}
      </div>

      {/* Room x Day Matrix */}
      <div className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Room</th>
              <th className="py-3 px-4 font-medium">Category</th>
              {days.map((day) => (
                <th key={day} className="py-3 px-3 font-mono font-medium text-center whitespace-nowrap">
                  {day.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {data.rooms.map((room) => {
              const cat = data.categories.find((c) => c.id === room.category_id);
              const isBlockedOut =
                room.operational_status === 'maintenance' || room.operational_status === 'blocked';

              return (
                <tr key={room.id} className="hover:bg-[#FAF8F4]">
                  <td className="py-3 px-4 font-mono font-medium text-[#171614] whitespace-nowrap">
                    Room {room.room_number}
                  </td>
                  <td className="py-3 px-4 text-[#5C574F] whitespace-nowrap">{cat?.name}</td>
                  {days.map((day) => {
                    if (isBlockedOut) {
                      return (
                        <td key={day} className="py-2 px-2 text-center bg-red-50 text-red-800 font-medium">
                          {room.operational_status === 'maintenance' ? 'Maint' : 'Blocked'}
                        </td>
                      );
                    }
                    const booking = data.reservations.find(
                      (res) =>
                        res.physical_room_id === room.id &&
                        blockingStatuses.includes(res.status) &&
                        res.check_in_date <= day &&
                        res.check_out_date > day
                    );
                    if (booking) {
                      const tone =
                        booking.status === 'pending_payment'
                          ? 'bg-amber-50 text-amber-900'
                          : booking.status === 'cancellation_requested'
                          ? 'bg-orange-50 text-orange-900'
                          : 'bg-[#0D0D0E] text-[#D6B46A]';
                      return (
                        <td key={day} className={`py-2 px-2 text-center font-mono text-[11px] ${tone}`} title={booking.booking_reference}>
                          {booking.booking_reference.slice(-6)}
                        </td>
                      );
                    }
                    return (
                      <td key={day} className="py-2 px-2 text-center text-emerald-800 bg-emerald-50/40">
                        Open
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RatesAndPackagesModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canManage = roleHasPermission(role, 'rates:manage');
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(data.categories.map((c) => [c.id, c.nightly_rate_ngn]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleSaveRate = async (cat: RoomCategory) => {
    const nextRate = Number(rates[cat.id] ?? cat.nightly_rate_ngn);
    if (!Number.isFinite(nextRate) || nextRate < 1000) return;
    setSavingId(cat.id);
    setMessage('');
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          id: cat.id,
          nightly_rate_ngn: nextRate,
        }),
      });
      if (res.ok) {
        setMessage(`Updated ${cat.name} nightly rate to ${formatNaira(nextRate)}.`);
        await onRefresh();
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5DFD5] p-5 space-y-2">
        <h2 className="text-sm font-semibold text-[#171614]">Nightly Room Rates &amp; Stay Policies</h2>
        <p className="text-xs text-[#6B6459]">
          Published rates reflect immediately across public room cards, booking calculation totals, and front desk bookings.
        </p>
      </div>

      {message ? (
        <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 p-3">{message}</p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.categories.map((cat) => (
          <div key={cat.id} className="bg-white border border-[#E5DFD5] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#171614]">{cat.name}</h3>
                <p className="text-xs text-[#6B6459] mt-0.5">{cat.short_description}</p>
              </div>
              <p className="text-lg font-mono tabular-nums font-semibold text-[#171614] whitespace-nowrap">
                {formatNaira(cat.nightly_rate_ngn)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F2EDE4] text-xs">
              <div>
                <p className="text-[#6B6459]">2 Nights</p>
                <p className="font-mono tabular-nums font-medium text-[#171614]">
                  {formatNaira((rates[cat.id] ?? cat.nightly_rate_ngn) * 2)}
                </p>
              </div>
              <div>
                <p className="text-[#6B6459]">3 Nights</p>
                <p className="font-mono tabular-nums font-medium text-[#171614]">
                  {formatNaira((rates[cat.id] ?? cat.nightly_rate_ngn) * 3)}
                </p>
              </div>
              <div>
                <p className="text-[#6B6459]">7 Nights</p>
                <p className="font-mono tabular-nums font-medium text-[#171614]">
                  {formatNaira((rates[cat.id] ?? cat.nightly_rate_ngn) * 7)}
                </p>
              </div>
            </div>

            {canManage ? (
              <div className="flex items-center gap-2 pt-2 border-t border-[#F2EDE4]">
                <input
                  type="number"
                  min={1000}
                  step={500}
                  aria-label={`Nightly rate in NGN for ${cat.name}`}
                  value={rates[cat.id] ?? cat.nightly_rate_ngn}
                  onChange={(e) =>
                    setRates((prev) => ({ ...prev, [cat.id]: Number(e.target.value) }))
                  }
                  className="h-9 flex-1 px-3 text-xs font-mono border border-[#D8D1C5] bg-[#FAF9F6]"
                />
                <button
                  type="button"
                  disabled={savingId === cat.id}
                  onClick={() => handleSaveRate(cat)}
                  className="h-9 px-4 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium hover:bg-[#24211D] disabled:opacity-60 whitespace-nowrap"
                >
                  {savingId === cat.id ? 'Saving...' : 'Update Rate'}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E5DFD5] p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <p className="font-semibold text-[#171614]">Check-In Policy</p>
          <p className="text-[#5C574F] mt-1">{data.settings.hotel_profile.checkInTimeNote}</p>
        </div>
        <div>
          <p className="font-semibold text-[#171614]">Check-Out Policy</p>
          <p className="text-[#5C574F] mt-1">{data.settings.hotel_profile.checkOutTimeNote}</p>
        </div>
        <div>
          <p className="font-semibold text-[#171614]">Dining &amp; Lounge Status</p>
          <p className="text-[#5C574F] mt-1">{data.settings.hotel_profile.diningStatusNote}</p>
        </div>
      </div>
    </div>
  );
}
