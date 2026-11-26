import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import {
  cancelReservation,
  confirmPaymentRecord,
  createReservation,
  updateReservationAdmin,
} from '@/lib/db/store';

const createStaffBookingSchema = z.object({
  action: z.literal('create'),
  categorySlug: z.string().min(2),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(6),
  children: z.number().int().min(0).max(6).default(0),
  guestName: z.string().trim().min(2),
  guestEmail: z.string().trim().email(),
  guestPhone: z.string().trim().min(7),
  specialRequests: z.string().optional(),
  paymentMethod: z.enum(['pos', 'bank_transfer', 'online_paystack']),
  markPaidImmediately: z.boolean().optional(),
  bookingSource: z.enum(['front_desk', 'phone']).default('front_desk'),
});

const updateSchema = z.object({
  action: z.literal('update'),
  reservationId: z.string().min(1),
  status: z
    .enum([
      'pending_payment',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancellation_requested',
      'cancelled',
      'no_show',
    ])
    .optional(),
  physicalRoomId: z.string().optional(),
  specialRequests: z.string().optional(),
});

const cancelSchema = z.object({
  action: z.literal('cancel'),
  bookingReference: z.string().min(3),
  reason: z.string().min(3),
  overrideException: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.action === 'create') {
      const session = await requireStaffPermission(req, 'reservations:manage');
      const parsed = createStaffBookingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid reservation fields.' }, { status: 400 });
      }
      const created = await createReservation({
        ...parsed.data,
        staffActor: { userId: session.userId, email: session.email, role: session.role },
      });

      if (parsed.data.markPaidImmediately && parsed.data.paymentMethod === 'pos') {
        await confirmPaymentRecord({
          paymentId: created.payment.id,
          method: parsed.data.paymentMethod,
          notes: 'POS terminal card payment confirmed at front desk.',
          staffActor: {
            userId: session.userId,
            staffId: session.staffId,
            email: session.email,
            role: session.role,
          },
        });
      }

      return NextResponse.json({ ok: true, ...created }, { status: 201 });
    }

    if (body?.action === 'update') {
      const session = await requireStaffPermission(req, 'reservations:manage');
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid update payload.' }, { status: 400 });
      }
      const updated = await updateReservationAdmin({
        reservationId: parsed.data.reservationId,
        status: parsed.data.status,
        physicalRoomId: parsed.data.physicalRoomId,
        specialRequests: parsed.data.specialRequests,
        actor: {
          userId: session.userId,
          staffId: session.staffId,
          email: session.email,
          role: session.role,
        },
      });
      return NextResponse.json({ ok: true, reservation: updated });
    }

    if (body?.action === 'cancel') {
      const parsed = cancelSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Reason and booking reference required.' }, { status: 400 });
      }
      const session = await requireStaffPermission(
        req,
        parsed.data.overrideException ? 'reservations:cancel_override' : 'reservations:manage'
      );
      const result = await cancelReservation({
        bookingReference: parsed.data.bookingReference,
        reason: parsed.data.reason,
        cancelledByType: 'staff',
        overrideException: parsed.data.overrideException,
        staffActor: {
          userId: session.userId,
          staffId: session.staffId,
          email: session.email,
          role: session.role,
        },
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: 'Invalid reservation action.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Operation failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
