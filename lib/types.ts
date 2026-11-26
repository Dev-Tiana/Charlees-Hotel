export type RoleSlug =
  | 'owner'
  | 'administrator'
  | 'manager'
  | 'receptionist'
  | 'accountant'
  | 'housekeeping';

export type ReservationStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancellation_requested'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'paid'
  | 'partially_refunded'
  | 'refunded';

export type PaymentMethod =
  | 'online_paystack'
  | 'bank_transfer'
  | 'cash'
  | 'pos';

export type CancellationRequestStatus = 'requested' | 'approved' | 'rejected';

export type RefundRequestStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed';

export type OperationalRoomStatus =
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'blocked';

export type HousekeepingStatus =
  | 'clean'
  | 'dirty'
  | 'cleaning'
  | 'inspected';

export interface RoomCategory {
  id: string;
  slug: string;
  name: string;
  nightly_rate_ngn: number;
  short_description: string;
  editorial_description: string;
  verified_amenities: string[];
  max_guests_note: string | null;
  bed_configuration_note: string | null;
  dimensions_note: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PhysicalRoom {
  id: string;
  category_id: string;
  room_number: string;
  floor_label: string;
  operational_status: OperationalRoomStatus;
  housekeeping_status: HousekeepingStatus;
  notes: string;
  is_active: boolean;
  updated_at: string;
}

export interface Guest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string | null;
  nationality?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  booking_reference: string;
  category_id: string;
  physical_room_id: string | null;
  primary_guest_id: string;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  nightly_rate_ngn: number;
  total_amount_ngn: number;
  currency: 'NGN';
  status: ReservationStatus;
  payment_status: PaymentStatus;
  booking_source: 'website' | 'front_desk' | 'phone';
  special_requests: string;
  cancellation_deadline_at: string;
  is_same_day_booking: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  reservation_id: string;
  amount_ngn: number;
  method: PaymentMethod;
  status: 'pending' | 'pending_verification' | 'confirmed' | 'failed' | 'refunded';
  provider_reference: string | null;
  bank_transfer_sender: string | null;
  bank_transfer_reference: string | null;
  verified_by_staff_id: string | null;
  verified_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CancellationRecord {
  id: string;
  reservation_id: string;
  cancelled_by_type: 'guest' | 'staff';
  cancelled_by_staff_id: string | null;
  reason: string;
  was_within_policy: boolean;
  is_exception_override: boolean;
  policy_deadline_at: string;
  cancelled_at: string;
  status: CancellationRequestStatus;
  decision_reason?: string | null;
  reviewed_by_staff_id?: string | null;
  reviewed_at?: string | null;
  previous_status?: ReservationStatus | null;
}

export interface RefundRecord {
  id: string;
  reservation_id: string;
  cancellation_id: string | null;
  payment_id: string;
  idempotency_key: string;
  eligible: boolean;
  amount_ngn: number;
  original_payment_reference: string | null;
  request_status: RefundRequestStatus;
  provider_refund_reference: string | null;
  failure_reason: string | null;
  approved_by_staff_id: string | null;
  processed_by_staff_id: string | null;
  requested_at: string;
  completed_at: string | null;
  notes: string;
}

export interface HousekeepingTask {
  id: string;
  physical_room_id: string;
  task_type: 'turnover' | 'daily_refresh' | 'deep_clean' | 'inspection';
  status: 'pending' | 'in_progress' | 'completed' | 'inspected';
  assigned_staff_id: string | null;
  notes: string;
  completed_at: string | null;
  inspected_at: string | null;
  created_at: string;
}

export interface MaintenanceIssue {
  id: string;
  physical_room_id: string | null;
  area_label: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  blocks_room: boolean;
  status: 'open' | 'in_progress' | 'resolved';
  assigned_staff_id: string | null;
  resolution_notes: string;
  resolved_at: string | null;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  alt_text: string;
  media_type: 'image' | 'video';
  section_key:
    | 'logo'
    | 'hero'
    | 'exterior'
    | 'room_standard'
    | 'room_twin'
    | 'room_deluxe'
    | 'room_luxury'
    | 'pool'
    | 'rooftop'
    | 'dining'
    | 'abraka'
    | 'gallery';
  category_slug: string | null;
  storage_path: string;
  public_url: string;
  poster_url?: string;
  object_position?: 'center' | 'center-lower' | 'right-mid' | 'top-mid';
  drive_file_id: string | null;
  sort_order: number;
  is_published: boolean;
  uploaded_by_staff_id: string | null;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  recipient_type: 'guest' | 'staff';
  recipient_email: string | null;
  channel: 'in_app' | 'email';
  event_type: string;
  title: string;
  message: string;
  related_reservation_id: string | null;
  is_read: boolean;
  delivery_status: 'queued' | 'sent' | 'failed' | 'skipped';
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface StaffUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role_slug: RoleSlug;
  role_name: string;
  department: string;
  employment_status: 'active' | 'suspended' | 'inactive';
  password_hash?: string | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  guest_name: string;
  guest_email: string;
  booking_reference: string | null;
  status: 'open' | 'resolved';
  unread_staff_count: number;
  unread_guest_count: number;
  guest_token: string;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'guest' | 'staff';
  sender_name: string;
  body: string;
  created_at: string;
}

export interface HotelSettings {
  hotel_profile: {
    name: string;
    address: string;
    timezone: string;
    currency: string;
    phone: string;
    whatsapp: string;
    email: string;
    checkInTimeNote: string;
    checkOutTimeNote: string;
    diningStatusNote: string;
    diningEnabled: boolean;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    googleDriveFolderUrl: string;
  };
  cancellation_policy: {
    advanceDaysRequired: number;
    sameDayWindowMinutes: number;
    refundPercentageOnEligible: number;
    refundPercentageConfirmedByManagement: boolean;
    refundTimelineNote: string;
    allowManagerExceptionOverride: boolean;
  };
  analytics: {
    gaMeasurementId: string;
    searchConsoleVerification: string;
  };
}

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  path: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FacilityItem {
  id: string;
  slug: 'swimming-pool' | 'rooftop-lounge' | 'dining-refreshments';
  name: string;
  eyebrow: string;
  section_key: MediaAsset['section_key'];
  summary: string;
  operating_hours: string;
  access_note: string;
  capacity_note: string;
  highlights: string[];
}
