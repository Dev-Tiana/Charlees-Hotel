'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { RoomCategory } from '@/lib/types';
import { trackConversionEvent } from '@/components/public/AnalyticsTracker';

function getTodayAndTomorrow() {
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrowDate);
  return { today, tomorrow };
}

interface AvailabilityPreviewItem {
  category: RoomCategory;
  availableRoomsCount: number;
  totalActiveRooms: number;
  isAvailable: boolean;
  nights: number;
}

export function AvailabilityBar({
  categories = [],
}: {
  categories?: RoomCategory[];
}) {
  const { today, tomorrow } = getTodayAndTomorrow();
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(
    categories[0]?.slug || 'standard-room'
  );

  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AvailabilityPreviewItem[] | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError('Departure date must be after arrival date.');
      return;
    }
    setError('');
    setChecking(true);
    trackConversionEvent('availability_search', '/', {
      checkIn,
      checkOut,
      adults,
      selectedRoom,
    });

    try {
      const res = await fetch(
        `/api/availability?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not retrieve room availability.');
        setResults(null);
      } else {
        setResults((json.availability || []) as AvailabilityPreviewItem[]);
      }
    } catch {
      setError('Unable to reach the availability service.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <section
      aria-label="Stay availability planner"
      className="bg-[#0D0D0E] text-[#FAF9F6] border border-[#2C2822]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Editorial Anchor */}
        <div className="lg:col-span-3 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-[#26231E] flex flex-col justify-between bg-[#12110F]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#D6B46A]">
              Stay Planner
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal text-[#FAF9F6] leading-snug">
              Plan Your Arrival in Abraka
            </h2>
          </div>
          <p className="mt-4 text-xs text-[#9E978B] leading-relaxed">
            Real time physical inventory in West Africa Time.
          </p>
        </div>

        {/* Right Bespoke Charlees Ledger Form */}
        <form
          onSubmit={handleCheck}
          className="lg:col-span-9 p-6 sm:p-8 flex flex-col justify-between gap-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Check in */}
            <div className="border-b border-[#3A352D] pb-2 focus-within:border-[#D6B46A] transition-colors">
              <label
                htmlFor="charlees-checkin"
                className="block text-[11px] uppercase tracking-[0.2em] text-[#D6B46A] mb-2"
              >
                Check In
              </label>
              <input
                id="charlees-checkin"
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => {
                  const val = e.target.value;
                  setCheckIn(val);
                  if (val >= checkOut) {
                    const d = new Date(`${val}T00:00:00Z`);
                    d.setUTCDate(d.getUTCDate() + 1);
                    setCheckOut(d.toISOString().slice(0, 10));
                  }
                }}
                className="w-full bg-transparent text-base font-mono-tabular text-[#FAF9F6] focus:outline-none [color-scheme:dark]"
                required
              />
            </div>

            {/* Check out */}
            <div className="border-b border-[#3A352D] pb-2 focus-within:border-[#D6B46A] transition-colors">
              <label
                htmlFor="charlees-checkout"
                className="block text-[11px] uppercase tracking-[0.2em] text-[#D6B46A] mb-2"
              >
                Check Out
              </label>
              <input
                id="charlees-checkout"
                type="date"
                min={checkIn}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-transparent text-base font-mono-tabular text-[#FAF9F6] focus:outline-none [color-scheme:dark]"
                required
              />
            </div>

            {/* Guest Stepper */}
            <div className="border-b border-[#3A352D] pb-2">
              <span className="block text-[11px] uppercase tracking-[0.2em] text-[#D6B46A] mb-2">
                Guests
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-display text-[#FAF9F6]">
                  {adults} {adults === 1 ? 'Guest' : 'Guests'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdults((n) => Math.max(1, n - 1))}
                    aria-label="Decrease guests"
                    className="h-7 w-7 inline-flex items-center justify-center border border-[#3A352D] text-[#D6B46A] hover:border-[#D6B46A]"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdults((n) => Math.min(6, n + 1))}
                    aria-label="Increase guests"
                    className="h-7 w-7 inline-flex items-center justify-center border border-[#3A352D] text-[#D6B46A] hover:border-[#D6B46A]"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Room Tier Preference */}
            <div className="border-b border-[#3A352D] pb-2 focus-within:border-[#D6B46A] transition-colors">
              <label
                htmlFor="charlees-room-pref"
                className="block text-[11px] uppercase tracking-[0.2em] text-[#D6B46A] mb-2"
              >
                Room Category
              </label>
              <select
                id="charlees-room-pref"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full bg-transparent text-base font-display text-[#FAF9F6] focus:outline-none"
              >
                {(categories.length > 0
                  ? categories
                  : [
                      { slug: 'standard-room', name: 'Standard Room' },
                      { slug: 'twin-room', name: 'Twin Room' },
                      { slug: 'deluxe-room', name: 'Deluxe Room' },
                      { slug: 'luxury-room', name: 'Luxury Room' },
                    ]
                ).map((cat) => (
                  <option
                    key={cat.slug}
                    value={cat.slug}
                    className="bg-[#0D0D0E] text-[#FAF9F6]"
                  >
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#26231E]">
            <p className="text-xs text-[#A8A298]">
              {error ? (
                <span className="text-red-300">{error}</span>
              ) : (
                'Inspect open rooms across all four Charlees categories before confirming your stay.'
              )}
            </p>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="submit"
                disabled={checking}
                className="inline-flex items-center gap-2.5 bg-[#D6B46A] text-[#0D0D0E] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-[#E2C581] transition-colors whitespace-nowrap"
              >
                <span>{checking ? 'Checking Rooms...' : 'Check Availability'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Inline Availability Results Strip */}
      {results ? (
        <div className="border-t border-[#26231E] bg-[#141311] p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[#D6B46A]">
              Live Inventory · {checkIn} to {checkOut}
            </p>
            <button
              type="button"
              onClick={() => setResults(null)}
              className="text-xs text-[#9E978B] hover:text-white"
            >
              Close Availability
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {results.map((item) => (
              <div
                key={item.category.id}
                className={`border p-4 flex flex-col justify-between gap-3 ${
                  item.category.slug === selectedRoom
                    ? 'border-[#D6B46A] bg-[#1A1814]'
                    : 'border-[#2C2822] bg-[#0D0D0E]'
                }`}
              >
                <div>
                  <h3 className="font-display text-xl text-[#FAF9F6]">
                    {item.category.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#A8A298]">
                    {item.isAvailable
                      ? `${item.availableRoomsCount} of ${item.totalActiveRooms} rooms open`
                      : 'Unavailable for selected dates'}
                  </p>
                </div>
                <Link
                  href={`/book?room=${encodeURIComponent(item.category.slug)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&adults=${adults}`}
                  className={`inline-flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-[0.16em] font-medium ${
                    item.isAvailable
                      ? 'bg-[#D6B46A] text-[#0D0D0E] hover:bg-[#E2C581]'
                      : 'border border-[#3A352D] text-[#8F897D] pointer-events-none'
                  }`}
                >
                  <span>{item.isAvailable ? 'Proceed to Book' : 'Reserved'}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
