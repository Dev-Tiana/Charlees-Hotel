import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitBankTransferProof } from '@/lib/db/store';
import { verifyPaystackTransaction } from '@/lib/payments/paystack';

const bankProofSchema = z.object({
  mode: z.literal('bank_transfer'),
  bookingReference: z.string().trim().min(4),
  senderName: z.string().trim().min(2).max(120),
  transferReference: z.string().trim().min(3).max(120),
});

const paystackVerifySchema = z.object({
  mode: z.literal('online_paystack'),
  bookingReference: z.string().trim().min(4).optional(),
  paystackReference: z.string().trim().min(4),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.mode === 'bank_transfer') {
      const parsed = bankProofSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Please provide the sender name and bank transfer reference.' },
          { status: 400 }
        );
      }

      const payment = await submitBankTransferProof({
        bookingReference: parsed.data.bookingReference,
        senderName: parsed.data.senderName,
        transferReference: parsed.data.transferReference,
      });

      return NextResponse.json({
        ok: true,
        payment,
        message:
          'Bank transfer details submitted. Your booking remains Payment Pending Confirmation until our team verifies receipt into GT Bank (0222817122).',
      });
    }

    if (body?.mode === 'online_paystack') {
      const parsed = paystackVerifySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payment reference.' }, { status: 400 });
      }

      const outcome = await verifyPaystackTransaction({
        paystackReference: parsed.data.paystackReference,
        expectedBookingReference: parsed.data.bookingReference,
      });

      if (outcome.status === 'unconfigured') {
        return NextResponse.json({ error: outcome.message, outcome }, { status: 422 });
      }
      if (!outcome.verified) {
        return NextResponse.json({ error: outcome.message, outcome }, { status: 400 });
      }

      return NextResponse.json({ ok: true, outcome });
    }

    return NextResponse.json({ error: 'Unsupported payment verification mode.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment verification failed.' },
      { status: 400 }
    );
  }
}
