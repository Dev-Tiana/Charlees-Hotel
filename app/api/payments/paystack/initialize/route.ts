import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  initializePaystackCheckout,
  isPaystackServerConfigured,
} from '@/lib/payments/paystack';

const initSchema = z.object({
  bookingReference: z.string().trim().min(4).max(40),
  guestEmail: z.string().trim().email().max(160),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = initSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Valid booking reference and guest email are required to initialize payment.' },
        { status: 400 }
      );
    }

    if (!isPaystackServerConfigured()) {
      return NextResponse.json(
        {
          error:
            'Paystack online payment is not active because PAYSTACK_SECRET_KEY is not configured on the server. Please complete payment via Bank Transfer to GT Bank (0222817122).',
        },
        { status: 422 }
      );
    }

    const rawOrigin = process.env.APP_URL?.trim() || req.nextUrl.origin;
    const baseOrigin = rawOrigin.replace(/\/+$/, '');
    const callbackUrl = `${baseOrigin}/booking/confirmation?ref=${encodeURIComponent(
      parsed.data.bookingReference.trim().toUpperCase()
    )}&email=${encodeURIComponent(parsed.data.guestEmail.trim().toLowerCase())}&gateway=paystack`;

    const init = await initializePaystackCheckout({
      bookingReference: parsed.data.bookingReference,
      guestEmail: parsed.data.guestEmail,
      callbackUrl,
    });

    return NextResponse.json({
      ok: true,
      authorizationUrl: init.authorizationUrl,
      accessCode: init.accessCode,
      reference: init.reference,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to initialize Paystack checkout.' },
      { status: 400 }
    );
  }
}
