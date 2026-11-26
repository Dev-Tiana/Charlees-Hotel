-- ============================================================================
-- CHARLEES HOTEL & SUITES — SUPABASE POSTGRESQL AUTHORITATIVE SCHEMA
-- Migration: 001_initial_schema.sql
-- Covers all 18 core tables, relational integrity, atomic double-booking
-- prevention, cancellation & refund tracking, RBAC, audit logs, and RLS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 2. USERS & STAFF
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  department TEXT NOT NULL DEFAULT 'Operations',
  employment_status TEXT NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GUESTS
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  nationality TEXT DEFAULT 'Nigerian',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guests_email ON public.guests (LOWER(email));

-- 4. ROOM CATEGORIES & PHYSICAL ROOMS
CREATE TABLE IF NOT EXISTS public.room_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  nightly_rate_ngn INTEGER NOT NULL CHECK (nightly_rate_ngn > 0),
  short_description TEXT NOT NULL DEFAULT '',
  editorial_description TEXT NOT NULL DEFAULT '',
  verified_amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_guests_note TEXT,
  bed_configuration_note TEXT,
  dimensions_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.physical_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.room_categories(id) ON DELETE RESTRICT,
  room_number TEXT UNIQUE NOT NULL,
  floor_label TEXT NOT NULL DEFAULT 'Ground Floor',
  operational_status TEXT NOT NULL DEFAULT 'available' CHECK (operational_status IN ('available', 'occupied', 'maintenance', 'blocked')),
  housekeeping_status TEXT NOT NULL DEFAULT 'inspected' CHECK (housekeeping_status IN ('clean', 'dirty', 'cleaning', 'inspected')),
  notes TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. RESERVATIONS & RESERVATION GUESTS
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL,
  category_id UUID NOT NULL REFERENCES public.room_categories(id),
  physical_room_id UUID REFERENCES public.physical_rooms(id),
  primary_guest_id UUID NOT NULL REFERENCES public.guests(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights > 0),
  adults INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
  children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  nightly_rate_ngn INTEGER NOT NULL CHECK (nightly_rate_ngn > 0),
  total_amount_ngn INTEGER NOT NULL CHECK (total_amount_ngn > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'partially_refunded', 'refunded')),
  booking_source TEXT NOT NULL DEFAULT 'website' CHECK (booking_source IN ('website', 'front_desk', 'phone')),
  special_requests TEXT DEFAULT '',
  cancellation_deadline_at TIMESTAMPTZ NOT NULL,
  is_same_day_booking BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_valid_dates CHECK (check_out_date > check_in_date)
);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations (check_in_date, check_out_date, status);
CREATE INDEX IF NOT EXISTS idx_reservations_ref ON public.reservations (booking_reference);

CREATE TABLE IF NOT EXISTS public.reservation_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  id_type TEXT,
  id_reference TEXT
);

-- 6. PAYMENTS, CANCELLATIONS & REFUNDS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount_ngn INTEGER NOT NULL CHECK (amount_ngn > 0),
  method TEXT NOT NULL CHECK (method IN ('online_paystack', 'bank_transfer', 'cash', 'pos')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_verification', 'confirmed', 'failed', 'refunded')),
  provider_reference TEXT,
  bank_transfer_sender TEXT,
  bank_transfer_reference TEXT,
  verified_by_staff_id UUID REFERENCES public.staff(id),
  verified_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID UNIQUE NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  cancelled_by_type TEXT NOT NULL CHECK (cancelled_by_type IN ('guest', 'staff')),
  cancelled_by_staff_id UUID REFERENCES public.staff(id),
  reason TEXT NOT NULL,
  was_within_policy BOOLEAN NOT NULL,
  is_exception_override BOOLEAN NOT NULL DEFAULT FALSE,
  policy_deadline_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  cancellation_id UUID REFERENCES public.cancellations(id) ON DELETE SET NULL,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  idempotency_key TEXT UNIQUE NOT NULL,
  eligible BOOLEAN NOT NULL DEFAULT FALSE,
  amount_ngn INTEGER NOT NULL CHECK (amount_ngn >= 0),
  original_payment_reference TEXT,
  request_status TEXT NOT NULL DEFAULT 'requested' CHECK (request_status IN ('requested', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  provider_refund_reference TEXT,
  failure_reason TEXT,
  approved_by_staff_id UUID REFERENCES public.staff(id),
  processed_by_staff_id UUID REFERENCES public.staff(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT DEFAULT ''
);

-- 7. HOUSEKEEPING & MAINTENANCE
CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physical_room_id UUID NOT NULL REFERENCES public.physical_rooms(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'turnover' CHECK (task_type IN ('turnover', 'daily_refresh', 'deep_clean', 'inspection')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'inspected')),
  assigned_staff_id UUID REFERENCES public.staff(id),
  notes TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  inspected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physical_room_id UUID REFERENCES public.physical_rooms(id) ON DELETE SET NULL,
  area_label TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  blocks_room BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  assigned_staff_id UUID REFERENCES public.staff(id),
  resolution_notes TEXT DEFAULT '',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. MEDIA, NOTIFICATIONS, AUDIT LOGS & HOTEL SETTINGS
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  section_key TEXT NOT NULL,
  category_slug TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  drive_file_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by_staff_id UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('guest', 'staff')),
  recipient_email TEXT,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email')),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sent', 'failed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.hotel_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by_user_id UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SEED VERIFIED ROOM CATEGORIES & DEFAULT SETTINGS
-- ============================================================================
INSERT INTO public.room_categories (slug, name, nightly_rate_ngn, short_description, editorial_description, sort_order)
VALUES
  ('standard-room', 'Standard Room', 60000, 'Calm white interiors with thoughtful proportions for restful solo or business stays in Abraka.', 'Designed for quiet rest after travel or work in Abraka, the Standard Room pairs crisp white surfaces with warm wood tones and natural daylight.', 1),
  ('twin-room', 'Twin Room', 70000, 'Balanced dual sleeping layout suited to colleagues, friends, and visiting academics.', 'Configured for shared stays without sacrificing personal space, the Twin Room offers balanced natural light and calm residential proportions.', 2),
  ('deluxe-room', 'Deluxe Room', 70000, 'Generous floor plan with refined seating and quiet architectural framing.', 'With additional living space and serene interior finishes, the Deluxe Room welcomes longer Abraka stays with effortless composure.', 3),
  ('luxury-room', 'Luxury Room', 80000, 'Our premier accommodation tier featuring expansive proportions and signature finishes.', 'Positioned as the flagship room tier at Charlees Hotel & Suites, the Luxury Room brings together spacious proportions, quiet privacy, and refined detail.', 4)
ON CONFLICT (slug) DO NOTHING;

-- Seed default roles
INSERT INTO public.roles (slug, name, description) VALUES
  ('owner', 'Owner', 'Full ownership control over all hotel operations, finance, and staff'),
  ('administrator', 'Administrator', 'Full system administration and operational oversight'),
  ('manager', 'Manager', 'Daily hotel operations, reservations, refunds, and housekeeping oversight'),
  ('receptionist', 'Receptionist', 'Front desk reservations, check ins, check outs, and cash/transfer recording'),
  ('accountant', 'Accountant', 'Payment verification, financial summaries, and refund reconciliation'),
  ('housekeeping', 'Housekeeping', 'Room cleaning queue and inspection readiness updates')
ON CONFLICT (slug) DO NOTHING;

-- Seed initial hotel settings (distinguishing confirmed vs pending confirmation)
INSERT INTO public.hotel_settings (key, value) VALUES
  ('hotel_profile', '{"name":"Charlees Hotel & Suites","address":"No. 2 Lawson Obi Street, behind O2 Arena, before Benin Junction, Abraka, Delta State, Nigeria","timezone":"Africa/Lagos","currency":"NGN","phone":"","whatsapp":"","email":"reservations@charleeshotel.com","checkInTimeNote":"Pending management confirmation","checkOutTimeNote":"Pending management confirmation","diningStatusNote":"Dining service details and hours are awaiting management confirmation"}'::jsonb),
  ('cancellation_policy', '{"advanceDaysRequired":1,"sameDayWindowMinutes":60,"refundPercentageOnEligible":100,"refundPercentageConfirmedByManagement":false,"refundTimelineNote":"Refund processing duration requires management confirmation","allowManagerExceptionOverride":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Note: Server-side Next.js API routes verify authorization using the
-- Supabase service role key, while public anonymous clients only read
-- non-sensitive published hotel metadata and media.
-- ============================================================================
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active room categories" ON public.room_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view published media" ON public.media_assets
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Public can view non-secret hotel settings" ON public.hotel_settings
  FOR SELECT USING (key IN ('hotel_profile', 'cancellation_policy', 'branding'));

-- Prevent direct updates/deletes on audit logs by non-service roles
CREATE POLICY "No public audit log access" ON public.audit_logs
  FOR ALL USING (FALSE);

-- ============================================================================
-- ATOMIC RESERVATION FUNCTION (Prevents Double Booking Under Concurrency)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
  p_booking_reference TEXT,
  p_category_id UUID,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER,
  p_children INTEGER,
  p_booking_source TEXT,
  p_special_requests TEXT,
  p_payment_method TEXT,
  p_cancellation_deadline TIMESTAMPTZ,
  p_is_same_day BOOLEAN
)
RETURNS TABLE (
  reservation_id UUID,
  assigned_room_id UUID,
  assigned_room_number TEXT,
  total_amount INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate INTEGER;
  v_nights INTEGER;
  v_room_id UUID;
  v_room_number TEXT;
  v_guest_id UUID;
  v_res_id UUID;
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check out date must be after check in date';
  END IF;

  SELECT nightly_rate_ngn INTO v_rate
  FROM public.room_categories
  WHERE id = p_category_id AND is_active = TRUE;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Selected room category is unavailable';
  END IF;

  v_nights := (p_check_out - p_check_in);

  -- Lock candidate physical rooms in this category to prevent race condition double-booking
  SELECT pr.id, pr.room_number INTO v_room_id, v_room_number
  FROM public.physical_rooms pr
  WHERE pr.category_id = p_category_id
    AND pr.is_active = TRUE
    AND pr.operational_status NOT IN ('maintenance', 'blocked')
    AND NOT EXISTS (
      SELECT 1 FROM public.maintenance_issues mi
      WHERE mi.physical_room_id = pr.id
        AND mi.blocks_room = TRUE
        AND mi.status <> 'resolved'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.physical_room_id = pr.id
        AND r.status IN ('pending_payment', 'confirmed', 'checked_in')
        AND r.check_in_date < p_check_out
        AND r.check_out_date > p_check_in
    )
  ORDER BY pr.room_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'No physical rooms available in this category for the selected dates';
  END IF;

  INSERT INTO public.guests (full_name, email, phone)
  VALUES (p_guest_name, p_guest_email, p_guest_phone)
  RETURNING id INTO v_guest_id;

  INSERT INTO public.reservations (
    booking_reference, category_id, physical_room_id, primary_guest_id,
    check_in_date, check_out_date, nights, adults, children,
    nightly_rate_ngn, total_amount_ngn, status, payment_status,
    booking_source, special_requests, cancellation_deadline_at, is_same_day_booking
  )
  VALUES (
    p_booking_reference, p_category_id, v_room_id, v_guest_id,
    p_check_in, p_check_out, v_nights, p_adults, p_children,
    v_rate, v_rate * v_nights,
    CASE WHEN p_payment_method = 'online_paystack' THEN 'pending_payment' ELSE 'pending_payment' END,
    'unpaid',
    p_booking_source, COALESCE(p_special_requests, ''), p_cancellation_deadline, p_is_same_day
  )
  RETURNING id INTO v_res_id;

  INSERT INTO public.reservation_guests (reservation_id, full_name, is_primary)
  VALUES (v_res_id, p_guest_name, TRUE);

  INSERT INTO public.payments (reservation_id, amount_ngn, method, status)
  VALUES (v_res_id, v_rate * v_nights, p_payment_method, 'pending');

  RETURN QUERY SELECT v_res_id, v_room_id, v_room_number, (v_rate * v_nights);
END;
$$;
