-- ============================================================================
-- CHARLEES HOTEL & SUITES — CANCELLATION REQUESTS & LIVE CHAT MIGRATION
-- Migration: 002_cancellation_requests_and_chat.sql
-- ============================================================================

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN (
    'pending_payment',
    'confirmed',
    'checked_in',
    'checked_out',
    'cancellation_requested',
    'cancelled',
    'no_show'
  ));

ALTER TABLE public.cancellations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_staff_id UUID REFERENCES public.staff(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_status TEXT;

UPDATE public.hotel_settings
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(value, '{bankName}', '"GT Bank"'),
    '{bankAccountName}', '"Charlees Hotel & Suites"'
  ),
  '{bankAccountNumber}', '"0222817122"'
)
WHERE key = 'hotel_profile';

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  booking_reference TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  unread_staff_count INTEGER NOT NULL DEFAULT 0,
  unread_guest_count INTEGER NOT NULL DEFAULT 0,
  guest_token TEXT NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'staff')),
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages (conversation_id, created_at ASC);
