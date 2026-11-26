import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestReservationCancellation } from '@/lib/db/store';

const cancelRequestSchema = z.object({
  bookingReference: z.string().trim().min(4).max(40),
  guestEmail: z.string().trim().email().max(160),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = cancelRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please provide your booking reference, email, and reason for cancellation.' },
        { status: 400 }
      );
    }

    const result = await requestReservationCancellation({
      bookingReference: parsed.data.bookingReference,
      guestEmail: parsed.data.guestEmail,
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      ok: true,
      reservation: result.reservation,
      cancellation: result.cancellation,
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
