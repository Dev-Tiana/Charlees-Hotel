'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { HotelSettings, MediaAsset, PaymentMethod, RoomCategory } from '@/lib/types';
import { formatNaira } from '@/lib/timezone';
import { trackConversionEvent } from '@/components/public/AnalyticsTracker';
import { RoomMediaGallery } from '@/components/public/RoomMediaGallery';

interface AvailabilityItem {
  category: RoomCategory;
  totalActiveRooms: number;
  availableRoomsCount: number;
  isAvailable: boolean;
  nights: number;
  estimatedTotalNgn: number;
}

const ROOM_SECTION_MAP: Record<string, MediaAsset['section_key']> = {
  'standard-room': 'room_standard',
  'twin-room': 'room_twin',
  'deluxe-room': 'room_deluxe',
  'luxury-room': 'room_luxury',
};

interface BookingEngineClientProps {
  initialCheckIn: string;
  initialCheckOut: string;
  initialAdults: number;
  initialRoomSlug: string;
  initialAvailability: AvailabilityItem[];
  media: MediaAsset[];
  settings: HotelSettings;
  onlinePaystackEnabled: boolean;
}

export function BookingEngineClient({
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialRoomSlug,
  initialAvailability,
  media,
  settings,
  onlinePaystackEnabled,
}: BookingEngineClientProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const skipFirstFetchRef = useRef(true);

  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
  const [adults, setAdults] = useState(initialAdults);
  const [childrenCount, setChildrenCount] = useState(0);

  const [availability, setAvailability] = useState<AvailabilityItem[]>(initialAvailability);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availError, setAvailError] = useState('');

  const [selectedSlug, setSelectedSlug] = useState(() => {
    const requested = initialAvailability.find((i) => i.category.slug === initialRoomSlug);
    if (requested && requested.isAvailable) return requested.category.slug;
    const firstOpen = initialAvailability.find((i) => i.isAvailable);
    return requested?.category.slug || firstOpen?.category.slug || initialRoomSlug;
  });
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Extract<PaymentMethod, 'online_paystack' | 'bank_transfer'>>(
    onlinePaystackEnabled ? 'online_paystack' : 'bank_transfer'
  );
  const [bankSenderName, setBankSenderName] = useState('');
  const [bankTransferRef, setBankTransferRef] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdPendingUrl, setCreatedPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return;

    let active = true;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (active) setLoadingAvail(true);
    });

    fetch(
      `/api/availability?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setAvailError(json.error || 'Could not check room availability.');
          setAvailability([]);
        } else {
          setAvailError('');
          const list = (json.availability || []) as AvailabilityItem[];
          setAvailability(list);
          setSelectedSlug((prevSlug) => {
            const currentValid = list.find(
              (item) => item.category.slug === prevSlug && item.isAvailable
            );
            if (currentValid) return prevSlug;
            const firstOpen = list.find((item) => item.isAvailable);
            return firstOpen ? firstOpen.category.slug : prevSlug;
          });
        }
      })
      .catch(() => {
        if (active) setAvailError('Network error while checking room inventory.');
      })
      .finally(() => {
        if (active) setLoadingAvail(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [checkInDate, checkOutDate]);

  const selectedItem = availability.find((a) => a.category.slug === selectedSlug) ?? null;

  const selectedRoomAssets = selectedItem
    ? media
        .filter(
          (m) =>
            m.section_key === ROOM_SECTION_MAP[selectedItem.category.slug] ||
            m.category_slug === selectedItem.category.slug
        )
        .sort((a, b) => {
          if (a.media_type !== b.media_type) return a.media_type === 'video' ? -1 : 1;
          return a.sort_order - b.sort_order;
        })
    : [];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !selectedItem.isAvailable) {
      setSubmitError('Please select an available room category for your chosen dates.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setCreatedPendingUrl(null);

    try {
      trackConversionEvent('booking_submit_started', '/book', {
        category: selectedSlug,
        paymentMethod,
      });

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: selectedSlug,
          checkInDate,
          checkOutDate,
          adults,
          children: childrenCount,
          guestName,
          guestEmail,
          guestPhone,
          specialRequests,
          paymentMethod,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json.error || 'Unable to complete your reservation.');
        setSubmitting(false);
        return;
      }

      const bookingRef = json.reservation.booking_reference as string;
      const confirmationUrl = `/booking/confirmation?ref=${encodeURIComponent(
        bookingRef
      )}&email=${encodeURIComponent(guestEmail)}`;

      trackConversionEvent('booking_created', '/book', {
        bookingReference: bookingRef,
        totalNgn: json.reservation.total_amount_ngn,
      });

      if (paymentMethod === 'bank_transfer') {
        if (bankSenderName.trim() && bankTransferRef.trim()) {
          await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'bank_transfer',
              bookingReference: bookingRef,
              senderName: bankSenderName.trim(),
              transferReference: bankTransferRef.trim(),
            }),
          }).catch(() => undefined);
        }
        router.push(confirmationUrl);
        return;
      }

      // Real Paystack Checkout Initialization
      const initRes = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: bookingRef,
          guestEmail,
        }),
      });
      const initJson = await initRes.json();

      if (!initRes.ok || !initJson.authorizationUrl) {
        setCreatedPendingUrl(confirmationUrl);
        setSubmitError(
          initJson.error ||
            'Unable to launch Paystack online checkout. Your booking reference has been created in pending status — you can view it or complete payment via Bank Transfer.'
        );
        setSubmitting(false);
        return;
      }

      window.location.assign(initJson.authorizationUrl);
    } catch {
      setSubmitError('Network error while creating your reservation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-8 space-y-10">
        {/* STEP 1: DATES & GUESTS */}
        <section className="border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#EFEAE0] pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
                Step 01
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-[#171614]">
                Stay Dates &amp; Party Size
              </h2>
            </div>
            <Calendar className="w-5 h-5 text-[#8C6822]" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="book-checkin"
                className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Arrival Date
              </label>
              <input
                id="book-checkin"
                type="date"
                min={initialCheckIn}
                value={checkInDate}
                onChange={(e) => {
                  const nextIn = e.target.value;
                  setCheckInDate(nextIn);
                  if (nextIn >= checkOutDate) {
                    const d = new Date(`${nextIn}T00:00:00Z`);
                    d.setUTCDate(d.getUTCDate() + 1);
                    setCheckOutDate(d.toISOString().slice(0, 10));
                  }
                }}
                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] tabular-nums focus:outline-none focus:border-[#8C6822]"
              />
            </div>

            <div>
              <label
                htmlFor="book-checkout"
                className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Departure Date
              </label>
              <input
                id="book-checkout"
                type="date"
                min={checkInDate}
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] tabular-nums focus:outline-none focus:border-[#8C6822]"
              />
            </div>

            <div>
              <label
                htmlFor="book-adults"
                className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Adults
              </label>
              <select
                id="book-adults"
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Adult' : 'Adults'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="book-children"
                className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Children
              </label>
              <select
                id="book-children"
                value={childrenCount}
                onChange={(e) => setChildrenCount(Number(e.target.value))}
                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Child' : 'Children'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {availError ? (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">
              {availError}
            </p>
          ) : null}
        </section>

        {/* STEP 2: SELECTED ROOM DETAILS + ROOM TIER SWITCHER */}
        <section className="border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#EFEAE0] pb-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
              Step 02
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#171614]">
              Selected Room &amp; Availability
            </h2>
          </div>

          {selectedItem ? (
            <div className="border border-[#0D0D0E] bg-[#FAF9F6] p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-6">
                  <RoomMediaGallery
                    roomName={selectedItem.category.name}
                    assets={selectedRoomAssets}
                    currentIndex={Math.min(
                      galleryIndex,
                      Math.max(0, selectedRoomAssets.length - 1)
                    )}
                    onSelectIndex={setGalleryIndex}
                    portraitMode={selectedItem.category.slug === 'twin-room'}
                    portraitCoverMode={
                      selectedItem.category.slug === 'deluxe-room' ||
                      selectedItem.category.slug === 'luxury-room'
                    }
                  />
                </div>
                <div className="md:col-span-6 space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822] font-semibold">
                      Automatically Selected Room
                    </p>
                    <h3 className="font-display text-3xl text-[#171614] mt-1">
                      {selectedItem.category.name}
                    </h3>
                    <p className="mt-1 font-mono-tabular text-sm text-[#171614]">
                      {selectedItem.isAvailable
                        ? `${selectedItem.availableRoomsCount} open for these dates`
                        : 'Sold out for selected dates'}
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-[#4A453E]">
                    {selectedItem.category.editorial_description ||
                      selectedItem.category.short_description}
                  </p>

                  <dl className="space-y-1.5 text-xs text-[#4A453E] border-t border-[#E6E1D8] pt-3">
                    {selectedItem.category.bed_configuration_note ? (
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6B6459]">Bed Configuration</dt>
                        <dd className="font-medium text-[#171614]">
                          {selectedItem.category.bed_configuration_note}
                        </dd>
                      </div>
                    ) : null}
                    {selectedItem.category.max_guests_note ? (
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6B6459]">Occupancy</dt>
                        <dd className="font-medium text-[#171614]">
                          {selectedItem.category.max_guests_note}
                        </dd>
                      </div>
                    ) : null}
                    {selectedItem.category.dimensions_note ? (
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6B6459]">Dimensions</dt>
                        <dd className="font-medium text-[#171614]">
                          {selectedItem.category.dimensions_note}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {selectedItem.category.verified_amenities.length > 0 ? (
                    <div className="border-t border-[#E6E1D8] pt-3 space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#8C6822] font-medium">
                        Verified Room Features
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#4A453E]">
                        {selectedItem.category.verified_amenities.map((feat) => (
                          <li key={feat} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#8C6822] shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[#6B6459]">
              Compare or Switch Room Category
            </p>
            {loadingAvail ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-[#F2EFE9] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {availability.map((item) => {
                  const isSelected = item.category.slug === selectedSlug;
                  return (
                    <button
                      key={item.category.id}
                      type="button"
                      disabled={!item.isAvailable}
                      onClick={() => {
                        setSelectedSlug(item.category.slug);
                        setGalleryIndex(0);
                      }}
                      className={`w-full text-left border p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        !item.isAvailable
                          ? 'opacity-55 bg-[#F5F2EB] border-[#E6E1D8] cursor-not-allowed'
                          : isSelected
                            ? 'border-[#0D0D0E] bg-[#FAF9F6]'
                            : 'border-[#E6E1D8] bg-white hover:border-[#8C6822]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-xl text-[#171614]">
                            {item.category.name}
                          </span>
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8C6822]">
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Selected</span>
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#6B6459]">
                          {item.isAvailable
                            ? `${item.availableRoomsCount} physical rooms available for selected dates`
                            : 'Sold out or blocked for these dates'}
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[#8C6822]">
                          {isSelected ? 'Selected Room' : item.isAvailable ? 'Select Room' : 'Unavailable'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* STEP 3: GUEST DETAILS & PAYMENT METHOD */}
        <form
          onSubmit={handleBookingSubmit}
          className="border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-6"
        >
          <div className="border-b border-[#EFEAE0] pb-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
              Step 03
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#171614]">
              Guest Details &amp; Payment Selection
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="guest-name"
                className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="guest-name"
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
              />
            </div>

            <div>
              <label
                htmlFor="guest-email"
                className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="guest-email"
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="guest-phone"
              className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
            >
              Telephone / WhatsApp Number
            </label>
            <input
              id="guest-phone"
              type="tel"
              required
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
            />
          </div>

          <div>
            <label
              htmlFor="special-req"
              className="block text-xs uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
            >
              Arrival Notes (Optional)
            </label>
            <textarea
              id="special-req"
              rows={3}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full p-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
            />
          </div>

          {/* TWO SUPPORTED PAYMENT METHODS ONLY: PAYSTACK & BANK TRANSFER */}
          <div className="space-y-4 border-t border-[#EFEAE0] pt-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8C6822]">
              Payment Method
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('online_paystack')}
                className={`p-5 text-left border transition-colors ${
                  paymentMethod === 'online_paystack'
                    ? 'border-[#0D0D0E] bg-[#FAF9F6]'
                    : 'border-[#E6E1D8] hover:border-[#8C6822]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#171614]">
                    Online Card Payment (Paystack)
                  </span>
                  <CreditCard className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5C574F]">
                  {onlinePaystackEnabled
                    ? 'Redirects directly to Paystack Checkout and verifies payment securely on the server.'
                    : 'Requires PAYSTACK_SECRET_KEY configured on the server to launch live checkout.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-5 text-left border transition-colors ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-[#0D0D0E] bg-[#FAF9F6]'
                    : 'border-[#E6E1D8] hover:border-[#8C6822]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#171614]">Bank Transfer</span>
                  <Building2 className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5C574F]">
                  Transfer to {settings.hotel_profile.bankName} ({settings.hotel_profile.bankAccountNumber}). Booking stays Payment Pending Confirmation until verified.
                </p>
              </button>
            </div>

            {paymentMethod === 'bank_transfer' ? (
              <div className="border border-[#E6E1D8] bg-[#FAF9F6] p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="uppercase tracking-[0.16em] text-[#8C6822]">
                      Official Hotel Bank Account
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-[#171614]">
                      {settings.hotel_profile.bankName}
                    </p>
                    <p className="font-mono-tabular text-base font-semibold text-[#171614] mt-0.5">
                      {settings.hotel_profile.bankAccountNumber}
                    </p>
                    <p className="text-[#4A453E] mt-0.5">
                      {settings.hotel_profile.bankAccountName}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.16em] text-[#8C6822]">
                      Exact Amount Due
                    </p>
                    <p className="mt-1.5 font-mono-tabular text-xl font-semibold text-[#171614]">
                      {selectedItem ? formatNaira(selectedItem.estimatedTotalNgn) : '—'}
                    </p>
                    <p className="mt-1 text-[#5C574F] leading-relaxed">
                      Status upon creation: <strong>Payment Pending Confirmation</strong> until verified by staff.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E6E1D8]">
                  <div>
                    <label
                      htmlFor="book-bank-sender"
                      className="block text-[11px] uppercase tracking-[0.16em] text-[#8C6822] mb-1"
                    >
                      Sender Account Name (Optional Now)
                    </label>
                    <input
                      id="book-bank-sender"
                      type="text"
                      placeholder="Can also be submitted after transfer"
                      value={bankSenderName}
                      onChange={(e) => setBankSenderName(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border border-[#D8D1C5]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="book-bank-ref"
                      className="block text-[11px] uppercase tracking-[0.16em] text-[#8C6822] mb-1"
                    >
                      Transfer Reference (Optional Now)
                    </label>
                    <input
                      id="book-bank-ref"
                      type="text"
                      placeholder="Session / Transaction Reference"
                      value={bankTransferRef}
                      onChange={(e) => setBankTransferRef(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border border-[#D8D1C5] font-mono-tabular"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <AnimatePresence>
            {submitError ? (
              <motion.div
                initial={shouldReduce ? undefined : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 space-y-2"
              >
                <p>{submitError}</p>
                {createdPendingUrl ? (
                  <Link
                    href={createdPendingUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#0D0D0E] underline"
                  >
                    <span>Open Pending Reservation Summary</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting || !selectedItem?.isAvailable}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-7 py-4 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] disabled:opacity-50"
          >
            <span>
              {submitting
                ? paymentMethod === 'online_paystack'
                  ? 'Connecting to Paystack Checkout...'
                  : 'Recording Pending Reservation...'
                : paymentMethod === 'online_paystack'
                  ? 'Proceed to Paystack Payment'
                  : 'Create Booking (Payment Pending Confirmation)'}
            </span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>

      {/* SUMMARY SIDEBAR */}
      <aside className="lg:col-span-4 border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
        <div className="border-b border-[#EFEAE0] pb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
            Reservation Summary
          </p>
          <h3 className="font-display text-2xl text-[#171614] mt-1">
            {selectedItem?.category.name || 'Select a Room'}
          </h3>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B6459]">Arrival</dt>
            <dd className="font-mono-tabular text-[#171614]">{checkInDate}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B6459]">Departure</dt>
            <dd className="font-mono-tabular text-[#171614]">{checkOutDate}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B6459]">Guests</dt>
            <dd className="text-[#171614]">
              {adults} {adults === 1 ? 'Adult' : 'Adults'}
              {childrenCount > 0 ? `, ${childrenCount} Children` : ''}
            </dd>
          </div>
          {selectedItem ? (
            <>
              <div className="flex justify-between gap-3 border-t border-[#EFEAE0] pt-3">
                <dt className="text-[#6B6459]">Nightly Rate</dt>
                <dd className="font-mono-tabular text-[#171614]">
                  {formatNaira(selectedItem.category.nightly_rate_ngn)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B6459]">Stay Duration</dt>
                <dd className="font-mono-tabular text-[#171614]">
                  {selectedItem.nights} {selectedItem.nights === 1 ? 'night' : 'nights'}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-[#E6E1D8] pt-3 font-medium text-base">
                <dt className="text-[#171614]">Total Amount</dt>
                <dd className="font-mono-tabular text-[#171614]">
                  {formatNaira(selectedItem.estimatedTotalNgn)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-[#EFEAE0] pt-3 text-xs text-[#5C574F]">
                <dt className="text-[#6B6459]">Physical Rooms Open</dt>
                <dd className="font-mono-tabular text-[#171614]">
                  {selectedItem.availableRoomsCount} of {selectedItem.totalActiveRooms}
                </dd>
              </div>
            </>
          ) : null}
        </dl>

        <div className="border-t border-[#EFEAE0] pt-4 space-y-2 text-xs text-[#5C574F] leading-relaxed">
          <div className="flex items-center gap-2 text-[#171614] font-medium">
            <ShieldCheck className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
            <span>Cancellation Policy (Africa/Lagos)</span>
          </div>
          <p>
            Advance stays may submit a cancellation request up to {settings.cancellation_policy.advanceDaysRequired} day before arrival. Same-day bookings may submit a cancellation request within {settings.cancellation_policy.sameDayWindowMinutes} minutes of booking creation.
          </p>
        </div>
      </aside>
    </div>
  );
}
