import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import { confirmPaymentRecord } from '@/lib/db/store';

const verifySchema = z.object({
  paymentId: z.string().min(1),
  method: z.enum(['online_paystack', 'bank_transfer', 'pos']).optional(),
  providerReference: z.string().max(120).optional(),
  notes: z.string().max(400).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'payments:verify');
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payment verification request.' }, { status: 400 });
    }

    const payment = await confirmPaymentRecord({
      paymentId: parsed.data.paymentId,
      method: parsed.data.method,
      providerReference: parsed.data.providerReference,
      notes: parsed.data.notes,
      staffActor: {
        userId: session.userId,
        staffId: session.staffId,
        email: session.email,
        role: session.role,
      },
    });

    return NextResponse.json({ ok: true, payment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment confirmation failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
