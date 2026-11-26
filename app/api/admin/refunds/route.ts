import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import { processRefundAdmin } from '@/lib/db/store';

const refundSchema = z.object({
  refundId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'mark_processing', 'complete', 'fail']),
  providerRefundReference: z.string().max(120).optional(),
  failureReason: z.string().max(300).optional(),
  notes: z.string().max(400).optional(),
  attemptPaystackRefund: z.boolean().optional(),
  originalPaymentReference: z.string().optional(),
  amountNgn: z.number().optional(),
  refundDate: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid refund request payload.' }, { status: 400 });
    }

    const permission =
      parsed.data.action === 'approve' || parsed.data.action === 'reject'
        ? 'refunds:approve'
        : 'refunds:process';
    const session = await requireStaffPermission(req, permission);

    let providerRef = parsed.data.providerRefundReference;
    let action = parsed.data.action;
    let failureReason = parsed.data.failureReason;

    if (
      parsed.data.attemptPaystackRefund &&
      parsed.data.originalPaymentReference &&
      process.env.PAYSTACK_SECRET_KEY
    ) {
      const psRes = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: parsed.data.originalPaymentReference,
          amount: parsed.data.amountNgn ? parsed.data.amountNgn * 100 : undefined,
        }),
      });
      const psJson = (await psRes.json()) as {
        status?: boolean;
        message?: string;
        data?: { id?: number | string; status?: string };
      };
      if (!psRes.ok || !psJson.status) {
        action = 'fail';
        failureReason = psJson.message || 'Paystack refund API returned an error.';
      } else {
        const providerState = String(psJson.data?.status || '').toLowerCase();
        action = providerState === 'processed' ? 'complete' : 'mark_processing';
        providerRef = `PSK-REF-${psJson.data?.id ?? Date.now()}`;
      }
    }

    const refund = await processRefundAdmin({
      refundId: parsed.data.refundId,
      action,
      providerRefundReference: providerRef,
      failureReason,
      notes: parsed.data.notes,
      refundDate: parsed.data.refundDate,
      actor: {
        userId: session.userId,
        staffId: session.staffId,
        email: session.email,
        role: session.role,
      },
    });

    return NextResponse.json({ ok: true, refund });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Refund processing failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
