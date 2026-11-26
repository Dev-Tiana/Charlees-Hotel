import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestReservationCancellation } from '@/lib/db/store';

const cancelRequestSchema = z.object({
  bookingReference: z.string().trim().min(4).max(40),
  guestEmail: z.string().trim().email().max(160),
  reason: z.string().trim().min(3).max(500),
  refundAccountName: z.string().trim().min(2, 'Refund account name is required.').max(120),
  refundBankName: z.string().trim().min(2, 'Refund bank name is required.').max(120),
  refundAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/, 'Please enter a valid numeric bank account number (6 to 20 digits).'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = cancelRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message;
      return NextResponse.json(
        {
          error:
            firstIssue ||
            'Please provide your booking reference, email, cancellation reason, and refund bank details.',
        },
        { status: 400 }
      );
    }

    const result = await requestReservationCancellation({
      bookingReference: parsed.data.bookingReference,
      guestEmail: parsed.data.guestEmail,
      reason: parsed.data.reason,
      refundAccountName: parsed.data.refundAccountName,
      refundBankName: parsed.data.refundBankName,
      refundAccountNumber: parsed.data.refundAccountNumber,
    });

    return NextResponse.json({
      ok: true,
      reservation: result.reservation,
      cancellation: {
        ...result.cancellation,
        refund_account_number: result.cancellation.refund_account_number
          ? `••••${result.cancellation.refund_account_number.slice(-4)}`
          : null,
      },
      message:
        'Your cancellation request has been submitted and is pending review by Charlees Hotel & Suites.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to submit cancellation request.' },
      { status: 400 }
    );
  }
}
