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
  ChevronDown,
  ChevronUp,
  CreditCard,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { HotelSettings, MediaAsset, PaymentMethod, RoomCategory } from '@/lib/types';
import { calculateNights, formatNaira } from '@/lib/timezone';
import { trackConversionEvent } from '@/components/public/AnalyticsTracker';
import { RoomMediaGallery } from '@/components/public/RoomMediaGallery';
import { DevModeNotice } from '@/components/public/DevModeNotice';

interface AvailabilityEntry {
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

interface RoomShowcaseAndBookingProps {
  categories: RoomCategory[];
  media: MediaAsset[];
  initialToday: string;
  initialTomorrow: string;
  initialAvailability?: AvailabilityEntry[];
  bankDetails?: Pick<
    HotelSettings['hotel_profile'],
    'bankName' | 'bankAccountName' | 'bankAccountNumber'
  >;
  onlinePaystackEnabled: boolean;
  advanceDaysRequired?: number;
  sameDayWindowMinutes?: number;
  initialRoomSlug?: string;
  initialOpenBooking?: boolean;
  expandAllOnMount?: boolean;
  isDevelopmentMode?: boolean;
}

function toAvailabilityRecord(entries: AvailabilityEntry[] = []): Record<string, AvailabilityEntry> {
  const map: Record<string, AvailabilityEntry> = {};
  for (const entry of entries) {
    map[entry.category.slug] = entry;
  }
  return map;
}

export function RoomShowcaseAndBooking({
  categories,
  media,
  initialToday,
  initialTomorrow,
  initialAvailability,
  bankDetails = {
    bankName: 'GT Bank',
    bankAccountName: 'Charlees Hotel & Suites',
    bankAccountNumber: '0222817122',
  },
  onlinePaystackEnabled,
  advanceDaysRequired = 1,
  sameDayWindowMinutes = 60,
  initialRoomSlug = '',
  initialOpenBooking = false,
  expandAllOnMount = false,
  isDevelopmentMode = false,
}: RoomShowcaseAndBookingProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const bookingSectionRef = useRef<HTMLDivElement | null>(null);
  const skipFirstFetchRef = useRef(Boolean(initialAvailability && initialAvailability.length > 0));

  const [expandedBySlug, setExpandedBySlug] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    if (expandAllOnMount) {
      for (const cat of categories) {
        map[cat.slug] = true;
      }
      return map;
    }
    const defaultSlug =
      initialRoomSlug && categories.some((c) => c.slug === initialRoomSlug)
        ? initialRoomSlug
        : categories[0]?.slug || '';
    if (defaultSlug) map[defaultSlug] = true;
    return map;
  });
  const [slideIndexBySlug, setSlideIndexBySlug] = useState<Record<string, number>>({});
  const [bookingRoomSlug, setBookingRoomSlug] = useState<string | null>(
    initialOpenBooking && initialRoomSlug ? initialRoomSlug : null
  );

  // Connected Booking Form State (always bound strictly to bookingRoomSlug)
  const [checkInDate, setCheckInDate] = useState(initialToday);
  const [checkOutDate, setCheckOutDate] = useState(initialTomorrow);
  const [adults, setAdults] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    Extract<PaymentMethod, 'online_paystack' | 'bank_transfer'>
  >(onlinePaystackEnabled ? 'online_paystack' : 'bank_transfer');

  const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilityEntry>>(() =>
    toAvailabilityRecord(initialAvailability)
  );
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [availError, setAvailError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdPendingUrl, setCreatedPendingUrl] = useState<string | null>(null);

  // Query live availability whenever stay dates change after SSR initial render
  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return;
    let active = true;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (active) setCheckingAvail(true);
    });
    fetch(
      `/api/availability?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setAvailError(json.error || 'Could not verify room availability for selected dates.');
        } else {
          setAvailError('');
          const list = (json.availability || []) as AvailabilityEntry[];
          setAvailabilityMap(toAvailabilityRecord(list));
        }
      })
      .catch(() => {
        if (active) setAvailError('Network error while verifying physical room inventory.');
      })
      .finally(() => {
        if (active) setCheckingAvail(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [checkInDate, checkOutDate]);

  const handleToggleRoom = (slug: string) => {
    setSubmitError('');
    const currentlyOpen = Boolean(expandedBySlug[slug]);
    if (currentlyOpen) {
      setExpandedBySlug((prev) => ({ ...prev, [slug]: false }));
      if (bookingRoomSlug === slug) {
        setBookingRoomSlug(null);
      }
    } else {
      setExpandedBySlug((prev) => ({ ...prev, [slug]: true }));
      if (bookingRoomSlug && bookingRoomSlug !== slug) {
        setBookingRoomSlug(null);
      }
      trackConversionEvent('room_inspected', '/', { categorySlug: slug });
    }
  };

  const handleProceedToBook = (slug: string) => {
    setExpandedBySlug((prev) => ({ ...prev, [slug]: true }));
    setBookingRoomSlug(slug);
    setSubmitError('');
    trackConversionEvent('room_booking_opened', '/', { categorySlug: slug });
    setTimeout(() => {
      bookingSectionRef.current?.scrollIntoView({
        behavior: shouldReduce ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }, 120);
  };

  const handleSelectSlide = (slug: string, index: number) => {
    setSlideIndexBySlug((prev) => ({ ...prev, [slug]: index }));
  };

  const handleBookingSubmit = async (e: React.FormEvent, lockedCategory: RoomCategory) => {
    e.preventDefault();
    const avail = availabilityMap[lockedCategory.slug];
    if (avail && !avail.isAvailable) {
      setSubmitError(
        `All physical rooms in ${lockedCategory.name} are reserved for ${checkInDate} to ${checkOutDate}. Please choose different dates.`
      );
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setCreatedPendingUrl(null);

    try {
      trackConversionEvent('booking_submit_started', '/rooms', {
        category: lockedCategory.slug,
        paymentMethod,
      });

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: lockedCategory.slug,
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

      trackConversionEvent('booking_created', '/rooms', {
        bookingReference: bookingRef,
        category: lockedCategory.slug,
      });

      if (paymentMethod === 'bank_transfer') {
        router.push(confirmationUrl);
        return;
      }

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
            'Unable to launch Paystack online checkout. Your pending booking reference has been created — open your summary to pay by Bank Transfer.'
        );
        setSubmitting(false);
        return;
      }

      window.location.assign(initJson.authorizationUrl);
    } catch {
      setSubmitError('Network error while completing reservation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {categories.map((cat, idx) => {
        const isExpanded = Boolean(expandedBySlug[cat.slug]);
        const isBookingThisRoom = bookingRoomSlug === cat.slug;
        const sectionKey = ROOM_SECTION_MAP[cat.slug];

        // Gather authentic room photography/video only (strictly scoped per category)
        const roomAssets = media
          .filter((m) => m.section_key === sectionKey || m.category_slug === cat.slug)
          .sort((a, b) => {
            if (a.media_type !== b.media_type) {
              return a.media_type === 'video' ? -1 : 1;
            }
            return a.sort_order - b.sort_order;
          });
        const currentSlideIdx = Math.min(
          slideIndexBySlug[cat.slug] ?? 0,
          Math.max(0, roomAssets.length - 1)
        );
        const liveAvail = availabilityMap[cat.slug];

        return (
          <article
            key={cat.id}
            id={`room-${cat.slug}`}
            className={`border transition-colors bg-white ${
              isExpanded
                ? 'border-[#0D0D0E] shadow-[0_14px_40px_rgba(23,22,20,0.06)]'
                : 'border-[#E6E1D8] hover:border-[#8C6822]'
            }`}
          >
            {/* ROOM CATEGORY HEADER ROW */}
            <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <button
                type="button"
                onClick={() => handleToggleRoom(cat.slug)}
                aria-expanded={isExpanded}
                className="flex-1 text-left group focus:outline-none"
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] text-[#8C6822]">
                    Room Tier 0{idx + 1}
                  </span>
                  {liveAvail ? (
                    <span className="text-[11px] text-[#5C574F]">
                      {liveAvail.isAvailable
                        ? `${liveAvail.availableRoomsCount} of ${liveAvail.totalActiveRooms} rooms open`
                        : 'Reserved for selected dates'}
                    </span>
                  ) : null}
                </div>

                <h3 className="font-display text-2xl sm:text-4xl font-normal text-[#171614] group-hover:text-[#8C6822] transition-colors">
                  {cat.name}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-[#5C574F] max-w-2xl leading-relaxed">
                  {cat.short_description}
                </p>
              </button>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleRoom(cat.slug)}
                  className={`inline-flex items-center gap-2 border px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] transition-colors ${
                    isExpanded
                      ? 'border-[#0D0D0E] bg-[#FAF9F6] text-[#171614]'
                      : 'border-[#D8D1C5] text-[#171614] hover:border-[#8C6822]'
                  }`}
                >
                  <span>{isExpanded ? 'Hide Details' : 'View Room'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleProceedToBook(cat.slug)}
                  className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.16em] hover:bg-[#26231F] transition-colors"
                >
                  <span>Book {cat.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* EXPANDED ROOM DETAILS + PHOTO GALLERY/CAROUSEL DIRECTLY UNDERNEATH */}
            <AnimatePresence initial={false}>
              {isExpanded ? (
                <motion.div
                  key={`panel-${cat.slug}`}
                  initial={shouldReduce ? { opacity: 1 } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: shouldReduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-t border-[#E6E1D8] bg-[#FAF9F6]"
                >
                  <div className="p-6 sm:p-8 lg:p-10 space-y-10">
                    {/* PHOTO CAROUSEL + VERIFIED ROOM INFORMATION */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                      {/* Swipeable Media Gallery Column */}
                      <div className="lg:col-span-7">
                        <RoomMediaGallery
                          roomName={cat.name}
                          assets={roomAssets}
                          currentIndex={currentSlideIdx}
                          onSelectIndex={(nextIdx) => handleSelectSlide(cat.slug, nextIdx)}
                          portraitMode={cat.slug === 'twin-room'}
                          portraitCoverMode={cat.slug === 'deluxe-room' || cat.slug === 'luxury-room'}
                        />
                      </div>

                      {/* Verified Room Information Column */}
                      <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-white border border-[#E6E1D8] p-6 sm:p-7">
                        <div className="space-y-4">
                          <div className="border-b border-[#EFEAE0] pb-4 flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
                                Room Tier 0{idx + 1}
                              </p>
                              <h4 className="mt-1 font-display text-3xl font-normal text-[#171614]">
                                {cat.name}
                              </h4>
                            </div>
                            <Link
                              href={`/rooms/${cat.slug}`}
                              className="text-[11px] uppercase tracking-[0.16em] text-[#8C6822] underline hover:text-[#171614] whitespace-nowrap shrink-0 mt-1"
                            >
                              Room Page
                            </Link>
                          </div>

                          <p className="text-sm sm:text-base leading-relaxed text-[#4A453E]">
                            {cat.editorial_description || cat.short_description}
                          </p>

                          <div className="border-t border-[#EFEAE0] pt-4 space-y-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822] font-semibold">
                              Verified Room Details
                            </p>

                            {cat.verified_amenities.length > 0 ||
                            cat.bed_configuration_note ||
                            cat.dimensions_note ||
                            cat.max_guests_note ? (
                              <dl className="space-y-2 text-sm text-[#4A453E]">
                                {cat.bed_configuration_note ? (
                                  <div className="flex justify-between gap-4 border-b border-[#F2EFE9] pb-1.5">
                                    <dt className="text-[#6B6459]">Bed Configuration</dt>
                                    <dd className="font-medium text-[#171614]">
                                      {cat.bed_configuration_note}
                                    </dd>
                                  </div>
                                ) : null}
                                {cat.max_guests_note ? (
                                  <div className="flex justify-between gap-4 border-b border-[#F2EFE9] pb-1.5">
                                    <dt className="text-[#6B6459]">Occupancy</dt>
                                    <dd className="font-medium text-[#171614]">
                                      {cat.max_guests_note}
                                    </dd>
                                  </div>
                                ) : null}
                                {cat.dimensions_note ? (
                                  <div className="flex justify-between gap-4 border-b border-[#F2EFE9] pb-1.5">
                                    <dt className="text-[#6B6459]">Room Size</dt>
                                    <dd className="font-medium text-[#171614]">
                                      {cat.dimensions_note}
                                    </dd>
                                  </div>
                                ) : null}
                                {cat.verified_amenities.map((amenity) => (
                                  <div key={amenity} className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-[#8C6822] shrink-0" aria-hidden="true" />
                                    <span>{amenity}</span>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <p className="text-xs leading-relaxed text-[#6B6459]">
                                Full room specifications, bed configuration, and in room notes are maintained by Charlees Hotel reception and published here once confirmed by management.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-[#EFEAE0] pt-5 space-y-3">
                          {!isBookingThisRoom ? (
                            <button
                              type="button"
                              onClick={() => handleProceedToBook(cat.slug)}
                              className="w-full inline-flex items-center justify-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-4 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] transition-colors"
                            >
                              <span>Book {cat.name}</span>
                              <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </button>
                          ) : (
                            <div className="flex items-center justify-between bg-[#F2EFE9] px-4 py-3 text-xs text-[#171614]">
                              <span className="font-medium">
                                Booking form open below for {cat.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setBookingRoomSlug(null)}
                                className="underline text-[#5C574F] hover:text-[#171614]"
                              >
                                Close Form
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CONNECTED INLINE BOOKING & PAYMENT CONTINUATION */}
                    {isBookingThisRoom ? (
                      <div
                        ref={bookingSectionRef}
                        className="border border-[#0D0D0E] bg-white p-6 sm:p-8 space-y-6"
                      >
                        {/* Pinned Selected Room Confirmation Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E1D8] pb-5">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#8C6822] font-semibold">
                              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Selected Room Confirmed</span>
                            </div>
                            <h5 className="font-display text-2xl sm:text-3xl text-[#171614]">
                              Complete Your Reservation for {cat.name}
                            </h5>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-mono-tabular font-semibold text-[#171614]">
                              {formatNaira(
                                cat.nightly_rate_ngn * Math.max(1, calculateNights(checkInDate, checkOutDate))
                              )}{' '}
                              ({Math.max(1, calculateNights(checkInDate, checkOutDate))}{' '}
                              {Math.max(1, calculateNights(checkInDate, checkOutDate)) === 1
                                ? 'night'
                                : 'nights'}
                              )
                            </span>
                            <span className="bg-[#0D0D0E] text-[#FAF9F6] px-3 py-1.5 uppercase tracking-[0.14em]">
                              {cat.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setBookingRoomSlug(null)}
                              className="text-[#5C574F] underline hover:text-[#171614]"
                            >
                              Cancel Form
                            </button>
                          </div>
                        </div>

                        {isDevelopmentMode ? <DevModeNotice /> : null}

                        <form
                          onSubmit={(e) => handleBookingSubmit(e, cat)}
                          className="space-y-6"
                        >
                          {/* Stay Dates & Guest Count */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label
                                htmlFor={`inline-checkin-${cat.slug}`}
                                className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                              >
                                Arrival Date
                              </label>
                              <input
                                id={`inline-checkin-${cat.slug}`}
                                type="date"
                                min={initialToday}
                                required
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
                                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] font-mono-tabular focus:outline-none focus:border-[#0D0D0E]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`inline-checkout-${cat.slug}`}
                                className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                              >
                                Departure Date
                              </label>
                              <input
                                id={`inline-checkout-${cat.slug}`}
                                type="date"
                                min={checkInDate}
                                required
                                value={checkOutDate}
                                onChange={(e) => setCheckOutDate(e.target.value)}
                                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] font-mono-tabular focus:outline-none focus:border-[#0D0D0E]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`inline-adults-${cat.slug}`}
                                className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                              >
                                Adults
                              </label>
                              <select
                                id={`inline-adults-${cat.slug}`}
                                value={adults}
                                onChange={(e) => setAdults(Number(e.target.value))}
                                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
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
                                htmlFor={`inline-children-${cat.slug}`}
                                className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                              >
                                Children
                              </label>
                              <select
                                id={`inline-children-${cat.slug}`}
                                value={childrenCount}
                                onChange={(e) => setChildrenCount(Number(e.target.value))}
                                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                              >
                                {[0, 1, 2, 3, 4].map((n) => (
                                  <option key={n} value={n}>
                                    {n} {n === 1 ? 'Child' : 'Children'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Live Inventory Notice for Selected Room */}
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF9F6] border border-[#E6E1D8] px-4 py-3 text-xs">
                            <div className="flex items-center gap-2 text-[#171614]">
                              <Calendar className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
                              <span>
                                {checkingAvail
                                  ? `Checking ${cat.name} availability...`
                                  : availError
                                    ? availError
                                    : liveAvail?.isAvailable
                                      ? `${cat.name}: ${liveAvail.availableRoomsCount} of ${liveAvail.totalActiveRooms} rooms open for ${liveAvail.nights} ${liveAvail.nights === 1 ? 'night' : 'nights'}`
                                      : `${cat.name} is currently unavailable for these dates. Try different dates.`}
                              </span>
                            </div>
                            <span className="font-mono-tabular text-[#5C574F]">
                              {checkInDate} to {checkOutDate}
                            </span>
                          </div>

                          {/* Guest Information */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label
                                htmlFor={`inline-name-${cat.slug}`}
                                className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                              >
                                Guest Full Name
                              </label>
                              <input
                                id={`inline-name-${cat.slug}`}
                                type="text"
                                required
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`inline-email-${cat.slug}`}
                                className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                              >
                                Email Address
                              </label>
                              <input
                                id={`inline-email-${cat.slug}`}
                                type="email"
                                required
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`inline-phone-${cat.slug}`}
                                className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                              >
                                Telephone / WhatsApp
                              </label>
                              <input
                                id={`inline-phone-${cat.slug}`}
                                type="tel"
                                required
                                value={guestPhone}
                                onChange={(e) => setGuestPhone(e.target.value)}
                                className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor={`inline-notes-${cat.slug}`}
                              className="block text-[11px] uppercase tracking-[0.18em] text-[#8C6822] mb-1.5"
                            >
                              Arrival Notes (Optional)
                            </label>
                            <textarea
                              id={`inline-notes-${cat.slug}`}
                              rows={2}
                              value={specialRequests}
                              onChange={(e) => setSpecialRequests(e.target.value)}
                              className="w-full p-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                            />
                          </div>

                          {/* Payment Method — Online Paystack or Bank Transfer Only */}
                          <div className="space-y-4 border-t border-[#EFEAE0] pt-5">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
                              Payment Option
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setPaymentMethod('online_paystack')}
                                className={`p-4 text-left border transition-colors ${
                                  paymentMethod === 'online_paystack'
                                    ? 'border-[#0D0D0E] bg-[#FAF9F6]'
                                    : 'border-[#E6E1D8] hover:border-[#8C6822]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-[#171614]">
                                    Online Card Payment (Paystack)
                                  </p>
                                  <CreditCard className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
                                </div>
                                <p className="mt-1 text-xs text-[#5C574F]">
                                  {onlinePaystackEnabled
                                    ? 'Redirects directly to Paystack Checkout and verifies server-side'
                                    : 'Requires server PAYSTACK_SECRET_KEY configuration'}
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPaymentMethod('bank_transfer')}
                                className={`p-4 text-left border transition-colors ${
                                  paymentMethod === 'bank_transfer'
                                    ? 'border-[#0D0D0E] bg-[#FAF9F6]'
                                    : 'border-[#E6E1D8] hover:border-[#8C6822]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-[#171614]">Bank Transfer</p>
                                  <Building2 className="w-4 h-4 text-[#8C6822]" aria-hidden="true" />
                                </div>
                                <p className="mt-1 text-xs text-[#5C574F]">
                                  {bankDetails.bankName} · {bankDetails.bankAccountNumber} ({bankDetails.bankAccountName})
                                </p>
                              </button>
                            </div>

                            {paymentMethod === 'bank_transfer' ? (
                              <div className="border border-[#E6E1D8] bg-[#FAF9F6] p-4 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <p className="uppercase tracking-[0.16em] text-[#8C6822]">
                                    Transfer Account Details
                                  </p>
                                  <p className="mt-1 font-medium text-[#171614]">{bankDetails.bankName}</p>
                                  <p className="font-mono-tabular text-sm font-semibold text-[#171614]">
                                    {bankDetails.bankAccountNumber}
                                  </p>
                                  <p className="text-[#4A453E]">{bankDetails.bankAccountName}</p>
                                </div>
                                <div>
                                  <p className="uppercase tracking-[0.16em] text-[#8C6822]">
                                    Payment Confirmation Notice
                                  </p>
                                  <p className="mt-1 font-mono-tabular font-semibold text-[#171614]">
                                    Amount:{' '}
                                    {formatNaira(
                                      cat.nightly_rate_ngn *
                                        Math.max(1, calculateNights(checkInDate, checkOutDate))
                                    )}
                                  </p>
                                  <p className="mt-1 text-[#5C574F]">
                                    Your reservation starts in <strong>Payment Pending Confirmation</strong> status until our team confirms transfer receipt.
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-start gap-2.5 text-xs text-[#5C574F]">
                            <ShieldCheck className="w-4 h-4 text-[#8C6822] shrink-0 mt-0.5" aria-hidden="true" />
                            <p>
                              Reserving <strong className="text-[#171614]">{cat.name}</strong> ({checkInDate} to {checkOutDate}). Advance stays may request cancellation up to {advanceDaysRequired} day before arrival. Same-day bookings may request cancellation within {sameDayWindowMinutes} minutes of creation.
                            </p>
                          </div>

                          {submitError ? (
                            <div
                              role="alert"
                              className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 space-y-2"
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
                            </div>
                          ) : null}

                          <button
                            type="submit"
                            disabled={submitting || Boolean(liveAvail && !liveAvail.isAvailable)}
                            className="w-full inline-flex items-center justify-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-7 py-4 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] disabled:opacity-50"
                          >
                            <span>
                              {submitting
                                ? paymentMethod === 'online_paystack'
                                  ? 'Redirecting to Paystack...'
                                  : `Recording ${cat.name} Booking...`
                                : paymentMethod === 'online_paystack'
                                  ? `Proceed to Paystack for ${cat.name}`
                                  : `Reserve ${cat.name} (Payment Pending Confirmation)`}
                            </span>
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}
