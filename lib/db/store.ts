import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { cache } from 'react';
import {
  AnalyticsEvent,
  AuditLog,
  CancellationRecord,
  ChatConversation,
  ChatMessage,
  FacilityItem,
  Guest,
  HotelSettings,
  HousekeepingTask,
  MaintenanceIssue,
  MediaAsset,
  NotificationRecord,
  PaymentMethod,
  PaymentRecord,
  PhysicalRoom,
  RefundRecord,
  Reservation,
  RoleSlug,
  RoomCategory,
  StaffUser,
} from '@/lib/types';
import {
  buildMockOperationalState,
  INITIAL_FACILITIES,
  INITIAL_HOTEL_SETTINGS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_PHYSICAL_ROOMS,
  INITIAL_ROOM_CATEGORIES,
} from '@/lib/db/seed-data';
import {
  calculateNights,
  computeCancellationDeadline,
  datesOverlap,
} from '@/lib/timezone';
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getRoleLabel } from '@/lib/auth/permissions';

interface RuntimeDatabase {
  room_categories: RoomCategory[];
  physical_rooms: PhysicalRoom[];
  guests: Guest[];
  reservations: Reservation[];
  payments: PaymentRecord[];
  cancellations: CancellationRecord[];
  refunds: RefundRecord[];
  housekeeping_tasks: HousekeepingTask[];
  maintenance_issues: MaintenanceIssue[];
  media_assets: MediaAsset[];
  notifications: NotificationRecord[];
  audit_logs: AuditLog[];
  staff_users: StaffUser[];
  chat_conversations: ChatConversation[];
  chat_messages: ChatMessage[];
  settings: HotelSettings;
  analytics_events: AnalyticsEvent[];
}

const RUNTIME_FILE_PATH = path.join('/tmp', 'charlees-hotel-runtime-v3.json');

declare global {
  var __charleesRuntimeDb: RuntimeDatabase | undefined;
}

// Async mutex to serialize writes & prevent double-booking race conditions
let writeQueue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.catch(() => undefined);
  return next;
}

function createInitialState(): RuntimeDatabase {
  const operational = buildMockOperationalState();
  return {
    room_categories: structuredClone(INITIAL_ROOM_CATEGORIES),
    physical_rooms: structuredClone(INITIAL_PHYSICAL_ROOMS),
    guests: operational.guests,
    reservations: operational.reservations,
    payments: operational.payments,
    cancellations: operational.cancellations,
    refunds: operational.refunds,
    housekeeping_tasks: operational.housekeeping_tasks,
    maintenance_issues: operational.maintenance_issues,
    media_assets: structuredClone(INITIAL_MEDIA_ASSETS),
    notifications: operational.notifications,
    audit_logs: operational.audit_logs,
    staff_users: operational.staff_users,
    chat_conversations: operational.chat_conversations,
    chat_messages: operational.chat_messages,
    settings: structuredClone(INITIAL_HOTEL_SETTINGS),
    analytics_events: [],
  };
}

function normalizeRuntimeDb(parsed: RuntimeDatabase): { db: RuntimeDatabase; dirty: boolean } {
  let dirty = false;

  const hasLegacyAbraka = parsed.media_assets?.some(
    (m) => m.id === 'prop-abraka-01' || m.public_url === '/media/property/abraka.jpg'
  );
  if (hasLegacyAbraka) {
    const nonAbraka = parsed.media_assets.filter((m) => m.section_key !== 'abraka');
    const freshAbraka = INITIAL_MEDIA_ASSETS.filter((m) => m.section_key === 'abraka');
    parsed.media_assets = [...nonAbraka, ...freshAbraka];
    dirty = true;
  }

  const hasLegacyPool = parsed.media_assets?.some(
    (m) => m.id === 'prop-pool-01' || m.public_url === '/media/property/pool.jpg'
  );
  if (hasLegacyPool) {
    const nonPool = parsed.media_assets.filter((m) => m.section_key !== 'pool');
    const freshPool = INITIAL_MEDIA_ASSETS.filter((m) => m.section_key === 'pool');
    parsed.media_assets = [...nonPool, ...freshPool];
    dirty = true;
  }

  const hasLegacyRooftop = parsed.media_assets?.some(
    (m) => m.id === 'prop-rooftop-01' || m.public_url === '/media/property/rooftop.jpg'
  );
  if (hasLegacyRooftop) {
    const nonRooftop = parsed.media_assets.filter((m) => m.section_key !== 'rooftop');
    const freshRooftop = INITIAL_MEDIA_ASSETS.filter((m) => m.section_key === 'rooftop');
    parsed.media_assets = [...nonRooftop, ...freshRooftop];
    dirty = true;
  }

  if (
    parsed.settings?.hotel_profile?.bankAccountNumber?.includes('0000000000') ||
    parsed.settings?.hotel_profile?.bankName?.includes('Pending')
  ) {
    parsed.settings.hotel_profile.bankName = 'GT Bank';
    parsed.settings.hotel_profile.bankAccountName = 'Charlees Hotel & Suites';
    parsed.settings.hotel_profile.bankAccountNumber = '0222817122';
    dirty = true;
  }

  if (parsed.cancellations) {
    for (const c of parsed.cancellations) {
      if (!c.status) {
        c.status = 'approved';
        dirty = true;
      }
    }
  }

  if (!Array.isArray(parsed.chat_conversations) || !Array.isArray(parsed.chat_messages)) {
    const operational = buildMockOperationalState();
    parsed.chat_conversations = operational.chat_conversations;
    parsed.chat_messages = operational.chat_messages;
    dirty = true;
  }

  return { db: parsed, dirty };
}

async function readRuntimeDb(): Promise<RuntimeDatabase> {
  if (globalThis.__charleesRuntimeDb) {
    return globalThis.__charleesRuntimeDb;
  }
  try {
    const raw = await fs.readFile(RUNTIME_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as RuntimeDatabase;
    const { db, dirty } = normalizeRuntimeDb(parsed);
    globalThis.__charleesRuntimeDb = db;
    if (dirty) {
      await fs.writeFile(RUNTIME_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
    }
    return db;
  } catch {
    const initial = createInitialState();
    globalThis.__charleesRuntimeDb = initial;
    await fs.writeFile(RUNTIME_FILE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

async function writeRuntimeDb(db: RuntimeDatabase): Promise<void> {
  globalThis.__charleesRuntimeDb = db;
  await fs.writeFile(RUNTIME_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export function getStorageMode(): 'supabase_live' | 'preview_runtime' {
  return isSupabaseConfigured() ? 'supabase_live' : 'preview_runtime';
}

// ============================================================================
// PUBLIC & SHARED READ QUERIES
// ============================================================================
export const getRoomCategories = cache(async (): Promise<RoomCategory[]> => {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb
      .from('room_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) {
      return data as RoomCategory[];
    }
  }
  const db = await readRuntimeDb();
  return db.room_categories
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
});

export async function getAllRoomCategoriesAdmin(): Promise<RoomCategory[]> {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb
      .from('room_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) return data as RoomCategory[];
  }
  const db = await readRuntimeDb();
  return db.room_categories.sort((a, b) => a.sort_order - b.sort_order);
}

export async function getRoomCategoryBySlug(slug: string): Promise<RoomCategory | null> {
  const categories = await getRoomCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getPhysicalRooms(): Promise<PhysicalRoom[]> {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb
      .from('physical_rooms')
      .select('*')
      .order('room_number', { ascending: true });
    if (!error && data) return data as PhysicalRoom[];
  }
  const db = await readRuntimeDb();
  return [...db.physical_rooms].sort((a, b) => a.room_number.localeCompare(b.room_number));
}

export const getHotelSettings = cache(async (): Promise<HotelSettings> => {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb.from('hotel_settings').select('key, value');
    if (!error && data && data.length > 0) {
      const merged = structuredClone(INITIAL_HOTEL_SETTINGS);
      for (const row of data) {
        if (row.key === 'hotel_profile') {
          merged.hotel_profile = { ...merged.hotel_profile, ...(row.value as object) };
        } else if (row.key === 'cancellation_policy') {
          merged.cancellation_policy = { ...merged.cancellation_policy, ...(row.value as object) };
        } else if (row.key === 'analytics') {
          merged.analytics = { ...merged.analytics, ...(row.value as object) };
        }
      }
      return merged;
    }
  }
  const db = await readRuntimeDb();
  return db.settings;
});

export const getMediaAssets = cache(async (onlyPublished = true): Promise<MediaAsset[]> => {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    let query = sb.from('media_assets').select('*').order('sort_order', { ascending: true });
    if (onlyPublished) query = query.eq('is_published', true);
    const { data, error } = await query;
    if (!error && data) return data as MediaAsset[];
  }
  const db = await readRuntimeDb();
  return db.media_assets
    .filter((m) => (onlyPublished ? m.is_published : true))
    .sort((a, b) => a.sort_order - b.sort_order);
});

// ============================================================================
// SERVER-SIDE AVAILABILITY ENGINE (PHYSICAL ROOM INVENTORY + MAINTENANCE BLOCKS)
// ============================================================================
export interface CategoryAvailability {
  category: RoomCategory;
  totalActiveRooms: number;
  availableRoomsCount: number;
  isAvailable: boolean;
  nights: number;
  estimatedTotalNgn: number;
}

export async function checkAvailability(
  checkInDate: string,
  checkOutDate: string
): Promise<CategoryAvailability[]> {
  const nights = calculateNights(checkInDate, checkOutDate);
  if (nights <= 0) {
    throw new Error('Check out date must be after check in date.');
  }

  const categories = await getRoomCategories();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const [roomsRes, resRes, maintRes] = await Promise.all([
      sb.from('physical_rooms').select('*').eq('is_active', true),
      sb
        .from('reservations')
        .select('physical_room_id, category_id, check_in_date, check_out_date, status')
        .in('status', ['pending_payment', 'confirmed', 'checked_in', 'cancellation_requested']),
      sb
        .from('maintenance_issues')
        .select('physical_room_id, blocks_room, status')
        .eq('blocks_room', true)
        .neq('status', 'resolved'),
    ]);

    const rooms = (roomsRes.data || []) as PhysicalRoom[];
    const activeReservations = (resRes.data || []) as Pick<
      Reservation,
      'physical_room_id' | 'category_id' | 'check_in_date' | 'check_out_date' | 'status'
    >[];
    const blockingIssues = new Set(
      (maintRes.data || []).map((m: { physical_room_id: string | null }) => m.physical_room_id)
    );

    return categories.map((category) => {
      const catRooms = rooms.filter((r) => r.category_id === category.id);
      const freeRooms = catRooms.filter((room) => {
        if (room.operational_status === 'maintenance' || room.operational_status === 'blocked') {
          return false;
        }
        if (blockingIssues.has(room.id)) {
          return false;
        }
        const hasConflict = activeReservations.some(
          (res) =>
            res.physical_room_id === room.id &&
            datesOverlap(res.check_in_date, res.check_out_date, checkInDate, checkOutDate)
        );
        return !hasConflict;
      });

      return {
        category,
        totalActiveRooms: catRooms.length,
        availableRoomsCount: freeRooms.length,
        isAvailable: freeRooms.length > 0,
        nights,
        estimatedTotalNgn: category.nightly_rate_ngn * nights,
      };
    });
  }

  const db = await readRuntimeDb();
  const blockingIssues = new Set(
    db.maintenance_issues
      .filter((m) => m.blocks_room && m.status !== 'resolved')
      .map((m) => m.physical_room_id)
  );

  return categories.map((category) => {
    const catRooms = db.physical_rooms.filter(
      (r) => r.category_id === category.id && r.is_active
    );
    const freeRooms = catRooms.filter((room) => {
      if (room.operational_status === 'maintenance' || room.operational_status === 'blocked') {
        return false;
      }
      if (blockingIssues.has(room.id)) return false;
      const hasConflict = db.reservations.some(
        (res) =>
          res.physical_room_id === room.id &&
          ['pending_payment', 'confirmed', 'checked_in', 'cancellation_requested'].includes(res.status) &&
          datesOverlap(res.check_in_date, res.check_out_date, checkInDate, checkOutDate)
      );
      return !hasConflict;
    });

    return {
      category,
      totalActiveRooms: catRooms.length,
      availableRoomsCount: freeRooms.length,
      isAvailable: freeRooms.length > 0,
      nights,
      estimatedTotalNgn: category.nightly_rate_ngn * nights,
    };
  });
}

// ============================================================================
// ATOMIC RESERVATION CREATION
// ============================================================================
export interface CreateBookingInput {
  categorySlug: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string;
  paymentMethod: PaymentMethod;
  bookingSource?: 'website' | 'front_desk' | 'phone';
  staffActor?: { userId: string; email: string; role: RoleSlug };
}

function generateBookingReference(): string {
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `CH-${datePart}-${token}`;
}

export async function createReservation(input: CreateBookingInput): Promise<{
  reservation: Reservation;
  payment: PaymentRecord;
  guest: Guest;
  category: RoomCategory;
  assignedRoomNumber: string;
}> {
  const nights = calculateNights(input.checkInDate, input.checkOutDate);
  if (nights <= 0 || nights > 90) {
    throw new Error('Stay length must be between 1 and 90 nights.');
  }

  const settings = await getHotelSettings();
  const now = new Date();
  const { deadlineIso, isSameDayBooking } = computeCancellationDeadline({
    checkInDate: input.checkInDate,
    createdAt: now,
    advanceDaysRequired: settings.cancellation_policy.advanceDaysRequired,
    sameDayWindowMinutes: settings.cancellation_policy.sameDayWindowMinutes,
  });

  const bookingReference = generateBookingReference();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: catData, error: catErr } = await sb
      .from('room_categories')
      .select('*')
      .eq('slug', input.categorySlug)
      .eq('is_active', true)
      .single();

    if (catErr || !catData) {
      throw new Error('Selected room category was not found.');
    }

    const { data: rpcRows, error: rpcErr } = await sb.rpc('create_reservation_atomic', {
      p_booking_reference: bookingReference,
      p_category_id: catData.id,
      p_guest_name: input.guestName,
      p_guest_email: input.guestEmail.toLowerCase(),
      p_guest_phone: input.guestPhone,
      p_check_in: input.checkInDate,
      p_check_out: input.checkOutDate,
      p_adults: input.adults,
      p_children: input.children,
      p_booking_source: input.bookingSource ?? 'website',
      p_special_requests: input.specialRequests ?? '',
      p_payment_method: input.paymentMethod,
      p_cancellation_deadline: deadlineIso,
      p_is_same_day: isSameDayBooking,
    });

    if (rpcErr || !rpcRows || rpcRows.length === 0) {
      throw new Error(rpcErr?.message || 'Unable to complete booking.');
    }

    const created = rpcRows[0];
    const [resQ, payQ] = await Promise.all([
      sb.from('reservations').select('*').eq('id', created.reservation_id).single(),
      sb.from('payments').select('*').eq('reservation_id', created.reservation_id).single(),
    ]);
    const reservation = resQ.data as Reservation;
    const guestQ = await sb
      .from('guests')
      .select('*')
      .eq('id', reservation.primary_guest_id)
      .single();

    await sb.from('notifications').insert({
      recipient_type: 'staff',
      channel: 'in_app',
      event_type: 'reservation_created',
      title: `New reservation ${bookingReference}`,
      message: `${input.guestName} booked ${catData.name} (Room ${created.assigned_room_number}) for ${input.checkInDate} to ${input.checkOutDate}.`,
      related_reservation_id: reservation.id,
      delivery_status: 'sent',
    });

    return {
      reservation,
      payment: payQ.data as PaymentRecord,
      guest: guestQ.data as Guest,
      category: catData as RoomCategory,
      assignedRoomNumber: created.assigned_room_number,
    };
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const category = db.room_categories.find(
      (c) => c.slug === input.categorySlug && c.is_active
    );
    if (!category) {
      throw new Error('Selected room category was not found.');
    }

    const blockingIssues = new Set(
      db.maintenance_issues
        .filter((m) => m.blocks_room && m.status !== 'resolved')
        .map((m) => m.physical_room_id)
    );

    const candidateRoom = db.physical_rooms
      .filter((r) => r.category_id === category.id && r.is_active)
      .sort((a, b) => a.room_number.localeCompare(b.room_number))
      .find((room) => {
        if (room.operational_status === 'maintenance' || room.operational_status === 'blocked') {
          return false;
        }
        if (blockingIssues.has(room.id)) return false;
        const conflict = db.reservations.some(
          (res) =>
            res.physical_room_id === room.id &&
            ['pending_payment', 'confirmed', 'checked_in', 'cancellation_requested'].includes(res.status) &&
            datesOverlap(res.check_in_date, res.check_out_date, input.checkInDate, input.checkOutDate)
        );
        return !conflict;
      });

    if (!candidateRoom) {
      throw new Error('No physical rooms are available in this category for the selected dates.');
    }

    const nowIso = now.toISOString();
    const guest: Guest = {
      id: crypto.randomUUID(),
      full_name: input.guestName,
      email: input.guestEmail.toLowerCase(),
      phone: input.guestPhone,
      created_at: nowIso,
    };
    db.guests.push(guest);

    const totalAmount = category.nightly_rate_ngn * nights;
    const reservation: Reservation = {
      id: crypto.randomUUID(),
      booking_reference: bookingReference,
      category_id: category.id,
      physical_room_id: candidateRoom.id,
      primary_guest_id: guest.id,
      check_in_date: input.checkInDate,
      check_out_date: input.checkOutDate,
      nights,
      adults: input.adults,
      children: input.children,
      nightly_rate_ngn: category.nightly_rate_ngn,
      total_amount_ngn: totalAmount,
      currency: 'NGN',
      status: 'pending_payment',
      payment_status:
        input.paymentMethod === 'bank_transfer' ? 'pending_verification' : 'unpaid',
      booking_source: input.bookingSource ?? 'website',
      special_requests: input.specialRequests ?? '',
      cancellation_deadline_at: deadlineIso,
      is_same_day_booking: isSameDayBooking,
      created_at: nowIso,
      updated_at: nowIso,
    };
    db.reservations.push(reservation);

    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      reservation_id: reservation.id,
      amount_ngn: totalAmount,
      method: input.paymentMethod,
      status: input.paymentMethod === 'bank_transfer' ? 'pending_verification' : 'pending',
      provider_reference: null,
      bank_transfer_sender: null,
      bank_transfer_reference: null,
      verified_by_staff_id: null,
      verified_at: null,
      notes:
        input.paymentMethod === 'bank_transfer'
          ? 'Awaiting bank transfer to GT Bank (0222817122) and staff confirmation.'
          : input.paymentMethod === 'pos'
            ? 'POS card payment recorded at reception.'
            : input.paymentMethod === 'cash'
              ? 'Desk payment recorded at reception.'
              : 'Paystack online payment initiated; awaiting verification.',
      created_at: nowIso,
      updated_at: nowIso,
    };
    db.payments.push(payment);

    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipient_type: 'staff',
      recipient_email: null,
      channel: 'in_app',
      event_type: 'reservation_created',
      title: `New reservation ${bookingReference}`,
      message: `${guest.full_name} booked ${category.name} (Room ${candidateRoom.room_number}) from ${input.checkInDate} to ${input.checkOutDate}.`,
      related_reservation_id: reservation.id,
      is_read: false,
      delivery_status: 'sent',
      created_at: nowIso,
    });

    if (input.staffActor) {
      db.audit_logs.unshift({
        id: crypto.randomUUID(),
        actor_user_id: input.staffActor.userId,
        actor_email: input.staffActor.email,
        actor_role: input.staffActor.role,
        action: 'reservation.created_by_staff',
        entity_type: 'reservation',
        entity_id: reservation.id,
        details: {
          booking_reference: bookingReference,
          room_number: candidateRoom.room_number,
          total_amount_ngn: totalAmount,
        },
        created_at: nowIso,
      });
    }

    await writeRuntimeDb(db);

    return {
      reservation,
      payment,
      guest,
      category,
      assignedRoomNumber: candidateRoom.room_number,
    };
  });
}

// ============================================================================
// RESERVATION LOOKUP & ENRICHMENT
// ============================================================================
export interface EnrichedReservation {
  reservation: Reservation;
  guest: Guest | null;
  category: RoomCategory | null;
  physicalRoom: PhysicalRoom | null;
  payments: PaymentRecord[];
  cancellation: CancellationRecord | null;
  refunds: RefundRecord[];
}

export async function lookupReservationByReference(
  bookingReference: string,
  guestEmail?: string
): Promise<EnrichedReservation | null> {
  const ref = bookingReference.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: res, error } = await sb
      .from('reservations')
      .select('*')
      .eq('booking_reference', ref)
      .single();
    if (error || !res) return null;

    const reservation = res as Reservation;
    const [guestQ, catQ, roomQ, payQ, cancelQ, refQ] = await Promise.all([
      sb.from('guests').select('*').eq('id', reservation.primary_guest_id).single(),
      sb.from('room_categories').select('*').eq('id', reservation.category_id).single(),
      reservation.physical_room_id
        ? sb.from('physical_rooms').select('*').eq('id', reservation.physical_room_id).single()
        : Promise.resolve({ data: null }),
      sb.from('payments').select('*').eq('reservation_id', reservation.id),
      sb.from('cancellations').select('*').eq('reservation_id', reservation.id).maybeSingle(),
      sb.from('refunds').select('*').eq('reservation_id', reservation.id),
    ]);

    const guest = (guestQ.data as Guest) || null;
    if (guestEmail && guest && guest.email.toLowerCase() !== guestEmail.trim().toLowerCase()) {
      return null;
    }

    return {
      reservation,
      guest,
      category: (catQ.data as RoomCategory) || null,
      physicalRoom: (roomQ.data as PhysicalRoom) || null,
      payments: (payQ.data as PaymentRecord[]) || [],
      cancellation: (cancelQ.data as CancellationRecord) || null,
      refunds: (refQ.data as RefundRecord[]) || [],
    };
  }

  const db = await readRuntimeDb();
  const reservation = db.reservations.find((r) => r.booking_reference.toUpperCase() === ref);
  if (!reservation) return null;

  const guest = db.guests.find((g) => g.id === reservation.primary_guest_id) ?? null;
  if (guestEmail && guest && guest.email.toLowerCase() !== guestEmail.trim().toLowerCase()) {
    return null;
  }

  return {
    reservation,
    guest,
    category: db.room_categories.find((c) => c.id === reservation.category_id) ?? null,
    physicalRoom:
      db.physical_rooms.find((pr) => pr.id === reservation.physical_room_id) ?? null,
    payments: db.payments.filter((p) => p.reservation_id === reservation.id),
    cancellation:
      db.cancellations.find((c) => c.reservation_id === reservation.id) ?? null,
    refunds: db.refunds.filter((rf) => rf.reservation_id === reservation.id),
  };
}

// ============================================================================
// SERVER-VALIDATED CANCELLATION REQUEST, APPROVAL & REFUND ENGINE
// ============================================================================
export const EXPIRED_CANCELLATION_MESSAGE =
  'The cancellation window for this reservation has expired. Please contact the hotel for assistance.';

export async function requestReservationCancellation(params: {
  bookingReference: string;
  guestEmail: string;
  reason: string;
}): Promise<{
  reservation: Reservation;
  cancellation: CancellationRecord;
}> {
  const now = new Date();
  const nowIso = now.toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const found = await lookupReservationByReference(params.bookingReference, params.guestEmail);
    if (!found) {
      throw new Error('Reservation reference and email address do not match.');
    }
    const { reservation, cancellation: existingCancel } = found;

    if (reservation.status === 'cancellation_requested' || existingCancel?.status === 'requested') {
      throw new Error('A cancellation request has already been submitted for this reservation and is awaiting staff review.');
    }
    if (reservation.status === 'cancelled') {
      throw new Error('This reservation has already been cancelled.');
    }
    if (['checked_in', 'checked_out', 'no_show'].includes(reservation.status)) {
      throw new Error(EXPIRED_CANCELLATION_MESSAGE);
    }

    const deadline = new Date(reservation.cancellation_deadline_at);
    if (now.getTime() > deadline.getTime()) {
      throw new Error(EXPIRED_CANCELLATION_MESSAGE);
    }

    const { data: cancelData, error: cancelErr } = await sb
      .from('cancellations')
      .insert({
        reservation_id: reservation.id,
        cancelled_by_type: 'guest',
        reason: params.reason,
        was_within_policy: true,
        is_exception_override: false,
        policy_deadline_at: reservation.cancellation_deadline_at,
        cancelled_at: nowIso,
        status: 'requested',
        previous_status: reservation.status,
      })
      .select('*')
      .single();

    if (cancelErr || !cancelData) {
      throw new Error(cancelErr?.message || 'Could not submit cancellation request.');
    }

    const { data: updatedRes } = await sb
      .from('reservations')
      .update({ status: 'cancellation_requested', updated_at: nowIso })
      .eq('id', reservation.id)
      .select('*')
      .single();

    await sb.from('notifications').insert({
      recipient_type: 'staff',
      channel: 'in_app',
      event_type: 'cancellation_requested',
      title: `Cancellation Request: ${reservation.booking_reference}`,
      message: `Guest requested cancellation for ${reservation.booking_reference}. Reason: ${params.reason}`,
      related_reservation_id: reservation.id,
      delivery_status: 'sent',
    });

    await sb.from('audit_logs').insert({
      actor_user_id: null,
      actor_email: params.guestEmail.toLowerCase(),
      actor_role: 'guest',
      action: 'reservation.cancellation_requested',
      entity_type: 'reservation',
      entity_id: reservation.id,
      details: { booking_reference: reservation.booking_reference, reason: params.reason },
    });

    return {
      reservation: updatedRes as Reservation,
      cancellation: cancelData as CancellationRecord,
    };
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const ref = params.bookingReference.trim().toUpperCase();
    const reservation = db.reservations.find((r) => r.booking_reference.toUpperCase() === ref);
    if (!reservation) {
      throw new Error('Reservation reference and email address do not match.');
    }

    const guest = db.guests.find((g) => g.id === reservation.primary_guest_id);
    if (!guest || guest.email.toLowerCase() !== params.guestEmail.trim().toLowerCase()) {
      throw new Error('Reservation reference and email address do not match.');
    }

    const existingReq = db.cancellations.find((c) => c.reservation_id === reservation.id);
    if (reservation.status === 'cancellation_requested' || existingReq?.status === 'requested') {
      throw new Error('A cancellation request has already been submitted for this reservation and is awaiting staff review.');
    }
    if (reservation.status === 'cancelled') {
      throw new Error('This reservation has already been cancelled.');
    }
    if (['checked_in', 'checked_out', 'no_show'].includes(reservation.status)) {
      throw new Error(EXPIRED_CANCELLATION_MESSAGE);
    }

    const deadline = new Date(reservation.cancellation_deadline_at);
    if (now.getTime() > deadline.getTime()) {
      throw new Error(EXPIRED_CANCELLATION_MESSAGE);
    }

    const previousStatus = reservation.status;
    const cancellation: CancellationRecord = {
      id: crypto.randomUUID(),
      reservation_id: reservation.id,
      cancelled_by_type: 'guest',
      cancelled_by_staff_id: null,
      reason: params.reason,
      was_within_policy: true,
      is_exception_override: false,
      policy_deadline_at: reservation.cancellation_deadline_at,
      cancelled_at: nowIso,
      status: 'requested',
      decision_reason: null,
      reviewed_by_staff_id: null,
      reviewed_at: null,
      previous_status: previousStatus,
    };

    if (existingReq) {
      const idx = db.cancellations.indexOf(existingReq);
      db.cancellations[idx] = cancellation;
    } else {
      db.cancellations.unshift(cancellation);
    }

    reservation.status = 'cancellation_requested';
    reservation.updated_at = nowIso;

    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipient_type: 'staff',
      recipient_email: null,
      channel: 'in_app',
      event_type: 'cancellation_requested',
      title: `Cancellation Request: ${reservation.booking_reference}`,
      message: `${guest.full_name} requested cancellation for ${reservation.booking_reference}. Reason: ${params.reason}`,
      related_reservation_id: reservation.id,
      is_read: false,
      delivery_status: 'sent',
      created_at: nowIso,
    });

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: null,
      actor_email: guest.email,
      actor_role: 'guest',
      action: 'reservation.cancellation_requested',
      entity_type: 'reservation',
      entity_id: reservation.id,
      details: {
        booking_reference: reservation.booking_reference,
        reason: params.reason,
        previous_status: previousStatus,
      },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return { reservation, cancellation };
  });
}

export async function reviewCancellationRequestAdmin(params: {
  cancellationId: string;
  decision: 'approve' | 'reject';
  decisionReason?: string;
  actor: { userId: string; staffId: string; email: string; role: RoleSlug };
}): Promise<{
  reservation: Reservation;
  cancellation: CancellationRecord;
  refund: RefundRecord | null;
}> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: cancelRow } = await sb
      .from('cancellations')
      .select('*')
      .eq('id', params.cancellationId)
      .single();
    if (!cancelRow) throw new Error('Cancellation request not found.');
    const cancellation = cancelRow as CancellationRecord;

    const { data: resRow } = await sb
      .from('reservations')
      .select('*')
      .eq('id', cancellation.reservation_id)
      .single();
    if (!resRow) throw new Error('Reservation not found.');
    const reservation = resRow as Reservation;

    if (cancellation.status !== 'requested') {
      throw new Error(`Cancellation request has already been ${cancellation.status}.`);
    }

    if (params.decision === 'approve') {
      await sb
        .from('cancellations')
        .update({
          status: 'approved',
          decision_reason: params.decisionReason || 'Approved by hotel management.',
          reviewed_by_staff_id: params.actor.staffId,
          reviewed_at: nowIso,
        })
        .eq('id', cancellation.id);

      const { data: updatedRes } = await sb
        .from('reservations')
        .update({ status: 'cancelled', updated_at: nowIso })
        .eq('id', reservation.id)
        .select('*')
        .single();

      if (reservation.physical_room_id) {
        await sb
          .from('physical_rooms')
          .update({ operational_status: 'available', updated_at: nowIso })
          .eq('id', reservation.physical_room_id)
          .eq('operational_status', 'occupied');
      }

      const { data: paymentsData } = await sb
        .from('payments')
        .select('*')
        .eq('reservation_id', reservation.id);
      const confirmedPayment = ((paymentsData as PaymentRecord[]) || []).find(
        (p) => p.status === 'confirmed'
      );

      let createdRefund: RefundRecord | null = null;
      if (confirmedPayment) {
        const settings = await getHotelSettings();
        const refundPct = settings.cancellation_policy.refundPercentageOnEligible;
        const refundAmount = Math.round((confirmedPayment.amount_ngn * refundPct) / 100);
        const { data: refData } = await sb
          .from('refunds')
          .upsert(
            {
              reservation_id: reservation.id,
              cancellation_id: cancellation.id,
              payment_id: confirmedPayment.id,
              idempotency_key: `refund-${reservation.id}-${confirmedPayment.id}`,
              eligible: true,
              amount_ngn: refundAmount,
              original_payment_reference:
                confirmedPayment.provider_reference || confirmedPayment.bank_transfer_reference,
              request_status: 'requested',
              notes:
                params.decisionReason ||
                `Approved cancellation refund (${confirmedPayment.method === 'online_paystack' ? 'Paystack' : 'Bank Transfer'}).`,
            },
            { onConflict: 'idempotency_key' }
          )
          .select('*')
          .single();
        createdRefund = (refData as RefundRecord) || null;
      }

      await sb.from('audit_logs').insert({
        actor_user_id: params.actor.userId,
        actor_email: params.actor.email,
        actor_role: params.actor.role,
        action: 'cancellation_request.approved',
        entity_type: 'cancellation',
        entity_id: cancellation.id,
        details: {
          booking_reference: reservation.booking_reference,
          decision_reason: params.decisionReason || null,
        },
      });

      return {
        reservation: updatedRes as Reservation,
        cancellation: { ...cancellation, status: 'approved', reviewed_at: nowIso },
        refund: createdRefund,
      };
    }

    const restoredStatus: Reservation['status'] =
      cancellation.previous_status && cancellation.previous_status !== 'cancellation_requested'
        ? cancellation.previous_status
        : reservation.payment_status === 'paid'
          ? 'confirmed'
          : 'pending_payment';

    await sb
      .from('cancellations')
      .update({
        status: 'rejected',
        decision_reason: params.decisionReason || 'Declined by hotel management.',
        reviewed_by_staff_id: params.actor.staffId,
        reviewed_at: nowIso,
      })
      .eq('id', cancellation.id);

    const { data: updatedRes } = await sb
      .from('reservations')
      .update({ status: restoredStatus, updated_at: nowIso })
      .eq('id', reservation.id)
      .select('*')
      .single();

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'cancellation_request.rejected',
      entity_type: 'cancellation',
      entity_id: cancellation.id,
      details: {
        booking_reference: reservation.booking_reference,
        restored_status: restoredStatus,
        decision_reason: params.decisionReason || null,
      },
    });

    return {
      reservation: updatedRes as Reservation,
      cancellation: { ...cancellation, status: 'rejected', reviewed_at: nowIso },
      refund: null,
    };
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const cancellation = db.cancellations.find((c) => c.id === params.cancellationId);
    if (!cancellation) throw new Error('Cancellation request not found.');
    if (cancellation.status !== 'requested') {
      throw new Error(`Cancellation request has already been ${cancellation.status}.`);
    }

    const reservation = db.reservations.find((r) => r.id === cancellation.reservation_id);
    if (!reservation) throw new Error('Reservation not found.');

    const guest = db.guests.find((g) => g.id === reservation.primary_guest_id);

    if (params.decision === 'approve') {
      cancellation.status = 'approved';
      cancellation.decision_reason = params.decisionReason?.trim() || 'Approved by hotel management.';
      cancellation.reviewed_by_staff_id = params.actor.staffId;
      cancellation.reviewed_at = nowIso;

      reservation.status = 'cancelled';
      reservation.updated_at = nowIso;

      if (reservation.physical_room_id) {
        const room = db.physical_rooms.find((pr) => pr.id === reservation.physical_room_id);
        if (room && room.operational_status === 'occupied') {
          room.operational_status = 'available';
          room.updated_at = nowIso;
        }
      }

      let createdRefund: RefundRecord | null = null;
      const confirmedPayment = db.payments.find(
        (p) => p.reservation_id === reservation.id && p.status === 'confirmed'
      );
      if (confirmedPayment) {
        const existingRefund = db.refunds.find(
          (rf) => rf.idempotency_key === `refund-${reservation.id}-${confirmedPayment.id}`
        );
        if (existingRefund) {
          createdRefund = existingRefund;
        } else {
          const refundPct = db.settings.cancellation_policy.refundPercentageOnEligible;
          const refundAmount = Math.round((confirmedPayment.amount_ngn * refundPct) / 100);
          const refund: RefundRecord = {
            id: crypto.randomUUID(),
            reservation_id: reservation.id,
            cancellation_id: cancellation.id,
            payment_id: confirmedPayment.id,
            idempotency_key: `refund-${reservation.id}-${confirmedPayment.id}`,
            eligible: true,
            amount_ngn: refundAmount,
            original_payment_reference:
              confirmedPayment.provider_reference || confirmedPayment.bank_transfer_reference,
            request_status: 'requested',
            provider_refund_reference: null,
            failure_reason: null,
            approved_by_staff_id: null,
            processed_by_staff_id: null,
            requested_at: nowIso,
            completed_at: null,
            notes: `Approved cancellation refund (${
              confirmedPayment.method === 'online_paystack' ? 'Paystack' : 'Bank Transfer'
            }). ${cancellation.decision_reason}`,
          };
          db.refunds.unshift(refund);
          createdRefund = refund;
        }
      }

      db.notifications.unshift({
        id: crypto.randomUUID(),
        recipient_type: 'guest',
        recipient_email: guest?.email ?? null,
        channel: 'in_app',
        event_type: 'cancellation_approved',
        title: `Cancellation Approved: ${reservation.booking_reference}`,
        message: `Your cancellation request for ${reservation.booking_reference} has been approved.${
          createdRefund ? ' A refund request has been queued for processing.' : ''
        }`,
        related_reservation_id: reservation.id,
        is_read: false,
        delivery_status: 'sent',
        created_at: nowIso,
      });

      db.audit_logs.unshift({
        id: crypto.randomUUID(),
        actor_user_id: params.actor.userId,
        actor_email: params.actor.email,
        actor_role: params.actor.role,
        action: 'cancellation_request.approved',
        entity_type: 'cancellation',
        entity_id: cancellation.id,
        details: {
          booking_reference: reservation.booking_reference,
          decision_reason: cancellation.decision_reason,
          refund_created: Boolean(createdRefund),
        },
        created_at: nowIso,
      });

      await writeRuntimeDb(db);
      return { reservation, cancellation, refund: createdRefund };
    }

    const restoredStatus: Reservation['status'] =
      cancellation.previous_status && cancellation.previous_status !== 'cancellation_requested'
        ? cancellation.previous_status
        : reservation.payment_status === 'paid'
          ? 'confirmed'
          : 'pending_payment';

    cancellation.status = 'rejected';
    cancellation.decision_reason = params.decisionReason?.trim() || 'Declined by hotel management.';
    cancellation.reviewed_by_staff_id = params.actor.staffId;
    cancellation.reviewed_at = nowIso;

    reservation.status = restoredStatus;
    reservation.updated_at = nowIso;

    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipient_type: 'guest',
      recipient_email: guest?.email ?? null,
      channel: 'in_app',
      event_type: 'cancellation_rejected',
      title: `Cancellation Request Declined: ${reservation.booking_reference}`,
      message: `Your cancellation request for ${reservation.booking_reference} was declined (${cancellation.decision_reason}). Your reservation remains active.`,
      related_reservation_id: reservation.id,
      is_read: false,
      delivery_status: 'sent',
      created_at: nowIso,
    });

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'cancellation_request.rejected',
      entity_type: 'cancellation',
      entity_id: cancellation.id,
      details: {
        booking_reference: reservation.booking_reference,
        restored_status: restoredStatus,
        decision_reason: cancellation.decision_reason,
      },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return { reservation, cancellation, refund: null };
  });
}

export async function cancelReservation(params: {
  bookingReference: string;
  guestEmail?: string;
  reason: string;
  cancelledByType: 'guest' | 'staff';
  staffActor?: { userId: string; staffId: string; email: string; role: RoleSlug };
  overrideException?: boolean;
}): Promise<{
  reservation: Reservation;
  cancellation: CancellationRecord;
  refund: RefundRecord | null;
}> {
  if (params.cancelledByType === 'guest') {
    const reqResult = await requestReservationCancellation({
      bookingReference: params.bookingReference,
      guestEmail: params.guestEmail || '',
      reason: params.reason,
    });
    return { ...reqResult, refund: null };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const settings = await getHotelSettings();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const found = await lookupReservationByReference(params.bookingReference);
    if (!found) {
      throw new Error('Reservation not found.');
    }
    const { reservation, payments } = found;
    if (['cancelled', 'checked_out', 'checked_in'].includes(reservation.status)) {
      throw new Error(`Reservation cannot be cancelled while status is ${reservation.status}.`);
    }

    const deadline = new Date(reservation.cancellation_deadline_at);
    const withinPolicy = now.getTime() <= deadline.getTime();

    if (!withinPolicy) {
      const canOverride =
        params.overrideException &&
        settings.cancellation_policy.allowManagerExceptionOverride;
      if (!canOverride) {
        throw new Error(EXPIRED_CANCELLATION_MESSAGE);
      }
    }

    const { data: cancelData, error: cancelErr } = await sb
      .from('cancellations')
      .insert({
        reservation_id: reservation.id,
        cancelled_by_type: 'staff',
        cancelled_by_staff_id: params.staffActor?.staffId ?? null,
        reason: params.reason,
        was_within_policy: withinPolicy,
        is_exception_override: !withinPolicy && Boolean(params.overrideException),
        policy_deadline_at: reservation.cancellation_deadline_at,
        cancelled_at: nowIso,
        status: 'approved',
        reviewed_by_staff_id: params.staffActor?.staffId ?? null,
        reviewed_at: nowIso,
        decision_reason: params.reason,
        previous_status: reservation.status,
      })
      .select('*')
      .single();

    if (cancelErr || !cancelData) {
      throw new Error(cancelErr?.message || 'Could not record cancellation.');
    }

    const { data: updatedRes } = await sb
      .from('reservations')
      .update({ status: 'cancelled', updated_at: nowIso })
      .eq('id', reservation.id)
      .select('*')
      .single();

    if (reservation.physical_room_id) {
      await sb
        .from('physical_rooms')
        .update({ operational_status: 'available', updated_at: nowIso })
        .eq('id', reservation.physical_room_id)
        .eq('operational_status', 'occupied');
    }

    let createdRefund: RefundRecord | null = null;
    const confirmedPayment = payments.find((p) => p.status === 'confirmed');
    if (confirmedPayment) {
      const refundPct = settings.cancellation_policy.refundPercentageOnEligible;
      const eligible = withinPolicy || Boolean(params.overrideException);
      const refundAmount = eligible
        ? Math.round((confirmedPayment.amount_ngn * refundPct) / 100)
        : 0;
      const { data: refData } = await sb
        .from('refunds')
        .insert({
          reservation_id: reservation.id,
          cancellation_id: cancelData.id,
          payment_id: confirmedPayment.id,
          idempotency_key: `refund-${reservation.id}-${confirmedPayment.id}`,
          eligible,
          amount_ngn: refundAmount,
          original_payment_reference:
            confirmedPayment.provider_reference || confirmedPayment.bank_transfer_reference,
          request_status: eligible ? 'requested' : 'rejected',
          notes: eligible
            ? 'Created upon eligible cancellation. Requires management review and provider processing.'
            : 'Cancelled outside policy window.',
        })
        .select('*')
        .single();
      createdRefund = (refData as RefundRecord) || null;
    }

    await sb.from('audit_logs').insert({
      actor_user_id: params.staffActor?.userId ?? null,
      actor_email: params.staffActor?.email ?? 'staff',
      actor_role: params.staffActor?.role ?? 'manager',
      action: 'reservation.cancelled',
      entity_type: 'reservation',
      entity_id: reservation.id,
      details: {
        booking_reference: reservation.booking_reference,
        reason: params.reason,
        was_within_policy: withinPolicy,
        exception_override: !withinPolicy && Boolean(params.overrideException),
      },
    });

    return {
      reservation: updatedRes as Reservation,
      cancellation: cancelData as CancellationRecord,
      refund: createdRefund,
    };
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const ref = params.bookingReference.trim().toUpperCase();
    const reservation = db.reservations.find((r) => r.booking_reference.toUpperCase() === ref);
    if (!reservation) {
      throw new Error('Reservation not found.');
    }

    if (['cancelled', 'checked_out', 'checked_in'].includes(reservation.status)) {
      throw new Error(`Reservation cannot be cancelled while status is ${reservation.status}.`);
    }

    const deadline = new Date(reservation.cancellation_deadline_at);
    const withinPolicy = now.getTime() <= deadline.getTime();

    if (!withinPolicy) {
      const canOverride =
        params.overrideException &&
        db.settings.cancellation_policy.allowManagerExceptionOverride;
      if (!canOverride) {
        throw new Error(EXPIRED_CANCELLATION_MESSAGE);
      }
    }

    const cancellation: CancellationRecord = {
      id: crypto.randomUUID(),
      reservation_id: reservation.id,
      cancelled_by_type: 'staff',
      cancelled_by_staff_id: params.staffActor?.staffId ?? null,
      reason: params.reason,
      was_within_policy: withinPolicy,
      is_exception_override: !withinPolicy && Boolean(params.overrideException),
      policy_deadline_at: reservation.cancellation_deadline_at,
      cancelled_at: nowIso,
      status: 'approved',
      decision_reason: params.reason,
      reviewed_by_staff_id: params.staffActor?.staffId ?? null,
      reviewed_at: nowIso,
      previous_status: reservation.status,
    };
    db.cancellations.unshift(cancellation);

    reservation.status = 'cancelled';
    reservation.updated_at = nowIso;

    if (reservation.physical_room_id) {
      const room = db.physical_rooms.find((pr) => pr.id === reservation.physical_room_id);
      if (room && room.operational_status === 'occupied') {
        room.operational_status = 'available';
        room.updated_at = nowIso;
      }
    }

    let createdRefund: RefundRecord | null = null;
    const confirmedPayment = db.payments.find(
      (p) => p.reservation_id === reservation.id && p.status === 'confirmed'
    );
    if (confirmedPayment) {
      const refundPct = db.settings.cancellation_policy.refundPercentageOnEligible;
      const eligible = withinPolicy || Boolean(params.overrideException);
      const refundAmount = eligible
        ? Math.round((confirmedPayment.amount_ngn * refundPct) / 100)
        : 0;
      const refund: RefundRecord = {
        id: crypto.randomUUID(),
        reservation_id: reservation.id,
        cancellation_id: cancellation.id,
        payment_id: confirmedPayment.id,
        idempotency_key: `refund-${reservation.id}-${confirmedPayment.id}`,
        eligible,
        amount_ngn: refundAmount,
        original_payment_reference:
          confirmedPayment.provider_reference || confirmedPayment.bank_transfer_reference,
        request_status: eligible ? 'requested' : 'rejected',
        provider_refund_reference: null,
        failure_reason: null,
        approved_by_staff_id: null,
        processed_by_staff_id: null,
        requested_at: nowIso,
        completed_at: null,
        notes: eligible
          ? 'Created upon eligible staff cancellation. Awaiting management approval and provider processing.'
          : 'Cancelled outside policy window.',
      };
      db.refunds.unshift(refund);
      createdRefund = refund;
    }

    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipient_type: 'staff',
      recipient_email: null,
      channel: 'in_app',
      event_type: 'reservation_cancelled',
      title: `Cancellation ${reservation.booking_reference}`,
      message: `Reservation ${reservation.booking_reference} cancelled by staff (${withinPolicy ? 'within policy' : 'exception override'}). Reason: ${params.reason}`,
      related_reservation_id: reservation.id,
      is_read: false,
      delivery_status: 'sent',
      created_at: nowIso,
    });

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.staffActor?.userId ?? null,
      actor_email: params.staffActor?.email ?? 'staff',
      actor_role: params.staffActor?.role ?? 'manager',
      action: 'reservation.cancelled',
      entity_type: 'reservation',
      entity_id: reservation.id,
      details: {
        booking_reference: reservation.booking_reference,
        reason: params.reason,
        was_within_policy: withinPolicy,
        exception_override: !withinPolicy && Boolean(params.overrideException),
      },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return { reservation, cancellation, refund: createdRefund };
  });
}

// ============================================================================
// PAYMENT VERIFICATION & RECORDING
// ============================================================================
export async function submitBankTransferProof(params: {
  bookingReference: string;
  senderName: string;
  transferReference: string;
}): Promise<PaymentRecord> {
  const nowIso = new Date().toISOString();
  const ref = params.bookingReference.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: res } = await sb
      .from('reservations')
      .select('*')
      .eq('booking_reference', ref)
      .single();
    if (!res) throw new Error('Reservation not found.');

    const { data: pay } = await sb
      .from('payments')
      .select('*')
      .eq('reservation_id', res.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (!pay) throw new Error('Payment record not found.');

    const { data: updatedPay, error } = await sb
      .from('payments')
      .update({
        method: 'bank_transfer',
        status: 'pending_verification',
        bank_transfer_sender: params.senderName,
        bank_transfer_reference: params.transferReference,
        notes: 'Bank transfer proof submitted by guest. Pending staff verification.',
        updated_at: nowIso,
      })
      .eq('id', pay.id)
      .select('*')
      .single();

    if (error || !updatedPay) throw new Error('Could not update payment.');

    await sb
      .from('reservations')
      .update({ payment_status: 'pending_verification', updated_at: nowIso })
      .eq('id', res.id);

    await sb.from('notifications').insert({
      recipient_type: 'staff',
      channel: 'in_app',
      event_type: 'bank_transfer_submitted',
      title: `Bank transfer proof for ${ref}`,
      message: `Sender ${params.senderName} submitted reference ${params.transferReference}. Verify bank receipt before confirming.`,
      related_reservation_id: res.id,
      delivery_status: 'sent',
    });

    return updatedPay as PaymentRecord;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const res = db.reservations.find((r) => r.booking_reference.toUpperCase() === ref);
    if (!res) throw new Error('Reservation not found.');
    const pay = db.payments.find((p) => p.reservation_id === res.id);
    if (!pay) throw new Error('Payment record not found.');

    pay.method = 'bank_transfer';
    pay.status = 'pending_verification';
    pay.bank_transfer_sender = params.senderName;
    pay.bank_transfer_reference = params.transferReference;
    pay.notes = 'Bank transfer proof submitted by guest. Pending staff verification.';
    pay.updated_at = nowIso;

    res.payment_status = 'pending_verification';
    res.updated_at = nowIso;

    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipient_type: 'staff',
      recipient_email: null,
      channel: 'in_app',
      event_type: 'bank_transfer_submitted',
      title: `Bank transfer proof for ${ref}`,
      message: `Sender ${params.senderName} submitted reference ${params.transferReference}. Verify bank receipt before confirming.`,
      related_reservation_id: res.id,
      is_read: false,
      delivery_status: 'sent',
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return pay;
  });
}

export async function setPaymentProviderReference(params: {
  paymentId: string;
  providerReference: string;
  method?: PaymentMethod;
  notes?: string;
}): Promise<PaymentRecord> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb
      .from('payments')
      .update({
        provider_reference: params.providerReference,
        method: params.method ?? 'online_paystack',
        status: 'pending',
        notes: params.notes ?? 'Paystack transaction initialized.',
        updated_at: nowIso,
      })
      .eq('id', params.paymentId)
      .select('*')
      .single();
    if (error || !data) throw new Error('Could not record Paystack reference.');
    return data as PaymentRecord;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const pay = db.payments.find((p) => p.id === params.paymentId);
    if (!pay) throw new Error('Payment record not found.');
    pay.provider_reference = params.providerReference;
    if (params.method) pay.method = params.method;
    if (pay.status !== 'confirmed') pay.status = 'pending';
    if (params.notes) pay.notes = params.notes;
    pay.updated_at = nowIso;
    await writeRuntimeDb(db);
    return pay;
  });
}

export async function updatePaymentProviderStatus(params: {
  paymentId: string;
  status: PaymentRecord['status'];
  providerReference?: string;
  notes?: string;
}): Promise<PaymentRecord> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb
      .from('payments')
      .update({
        status: params.status,
        ...(params.providerReference ? { provider_reference: params.providerReference } : {}),
        ...(params.notes ? { notes: params.notes } : {}),
        updated_at: nowIso,
      })
      .eq('id', params.paymentId)
      .select('*')
      .single();
    if (error || !data) throw new Error('Could not update payment status.');
    return data as PaymentRecord;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const pay = db.payments.find((p) => p.id === params.paymentId);
    if (!pay) throw new Error('Payment record not found.');
    if (pay.status === 'confirmed' || pay.status === 'refunded') {
      return pay;
    }
    pay.status = params.status;
    if (params.providerReference) pay.provider_reference = params.providerReference;
    if (params.notes) pay.notes = params.notes;
    pay.updated_at = nowIso;
    await writeRuntimeDb(db);
    return pay;
  });
}

export async function confirmPaymentRecord(params: {
  paymentId: string;
  providerReference?: string;
  method?: PaymentMethod;
  staffActor?: { userId: string; staffId: string; email: string; role: RoleSlug };
  notes?: string;
}): Promise<PaymentRecord> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: pay } = await sb
      .from('payments')
      .select('*')
      .eq('id', params.paymentId)
      .single();
    if (!pay) throw new Error('Payment record not found.');
    if (pay.status === 'confirmed') return pay as PaymentRecord;

    const { data: updated } = await sb
      .from('payments')
      .update({
        status: 'confirmed',
        method: params.method ?? pay.method,
        provider_reference: params.providerReference ?? pay.provider_reference,
        verified_by_staff_id: params.staffActor?.staffId ?? null,
        verified_at: nowIso,
        notes: params.notes ?? pay.notes,
        updated_at: nowIso,
      })
      .eq('id', params.paymentId)
      .select('*')
      .single();

    await sb
      .from('reservations')
      .update({ status: 'confirmed', payment_status: 'paid', updated_at: nowIso })
      .eq('id', pay.reservation_id)
      .eq('status', 'pending_payment');

    await sb
      .from('reservations')
      .update({ payment_status: 'paid', updated_at: nowIso })
      .eq('id', pay.reservation_id);

    if (params.staffActor) {
      await sb.from('audit_logs').insert({
        actor_user_id: params.staffActor.userId,
        actor_email: params.staffActor.email,
        actor_role: params.staffActor.role,
        action: 'payment.confirmed',
        entity_type: 'payment',
        entity_id: params.paymentId,
        details: {
          amount_ngn: pay.amount_ngn,
          method: params.method ?? pay.method,
          provider_reference: params.providerReference ?? pay.provider_reference,
        },
      });
    }

    return updated as PaymentRecord;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const pay = db.payments.find((p) => p.id === params.paymentId);
    if (!pay) throw new Error('Payment record not found.');
    if (pay.status === 'confirmed') return pay;

    pay.status = 'confirmed';
    if (params.method) pay.method = params.method;
    if (params.providerReference) pay.provider_reference = params.providerReference;
    pay.verified_by_staff_id = params.staffActor?.staffId ?? null;
    pay.verified_at = nowIso;
    if (params.notes) pay.notes = params.notes;
    pay.updated_at = nowIso;

    const res = db.reservations.find((r) => r.id === pay.reservation_id);
    if (res) {
      if (res.status === 'pending_payment') res.status = 'confirmed';
      res.payment_status = 'paid';
      res.updated_at = nowIso;

      const guest = db.guests.find((g) => g.id === res.primary_guest_id);
      db.notifications.unshift({
        id: crypto.randomUUID(),
        recipient_type: 'staff',
        recipient_email: guest?.email ?? null,
        channel: 'in_app',
        event_type: 'payment_confirmed',
        title: `Payment Confirmed: ${res.booking_reference}`,
        message: `${pay.method === 'bank_transfer' ? 'Bank transfer' : 'Online card payment'} of NGN ${pay.amount_ngn.toLocaleString('en-NG')} verified for ${res.booking_reference}.`,
        related_reservation_id: res.id,
        is_read: false,
        delivery_status: 'sent',
        created_at: nowIso,
      });
    }

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.staffActor?.userId ?? null,
      actor_email: params.staffActor?.email ?? 'paystack-webhook',
      actor_role: params.staffActor?.role ?? 'system',
      action: 'payment.confirmed',
      entity_type: 'payment',
      entity_id: pay.id,
      details: {
        amount_ngn: pay.amount_ngn,
        method: pay.method,
        provider_reference: pay.provider_reference,
      },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return pay;
  });
}

// ============================================================================
// ADMIN OPERATIONAL SNAPSHOT & MODULE MUTATIONS
// ============================================================================
export async function getAdminSnapshot() {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const [
      categories,
      rooms,
      guests,
      reservations,
      payments,
      cancellations,
      refunds,
      housekeeping,
      maintenance,
      media,
      notifications,
      auditLogs,
      chatConversations,
      chatMessages,
      settings,
    ] = await Promise.all([
      getAllRoomCategoriesAdmin(),
      getPhysicalRooms(),
      sb.from('guests').select('*').order('created_at', { ascending: false }),
      sb.from('reservations').select('*').order('created_at', { ascending: false }),
      sb.from('payments').select('*').order('created_at', { ascending: false }),
      sb.from('cancellations').select('*').order('cancelled_at', { ascending: false }),
      sb.from('refunds').select('*').order('requested_at', { ascending: false }),
      sb.from('housekeeping_tasks').select('*').order('created_at', { ascending: false }),
      sb.from('maintenance_issues').select('*').order('created_at', { ascending: false }),
      getMediaAssets(false),
      sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
      sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('chat_conversations').select('*').order('last_message_at', { ascending: false }),
      sb.from('chat_messages').select('*').order('created_at', { ascending: true }),
      getHotelSettings(),
    ]);

    return {
      storageMode: getStorageMode(),
      categories,
      rooms,
      guests: (guests.data as Guest[]) || [],
      reservations: (reservations.data as Reservation[]) || [],
      payments: (payments.data as PaymentRecord[]) || [],
      cancellations: (cancellations.data as CancellationRecord[]) || [],
      refunds: (refunds.data as RefundRecord[]) || [],
      housekeeping: (housekeeping.data as HousekeepingTask[]) || [],
      maintenance: (maintenance.data as MaintenanceIssue[]) || [],
      media,
      notifications: (notifications.data as NotificationRecord[]) || [],
      auditLogs: (auditLogs.data as AuditLog[]) || [],
      chatConversations: (chatConversations.data as ChatConversation[]) || [],
      chatMessages: (chatMessages.data as ChatMessage[]) || [],
      settings,
    };
  }

  const db = await readRuntimeDb();
  return {
    storageMode: getStorageMode(),
    categories: [...db.room_categories].sort((a, b) => a.sort_order - b.sort_order),
    rooms: [...db.physical_rooms].sort((a, b) => a.room_number.localeCompare(b.room_number)),
    guests: [...db.guests],
    reservations: [...db.reservations].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    payments: [...db.payments].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    cancellations: [...db.cancellations].sort((a, b) =>
      b.cancelled_at.localeCompare(a.cancelled_at)
    ),
    refunds: [...db.refunds].sort((a, b) => b.requested_at.localeCompare(a.requested_at)),
    housekeeping: [...db.housekeeping_tasks].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    ),
    maintenance: [...db.maintenance_issues].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    ),
    media: [...db.media_assets].sort((a, b) => a.sort_order - b.sort_order),
    notifications: [...db.notifications].slice(0, 50),
    auditLogs: [...db.audit_logs].slice(0, 200),
    chatConversations: [...db.chat_conversations].sort((a, b) =>
      b.last_message_at.localeCompare(a.last_message_at)
    ),
    chatMessages: [...db.chat_messages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    settings: db.settings,
  };
}

// ============================================================================
// STAFF AUTHENTICATION & RBAC REPOSITORY
// ============================================================================
export async function getStaffUserByEmail(email: string): Promise<StaffUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: userRow } = await sb
      .from('users')
      .select('id, email, full_name, phone, password_hash')
      .eq('email', normalized)
      .maybeSingle();
    if (!userRow) return null;

    const { data: staffRow } = await sb
      .from('staff')
      .select('id, user_id, department, employment_status, created_at, roles(slug, name)')
      .eq('user_id', userRow.id)
      .maybeSingle();
    if (!staffRow) return null;

    const r = (staffRow as Record<string, unknown>).roles as Record<string, unknown> | null;
    return {
      id: staffRow.id as string,
      user_id: staffRow.user_id as string,
      email: userRow.email as string,
      full_name: userRow.full_name as string,
      phone: (userRow.phone as string) || null,
      role_slug: (r?.slug as RoleSlug) || 'receptionist',
      role_name: (r?.name as string) || 'Receptionist',
      department: staffRow.department as string,
      employment_status: staffRow.employment_status as StaffUser['employment_status'],
      password_hash: (userRow.password_hash as string) || null,
      created_at: staffRow.created_at as string,
    };
  }

  const db = await readRuntimeDb();
  return db.staff_users.find((s) => s.email.toLowerCase() === normalized) ?? null;
}

export async function hasActiveOwnerAccount(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: ownerRole } = await sb
      .from('roles')
      .select('id')
      .eq('slug', 'owner')
      .maybeSingle();
    if (!ownerRole) return false;

    const { data } = await sb
      .from('staff')
      .select('id')
      .eq('role_id', ownerRole.id)
      .eq('employment_status', 'active')
      .limit(1);
    return Boolean(data && data.length > 0);
  }

  const db = await readRuntimeDb();
  return db.staff_users.some((s) => s.role_slug === 'owner' && s.employment_status === 'active');
}

export async function getStaffUsers(): Promise<StaffUser[]> {
  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data } = await sb
      .from('staff')
      .select('id, user_id, department, employment_status, created_at, users(email, full_name, phone, password_hash), roles(slug, name)');
    if (data) {
      return data.map((row: Record<string, unknown>) => {
        const u = row.users as Record<string, unknown>;
        const r = row.roles as Record<string, unknown>;
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          email: (u?.email as string) || '',
          full_name: (u?.full_name as string) || '',
          phone: (u?.phone as string) || null,
          role_slug: (r?.slug as RoleSlug) || 'receptionist',
          role_name: (r?.name as string) || 'Receptionist',
          department: row.department as string,
          employment_status: row.employment_status as StaffUser['employment_status'],
          password_hash: (u?.password_hash as string) || null,
          created_at: row.created_at as string,
        };
      });
    }
  }
  const db = await readRuntimeDb();
  return db.staff_users;
}

export async function createOrBootstrapStaff(params: {
  email: string;
  fullName: string;
  phone?: string;
  roleSlug: RoleSlug;
  department: string;
  passwordHash: string;
  actor?: { userId: string; email: string; role: RoleSlug };
}): Promise<StaffUser> {
  const nowIso = new Date().toISOString();
  const normalizedEmail = params.email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: role } = await sb
      .from('roles')
      .select('id, slug, name')
      .eq('slug', params.roleSlug)
      .single();
    if (!role) throw new Error('Invalid staff role.');

    const { data: user, error: uErr } = await sb
      .from('users')
      .insert({
        email: normalizedEmail,
        full_name: params.fullName,
        phone: params.phone ?? null,
        password_hash: params.passwordHash,
      })
      .select('*')
      .single();
    if (uErr || !user) throw new Error(uErr?.message || 'Unable to create user.');

    const { data: staff, error: sErr } = await sb
      .from('staff')
      .insert({
        user_id: user.id,
        role_id: role.id,
        department: params.department,
        employment_status: 'active',
      })
      .select('*')
      .single();
    if (sErr || !staff) throw new Error(sErr?.message || 'Unable to create staff profile.');

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor?.userId ?? user.id,
      actor_email: params.actor?.email ?? normalizedEmail,
      actor_role: params.actor?.role ?? params.roleSlug,
      action: params.actor ? 'staff.created' : 'staff.owner_bootstrapped',
      entity_type: 'staff',
      entity_id: staff.id,
      details: { email: normalizedEmail, role: params.roleSlug },
    });

    return {
      id: staff.id,
      user_id: user.id,
      email: normalizedEmail,
      full_name: params.fullName,
      phone: params.phone ?? null,
      role_slug: params.roleSlug,
      role_name: role.name,
      department: params.department,
      employment_status: 'active',
      created_at: nowIso,
    };
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    if (db.staff_users.some((s) => s.email.toLowerCase() === normalizedEmail)) {
      throw new Error('A staff account with this email already exists.');
    }

    const staffUser: StaffUser = {
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      email: normalizedEmail,
      full_name: params.fullName,
      phone: params.phone ?? null,
      role_slug: params.roleSlug,
      role_name: getRoleLabel(params.roleSlug),
      department: params.department,
      employment_status: 'active',
      password_hash: params.passwordHash,
      created_at: nowIso,
    };
    db.staff_users.push(staffUser);

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor?.userId ?? staffUser.user_id,
      actor_email: params.actor?.email ?? normalizedEmail,
      actor_role: params.actor?.role ?? params.roleSlug,
      action: params.actor ? 'staff.created' : 'staff.owner_bootstrapped',
      entity_type: 'staff',
      entity_id: staffUser.id,
      details: { email: normalizedEmail, role: params.roleSlug },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return staffUser;
  });
}

// ============================================================================
// OPERATIONAL MUTATIONS (RESERVATIONS, ROOMS, HOUSEKEEPING, MAINTENANCE, REFUNDS, MEDIA, SETTINGS)
// ============================================================================
export async function updateReservationAdmin(params: {
  reservationId: string;
  status?: Reservation['status'];
  physicalRoomId?: string;
  specialRequests?: string;
  actor: { userId: string; staffId: string; email: string; role: RoleSlug };
}): Promise<Reservation> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: existing } = await sb
      .from('reservations')
      .select('*')
      .eq('id', params.reservationId)
      .single();
    if (!existing) throw new Error('Reservation not found.');

    const patch: Record<string, unknown> = { updated_at: nowIso };
    if (params.status) patch.status = params.status;
    if (params.physicalRoomId) patch.physical_room_id = params.physicalRoomId;
    if (params.specialRequests !== undefined) patch.special_requests = params.specialRequests;

    const { data: updated, error } = await sb
      .from('reservations')
      .update(patch)
      .eq('id', params.reservationId)
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Update failed.');

    const roomId = params.physicalRoomId ?? existing.physical_room_id;
    if (roomId && params.status === 'checked_in') {
      await sb
        .from('physical_rooms')
        .update({ operational_status: 'occupied', updated_at: nowIso })
        .eq('id', roomId);
    } else if (roomId && params.status === 'checked_out') {
      await sb
        .from('physical_rooms')
        .update({
          operational_status: 'available',
          housekeeping_status: 'dirty',
          updated_at: nowIso,
        })
        .eq('id', roomId);
      await sb.from('housekeeping_tasks').insert({
        physical_room_id: roomId,
        task_type: 'turnover',
        status: 'pending',
        notes: `Checkout turnover for reservation ${existing.booking_reference}`,
      });
    }

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'reservation.updated',
      entity_type: 'reservation',
      entity_id: params.reservationId,
      details: patch,
    });

    return updated as Reservation;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const res = db.reservations.find((r) => r.id === params.reservationId);
    if (!res) throw new Error('Reservation not found.');

    if (params.physicalRoomId && params.physicalRoomId !== res.physical_room_id) {
      const targetRoom = db.physical_rooms.find((pr) => pr.id === params.physicalRoomId);
      if (!targetRoom || !targetRoom.is_active) {
        throw new Error('Selected room is not active.');
      }
      const conflict = db.reservations.some(
        (other) =>
          other.id !== res.id &&
          other.physical_room_id === params.physicalRoomId &&
          ['pending_payment', 'confirmed', 'checked_in', 'cancellation_requested'].includes(other.status) &&
          datesOverlap(other.check_in_date, other.check_out_date, res.check_in_date, res.check_out_date)
      );
      if (conflict) {
        throw new Error('Selected room already has an overlapping reservation.');
      }
      res.physical_room_id = params.physicalRoomId;
    }

    if (params.status) res.status = params.status;
    if (params.specialRequests !== undefined) res.special_requests = params.specialRequests;
    res.updated_at = nowIso;

    if (res.physical_room_id && params.status === 'checked_in') {
      const room = db.physical_rooms.find((pr) => pr.id === res.physical_room_id);
      if (room) {
        room.operational_status = 'occupied';
        room.updated_at = nowIso;
      }
    } else if (res.physical_room_id && params.status === 'checked_out') {
      const room = db.physical_rooms.find((pr) => pr.id === res.physical_room_id);
      if (room) {
        room.operational_status = 'available';
        room.housekeeping_status = 'dirty';
        room.updated_at = nowIso;
      }
      db.housekeeping_tasks.unshift({
        id: crypto.randomUUID(),
        physical_room_id: res.physical_room_id,
        task_type: 'turnover',
        status: 'pending',
        assigned_staff_id: null,
        notes: `Checkout turnover for reservation ${res.booking_reference}`,
        completed_at: null,
        inspected_at: null,
        created_at: nowIso,
      });
    }

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'reservation.updated',
      entity_type: 'reservation',
      entity_id: res.id,
      details: {
        status: params.status,
        physical_room_id: params.physicalRoomId,
      },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return res;
  });
}

export async function processRefundAdmin(params: {
  refundId: string;
  action: 'approve' | 'reject' | 'mark_processing' | 'complete' | 'fail';
  providerRefundReference?: string;
  failureReason?: string;
  notes?: string;
  actor: { userId: string; staffId: string; email: string; role: RoleSlug };
}): Promise<RefundRecord> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data: rf } = await sb
      .from('refunds')
      .select('*')
      .eq('id', params.refundId)
      .single();
    if (!rf) throw new Error('Refund record not found.');

    if (rf.request_status === 'completed') {
      return rf as RefundRecord; // Idempotent guard
    }

    const patch: Record<string, unknown> = {};
    if (params.notes) patch.notes = params.notes;
    if (params.action === 'approve') {
      patch.request_status = 'approved';
      patch.approved_by_staff_id = params.actor.staffId;
    } else if (params.action === 'reject') {
      patch.request_status = 'rejected';
      patch.approved_by_staff_id = params.actor.staffId;
    } else if (params.action === 'mark_processing') {
      patch.request_status = 'processing';
      patch.processed_by_staff_id = params.actor.staffId;
    } else if (params.action === 'complete') {
      if (!params.providerRefundReference) {
        throw new Error('A provider or bank refund reference is required to complete a refund.');
      }
      patch.request_status = 'completed';
      patch.provider_refund_reference = params.providerRefundReference;
      patch.processed_by_staff_id = params.actor.staffId;
      patch.completed_at = nowIso;
    } else if (params.action === 'fail') {
      patch.request_status = 'failed';
      patch.failure_reason = params.failureReason || 'Provider refund failed.';
    }

    const { data: updated } = await sb
      .from('refunds')
      .update(patch)
      .eq('id', params.refundId)
      .select('*')
      .single();

    if (params.action === 'complete') {
      await sb
        .from('reservations')
        .update({ payment_status: 'refunded', updated_at: nowIso })
        .eq('id', rf.reservation_id);
      await sb
        .from('payments')
        .update({ status: 'refunded', updated_at: nowIso })
        .eq('id', rf.payment_id);
    }

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: `refund.${params.action}`,
      entity_type: 'refund',
      entity_id: params.refundId,
      details: patch,
    });

    return updated as RefundRecord;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const rf = db.refunds.find((r) => r.id === params.refundId);
    if (!rf) throw new Error('Refund record not found.');
    if (rf.request_status === 'completed') return rf; // Idempotent

    if (params.notes) rf.notes = params.notes;
    if (params.action === 'approve') {
      rf.request_status = 'approved';
      rf.approved_by_staff_id = params.actor.staffId;
    } else if (params.action === 'reject') {
      rf.request_status = 'rejected';
      rf.approved_by_staff_id = params.actor.staffId;
    } else if (params.action === 'mark_processing') {
      rf.request_status = 'processing';
      rf.processed_by_staff_id = params.actor.staffId;
    } else if (params.action === 'complete') {
      if (!params.providerRefundReference) {
        throw new Error('A provider or bank refund reference is required to complete a refund.');
      }
      rf.request_status = 'completed';
      rf.provider_refund_reference = params.providerRefundReference;
      rf.processed_by_staff_id = params.actor.staffId;
      rf.completed_at = nowIso;

      const res = db.reservations.find((r) => r.id === rf.reservation_id);
      if (res) {
        res.payment_status = 'refunded';
        res.updated_at = nowIso;
      }
      const pay = db.payments.find((p) => p.id === rf.payment_id);
      if (pay) {
        pay.status = 'refunded';
        pay.updated_at = nowIso;
      }
    } else if (params.action === 'fail') {
      rf.request_status = 'failed';
      rf.failure_reason = params.failureReason || 'Provider refund failed.';
    }

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: `refund.${params.action}`,
      entity_type: 'refund',
      entity_id: rf.id,
      details: {
        request_status: rf.request_status,
        provider_refund_reference: rf.provider_refund_reference,
      },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return rf;
  });
}

export async function upsertPhysicalRoomAdmin(params: {
  id?: string;
  categoryId: string;
  roomNumber: string;
  floorLabel: string;
  operationalStatus: PhysicalRoom['operational_status'];
  housekeepingStatus: PhysicalRoom['housekeeping_status'];
  notes?: string;
  isActive?: boolean;
  actor: { userId: string; email: string; role: RoleSlug };
}): Promise<PhysicalRoom> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const payload = {
      category_id: params.categoryId,
      room_number: params.roomNumber,
      floor_label: params.floorLabel,
      operational_status: params.operationalStatus,
      housekeeping_status: params.housekeepingStatus,
      notes: params.notes ?? '',
      is_active: params.isActive ?? true,
      updated_at: nowIso,
    };

    const query = params.id
      ? sb.from('physical_rooms').update(payload).eq('id', params.id).select('*').single()
      : sb.from('physical_rooms').insert(payload).select('*').single();

    const { data, error } = await query;
    if (error || !data) throw new Error(error?.message || 'Failed to save physical room.');

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: params.id ? 'room.updated' : 'room.created',
      entity_type: 'physical_room',
      entity_id: data.id,
      details: payload,
    });
    return data as PhysicalRoom;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    let room: PhysicalRoom;
    if (params.id) {
      const existing = db.physical_rooms.find((r) => r.id === params.id);
      if (!existing) throw new Error('Room not found.');
      existing.category_id = params.categoryId;
      existing.room_number = params.roomNumber;
      existing.floor_label = params.floorLabel;
      existing.operational_status = params.operationalStatus;
      existing.housekeeping_status = params.housekeepingStatus;
      if (params.notes !== undefined) existing.notes = params.notes;
      if (params.isActive !== undefined) existing.is_active = params.isActive;
      existing.updated_at = nowIso;
      room = existing;
    } else {
      if (db.physical_rooms.some((r) => r.room_number === params.roomNumber)) {
        throw new Error('A physical room with this number already exists.');
      }
      room = {
        id: crypto.randomUUID(),
        category_id: params.categoryId,
        room_number: params.roomNumber,
        floor_label: params.floorLabel,
        operational_status: params.operationalStatus,
        housekeeping_status: params.housekeepingStatus,
        notes: params.notes ?? '',
        is_active: params.isActive ?? true,
        updated_at: nowIso,
      };
      db.physical_rooms.push(room);
    }

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: params.id ? 'room.updated' : 'room.created',
      entity_type: 'physical_room',
      entity_id: room.id,
      details: { room_number: room.room_number, operational_status: room.operational_status },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return room;
  });
}

export async function updateRoomCategoryAdmin(params: {
  id: string;
  nightly_rate_ngn?: number;
  short_description?: string;
  editorial_description?: string;
  verified_amenities?: string[];
  max_guests_note?: string | null;
  bed_configuration_note?: string | null;
  dimensions_note?: string | null;
  actor: { userId: string; email: string; role: RoleSlug };
}): Promise<RoomCategory> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const patch: Record<string, unknown> = { updated_at: nowIso };
    if (params.nightly_rate_ngn !== undefined) patch.nightly_rate_ngn = params.nightly_rate_ngn;
    if (params.short_description !== undefined) patch.short_description = params.short_description;
    if (params.editorial_description !== undefined)
      patch.editorial_description = params.editorial_description;
    if (params.verified_amenities !== undefined)
      patch.verified_amenities = params.verified_amenities;
    if (params.max_guests_note !== undefined) patch.max_guests_note = params.max_guests_note;
    if (params.bed_configuration_note !== undefined)
      patch.bed_configuration_note = params.bed_configuration_note;
    if (params.dimensions_note !== undefined) patch.dimensions_note = params.dimensions_note;

    const { data, error } = await sb
      .from('room_categories')
      .update(patch)
      .eq('id', params.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to update room category.');

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'room_category.updated',
      entity_type: 'room_category',
      entity_id: params.id,
      details: patch,
    });
    return data as RoomCategory;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const cat = db.room_categories.find((c) => c.id === params.id);
    if (!cat) throw new Error('Room category not found.');
    if (params.nightly_rate_ngn !== undefined) cat.nightly_rate_ngn = params.nightly_rate_ngn;
    if (params.short_description !== undefined) cat.short_description = params.short_description;
    if (params.editorial_description !== undefined)
      cat.editorial_description = params.editorial_description;
    if (params.verified_amenities !== undefined) cat.verified_amenities = params.verified_amenities;
    if (params.max_guests_note !== undefined) cat.max_guests_note = params.max_guests_note;
    if (params.bed_configuration_note !== undefined)
      cat.bed_configuration_note = params.bed_configuration_note;
    if (params.dimensions_note !== undefined) cat.dimensions_note = params.dimensions_note;

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'room_category.updated',
      entity_type: 'room_category',
      entity_id: cat.id,
      details: { nightly_rate_ngn: cat.nightly_rate_ngn },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return cat;
  });
}

export async function createOrUpdateHousekeepingTask(params: {
  id?: string;
  physicalRoomId?: string;
  taskType?: HousekeepingTask['task_type'];
  status: HousekeepingTask['status'];
  assignedStaffId?: string | null;
  notes?: string;
  actor: { userId: string; email: string; role: RoleSlug };
}): Promise<HousekeepingTask> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    let task: HousekeepingTask;
    if (params.id) {
      const patch: Record<string, unknown> = { status: params.status };
      if (params.assignedStaffId !== undefined) patch.assigned_staff_id = params.assignedStaffId;
      if (params.notes !== undefined) patch.notes = params.notes;
      if (params.status === 'completed') patch.completed_at = nowIso;
      if (params.status === 'inspected') patch.inspected_at = nowIso;
      const { data, error } = await sb
        .from('housekeeping_tasks')
        .update(patch)
        .eq('id', params.id)
        .select('*')
        .single();
      if (error || !data) throw new Error('Housekeeping task update failed.');
      task = data as HousekeepingTask;
    } else {
      const { data, error } = await sb
        .from('housekeeping_tasks')
        .insert({
          physical_room_id: params.physicalRoomId,
          task_type: params.taskType || 'daily_refresh',
          status: params.status,
          assigned_staff_id: params.assignedStaffId ?? null,
          notes: params.notes ?? '',
        })
        .select('*')
        .single();
      if (error || !data) throw new Error('Housekeeping task creation failed.');
      task = data as HousekeepingTask;
    }

    const roomStatusMap: Record<HousekeepingTask['status'], PhysicalRoom['housekeeping_status']> = {
      pending: 'dirty',
      in_progress: 'cleaning',
      completed: 'clean',
      inspected: 'inspected',
    };
    await sb
      .from('physical_rooms')
      .update({ housekeeping_status: roomStatusMap[params.status], updated_at: nowIso })
      .eq('id', task.physical_room_id);

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'housekeeping.updated',
      entity_type: 'housekeeping_task',
      entity_id: task.id,
      details: { status: params.status },
    });
    return task;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    let task: HousekeepingTask;
    if (params.id) {
      const existing = db.housekeeping_tasks.find((t) => t.id === params.id);
      if (!existing) throw new Error('Housekeeping task not found.');
      existing.status = params.status;
      if (params.assignedStaffId !== undefined) existing.assigned_staff_id = params.assignedStaffId;
      if (params.notes !== undefined) existing.notes = params.notes;
      if (params.status === 'completed') existing.completed_at = nowIso;
      if (params.status === 'inspected') existing.inspected_at = nowIso;
      task = existing;
    } else {
      if (!params.physicalRoomId) throw new Error('Physical room is required.');
      task = {
        id: crypto.randomUUID(),
        physical_room_id: params.physicalRoomId,
        task_type: params.taskType || 'daily_refresh',
        status: params.status,
        assigned_staff_id: params.assignedStaffId ?? null,
        notes: params.notes ?? '',
        completed_at: null,
        inspected_at: null,
        created_at: nowIso,
      };
      db.housekeeping_tasks.unshift(task);
    }

    const room = db.physical_rooms.find((r) => r.id === task.physical_room_id);
    if (room) {
      const roomStatusMap: Record<HousekeepingTask['status'], PhysicalRoom['housekeeping_status']> = {
        pending: 'dirty',
        in_progress: 'cleaning',
        completed: 'clean',
        inspected: 'inspected',
      };
      room.housekeeping_status = roomStatusMap[params.status];
      room.updated_at = nowIso;
    }

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'housekeeping.updated',
      entity_type: 'housekeeping_task',
      entity_id: task.id,
      details: { status: params.status },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return task;
  });
}

export async function createOrUpdateMaintenanceIssue(params: {
  id?: string;
  physicalRoomId?: string | null;
  areaLabel?: string;
  title?: string;
  description?: string;
  priority?: MaintenanceIssue['priority'];
  blocksRoom?: boolean;
  status?: MaintenanceIssue['status'];
  assignedStaffId?: string | null;
  resolutionNotes?: string;
  actor: { userId: string; email: string; role: RoleSlug };
}): Promise<MaintenanceIssue> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    let issue: MaintenanceIssue;
    if (params.id) {
      const patch: Record<string, unknown> = {};
      if (params.status) patch.status = params.status;
      if (params.blocksRoom !== undefined) patch.blocks_room = params.blocksRoom;
      if (params.assignedStaffId !== undefined) patch.assigned_staff_id = params.assignedStaffId;
      if (params.resolutionNotes !== undefined) patch.resolution_notes = params.resolutionNotes;
      if (params.status === 'resolved') patch.resolved_at = nowIso;
      const { data, error } = await sb
        .from('maintenance_issues')
        .update(patch)
        .eq('id', params.id)
        .select('*')
        .single();
      if (error || !data) throw new Error('Maintenance update failed.');
      issue = data as MaintenanceIssue;
    } else {
      const { data, error } = await sb
        .from('maintenance_issues')
        .insert({
          physical_room_id: params.physicalRoomId ?? null,
          area_label: params.areaLabel || 'General Facility',
          title: params.title || 'Maintenance Issue',
          description: params.description || '',
          priority: params.priority || 'normal',
          blocks_room: Boolean(params.blocksRoom),
          status: params.status || 'open',
          assigned_staff_id: params.assignedStaffId ?? null,
        })
        .select('*')
        .single();
      if (error || !data) throw new Error('Maintenance creation failed.');
      issue = data as MaintenanceIssue;
    }

    if (issue.physical_room_id) {
      if (issue.blocks_room && issue.status !== 'resolved') {
        await sb
          .from('physical_rooms')
          .update({ operational_status: 'maintenance', updated_at: nowIso })
          .eq('id', issue.physical_room_id);
      } else if (issue.status === 'resolved') {
        await sb
          .from('physical_rooms')
          .update({ operational_status: 'available', updated_at: nowIso })
          .eq('id', issue.physical_room_id)
          .eq('operational_status', 'maintenance');
      }
    }

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: params.id ? 'maintenance.updated' : 'maintenance.created',
      entity_type: 'maintenance_issue',
      entity_id: issue.id,
      details: { status: issue.status, blocks_room: issue.blocks_room },
    });
    return issue;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    let issue: MaintenanceIssue;
    if (params.id) {
      const existing = db.maintenance_issues.find((m) => m.id === params.id);
      if (!existing) throw new Error('Maintenance issue not found.');
      if (params.status) existing.status = params.status;
      if (params.blocksRoom !== undefined) existing.blocks_room = params.blocksRoom;
      if (params.assignedStaffId !== undefined) existing.assigned_staff_id = params.assignedStaffId;
      if (params.resolutionNotes !== undefined) existing.resolution_notes = params.resolutionNotes;
      if (params.status === 'resolved') existing.resolved_at = nowIso;
      issue = existing;
    } else {
      issue = {
        id: crypto.randomUUID(),
        physical_room_id: params.physicalRoomId ?? null,
        area_label: params.areaLabel || 'General Facility',
        title: params.title || 'Maintenance Issue',
        description: params.description || '',
        priority: params.priority || 'normal',
        blocks_room: Boolean(params.blocksRoom),
        status: params.status || 'open',
        assigned_staff_id: params.assignedStaffId ?? null,
        resolution_notes: '',
        resolved_at: null,
        created_at: nowIso,
      };
      db.maintenance_issues.unshift(issue);
    }

    if (issue.physical_room_id) {
      const room = db.physical_rooms.find((r) => r.id === issue.physical_room_id);
      if (room) {
        if (issue.blocks_room && issue.status !== 'resolved') {
          room.operational_status = 'maintenance';
          room.updated_at = nowIso;
        } else if (issue.status === 'resolved' && room.operational_status === 'maintenance') {
          room.operational_status = 'available';
          room.updated_at = nowIso;
        }
      }
    }

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: params.id ? 'maintenance.updated' : 'maintenance.created',
      entity_type: 'maintenance_issue',
      entity_id: issue.id,
      details: { status: issue.status, blocks_room: issue.blocks_room },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return issue;
  });
}

export async function addMediaAssetAdmin(params: {
  title: string;
  alt_text: string;
  media_type: 'image' | 'video';
  section_key: MediaAsset['section_key'];
  category_slug?: string | null;
  storage_path: string;
  public_url: string;
  drive_file_id?: string | null;
  actor: { userId: string; staffId: string; email: string; role: RoleSlug };
}): Promise<MediaAsset> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb
      .from('media_assets')
      .insert({
        title: params.title,
        alt_text: params.alt_text,
        media_type: params.media_type,
        section_key: params.section_key,
        category_slug: params.category_slug ?? null,
        storage_path: params.storage_path,
        public_url: params.public_url,
        drive_file_id: params.drive_file_id ?? null,
        is_published: true,
        uploaded_by_staff_id: params.actor.staffId,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error('Failed to save media asset.');

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'media.uploaded',
      entity_type: 'media_asset',
      entity_id: data.id,
      details: { section_key: params.section_key, title: params.title },
    });
    return data as MediaAsset;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const asset: MediaAsset = {
      id: crypto.randomUUID(),
      title: params.title,
      alt_text: params.alt_text,
      media_type: params.media_type,
      section_key: params.section_key,
      category_slug: params.category_slug ?? null,
      storage_path: params.storage_path,
      public_url: params.public_url,
      drive_file_id: params.drive_file_id ?? null,
      sort_order: db.media_assets.length + 1,
      is_published: true,
      uploaded_by_staff_id: params.actor.staffId,
      created_at: nowIso,
    };
    db.media_assets.push(asset);

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'media.uploaded',
      entity_type: 'media_asset',
      entity_id: asset.id,
      details: { section_key: params.section_key, title: params.title },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return asset;
  });
}

export async function deleteMediaAssetAdmin(params: {
  id: string;
  actor: { userId: string; email: string; role: RoleSlug };
}): Promise<void> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    await sb.from('media_assets').delete().eq('id', params.id);
    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'media.deleted',
      entity_type: 'media_asset',
      entity_id: params.id,
      details: {},
    });
    return;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    db.media_assets = db.media_assets.filter((m) => m.id !== params.id);
    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'media.deleted',
      entity_type: 'media_asset',
      entity_id: params.id,
      details: {},
      created_at: nowIso,
    });
    await writeRuntimeDb(db);
  });
}

export async function updateHotelSettingsAdmin(params: {
  settings: Partial<HotelSettings>;
  actor: { userId: string; email: string; role: RoleSlug };
}): Promise<HotelSettings> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const current = await getHotelSettings();
    const next: HotelSettings = {
      hotel_profile: { ...current.hotel_profile, ...(params.settings.hotel_profile || {}) },
      cancellation_policy: {
        ...current.cancellation_policy,
        ...(params.settings.cancellation_policy || {}),
      },
      analytics: { ...current.analytics, ...(params.settings.analytics || {}) },
    };
    await sb.from('hotel_settings').upsert([
      { key: 'hotel_profile', value: next.hotel_profile, updated_by_user_id: params.actor.userId, updated_at: nowIso },
      { key: 'cancellation_policy', value: next.cancellation_policy, updated_by_user_id: params.actor.userId, updated_at: nowIso },
      { key: 'analytics', value: next.analytics, updated_by_user_id: params.actor.userId, updated_at: nowIso },
    ]);

    await sb.from('audit_logs').insert({
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'settings.updated',
      entity_type: 'hotel_settings',
      entity_id: 'global',
      details: params.settings as Record<string, unknown>,
    });

    return next;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    if (params.settings.hotel_profile) {
      db.settings.hotel_profile = { ...db.settings.hotel_profile, ...params.settings.hotel_profile };
    }
    if (params.settings.cancellation_policy) {
      db.settings.cancellation_policy = {
        ...db.settings.cancellation_policy,
        ...params.settings.cancellation_policy,
      };
    }
    if (params.settings.analytics) {
      db.settings.analytics = { ...db.settings.analytics, ...params.settings.analytics };
    }

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'settings.updated',
      entity_type: 'hotel_settings',
      entity_id: 'global',
      details: params.settings as Record<string, unknown>,
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return db.settings;
  });
}

export async function recordContactInquiry(params: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<NotificationRecord> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const sb = createSupabaseAdminClient()!;
    const { data, error } = await sb
      .from('notifications')
      .insert({
        recipient_type: 'staff',
        recipient_email: params.email,
        channel: 'in_app',
        event_type: 'contact_inquiry',
        title: `Inquiry: ${params.subject}`,
        message: `From ${params.name} (${params.email}${params.phone ? ', ' + params.phone : ''}): ${params.message}`,
        delivery_status: 'sent',
      })
      .select('*')
      .single();
    if (error || !data) throw new Error('Unable to record contact message.');
    return data as NotificationRecord;
  }

  return withLock(async () => {
    const db = await readRuntimeDb();
    const record: NotificationRecord = {
      id: crypto.randomUUID(),
      recipient_type: 'staff',
      recipient_email: params.email,
      channel: 'in_app',
      event_type: 'contact_inquiry',
      title: `Inquiry: ${params.subject}`,
      message: `From ${params.name} (${params.email}${params.phone ? ', ' + params.phone : ''}): ${params.message}`,
      related_reservation_id: null,
      is_read: false,
      delivery_status: 'sent',
      created_at: nowIso,
    };
    db.notifications.unshift(record);
    await writeRuntimeDb(db);
    return record;
  });
}

export async function recordAnalyticsEvent(params: {
  event_name: string;
  path: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    await withLock(async () => {
      const db = await readRuntimeDb();
      db.analytics_events.unshift({
        id: crypto.randomUUID(),
        event_name: params.event_name,
        path: params.path,
        metadata: params.metadata ?? {},
        created_at: nowIso,
      });
      if (db.analytics_events.length > 500) {
        db.analytics_events = db.analytics_events.slice(0, 500);
      }
      await writeRuntimeDb(db);
    });
  }
}

export async function getFacilities(): Promise<FacilityItem[]> {
  return structuredClone(INITIAL_FACILITIES);
}

// ============================================================================
// GUEST <-> STAFF LIVE CHAT SERVICE
// ============================================================================
export async function startOrGetGuestChat(params: {
  guestName: string;
  guestEmail: string;
  bookingReference?: string;
  initialMessage: string;
}): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  const nowIso = new Date().toISOString();
  const normalizedEmail = params.guestEmail.trim().toLowerCase();
  const ref = params.bookingReference?.trim().toUpperCase() || null;

  return withLock(async () => {
    const db = await readRuntimeDb();
    let conversation = db.chat_conversations.find(
      (c) => c.guest_email.toLowerCase() === normalizedEmail && c.status === 'open'
    );

    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        guest_name: params.guestName.trim(),
        guest_email: normalizedEmail,
        booking_reference: ref,
        status: 'open',
        unread_staff_count: 0,
        unread_guest_count: 0,
        guest_token: crypto.randomBytes(16).toString('hex'),
        last_message_at: nowIso,
        created_at: nowIso,
      };
      db.chat_conversations.unshift(conversation);
    } else if (ref && !conversation.booking_reference) {
      conversation.booking_reference = ref;
    }

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      sender_type: 'guest',
      sender_name: params.guestName.trim() || conversation.guest_name,
      body: params.initialMessage.trim(),
      created_at: nowIso,
    };
    db.chat_messages.push(msg);
    conversation.last_message_at = nowIso;
    conversation.unread_staff_count += 1;

    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipient_type: 'staff',
      recipient_email: normalizedEmail,
      channel: 'in_app',
      event_type: 'live_chat_message',
      title: `Guest Chat from ${conversation.guest_name}`,
      message: msg.body.slice(0, 140),
      related_reservation_id: null,
      is_read: false,
      delivery_status: 'sent',
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return {
      conversation,
      messages: db.chat_messages.filter((m) => m.conversation_id === conversation!.id),
    };
  });
}

export async function getGuestChatThread(params: {
  conversationId: string;
  guestToken: string;
}): Promise<{ conversation: ChatConversation; messages: ChatMessage[] } | null> {
  const db = await readRuntimeDb();
  const conversation = db.chat_conversations.find(
    (c) => c.id === params.conversationId && c.guest_token === params.guestToken
  );
  if (!conversation) return null;
  if (conversation.unread_guest_count > 0) {
    conversation.unread_guest_count = 0;
  }
  return {
    conversation,
    messages: db.chat_messages
      .filter((m) => m.conversation_id === conversation.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

export async function sendGuestChatMessage(params: {
  conversationId: string;
  guestToken: string;
  body: string;
}): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  const nowIso = new Date().toISOString();
  return withLock(async () => {
    const db = await readRuntimeDb();
    const conversation = db.chat_conversations.find(
      (c) => c.id === params.conversationId && c.guest_token === params.guestToken
    );
    if (!conversation) throw new Error('Chat session not found or unauthorized.');

    conversation.status = 'open';
    conversation.last_message_at = nowIso;
    conversation.unread_staff_count += 1;

    db.chat_messages.push({
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      sender_type: 'guest',
      sender_name: conversation.guest_name,
      body: params.body.trim(),
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return {
      conversation,
      messages: db.chat_messages
        .filter((m) => m.conversation_id === conversation.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
  });
}

export async function replyStaffChat(params: {
  conversationId: string;
  body: string;
  actor: { userId: string; email: string; role: RoleSlug; fullName?: string };
}): Promise<{ conversation: ChatConversation; message: ChatMessage }> {
  const nowIso = new Date().toISOString();
  return withLock(async () => {
    const db = await readRuntimeDb();
    const conversation = db.chat_conversations.find((c) => c.id === params.conversationId);
    if (!conversation) throw new Error('Conversation not found.');

    const staffMember = db.staff_users.find((s) => s.email.toLowerCase() === params.actor.email.toLowerCase());
    const senderName =
      params.actor.fullName || staffMember?.full_name || getRoleLabel(params.actor.role);

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      sender_type: 'staff',
      sender_name: senderName,
      body: params.body.trim(),
      created_at: nowIso,
    };
    db.chat_messages.push(message);
    conversation.last_message_at = nowIso;
    conversation.unread_staff_count = 0;
    conversation.unread_guest_count += 1;
    conversation.status = 'open';

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: 'chat.replied',
      entity_type: 'chat_conversation',
      entity_id: conversation.id,
      details: { guest_email: conversation.guest_email },
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return { conversation, message };
  });
}

export async function setChatStatusStaff(params: {
  conversationId: string;
  status: 'open' | 'resolved';
  actor: { userId: string; email: string; role: RoleSlug };
}): Promise<ChatConversation> {
  const nowIso = new Date().toISOString();
  return withLock(async () => {
    const db = await readRuntimeDb();
    const conversation = db.chat_conversations.find((c) => c.id === params.conversationId);
    if (!conversation) throw new Error('Conversation not found.');
    conversation.status = params.status;
    conversation.unread_staff_count = 0;

    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      actor_user_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: `chat.${params.status}`,
      entity_type: 'chat_conversation',
      entity_id: conversation.id,
      details: {},
      created_at: nowIso,
    });

    await writeRuntimeDb(db);
    return conversation;
  });
}

export async function markStaffChatRead(conversationId: string): Promise<void> {
  await withLock(async () => {
    const db = await readRuntimeDb();
    const conversation = db.chat_conversations.find((c) => c.id === conversationId);
    if (conversation && conversation.unread_staff_count > 0) {
      conversation.unread_staff_count = 0;
      await writeRuntimeDb(db);
    }
  });
}

export async function resetMockRuntimeDb(): Promise<void> {
  if (isSupabaseConfigured()) {
    throw new Error('Mock dataset reset is disabled while Supabase live persistence is enabled.');
  }
  await withLock(async () => {
    const fresh = createInitialState();
    await writeRuntimeDb(fresh);
  });
}

