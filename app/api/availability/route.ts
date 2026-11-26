import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAvailability } from '@/lib/db/store';
import { getLagosDateString } from '@/lib/timezone';

const querySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  try {
    const checkIn = req.nextUrl.searchParams.get('checkIn') || '';
    const checkOut = req.nextUrl.searchParams.get('checkOut') || '';
    const parsed = querySchema.safeParse({ checkIn, checkOut });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please provide valid check in and check out dates in YYYY-MM-DD format.' },
        { status: 400 }
      );
    }

    const todayLagos = getLagosDateString();
    if (parsed.data.checkIn < todayLagos) {
      return NextResponse.json(
        { error: 'Check in date cannot be in the past.' },
        { status: 400 }
      );
    }

    const availability = await checkAvailability(parsed.data.checkIn, parsed.data.checkOut);
    return NextResponse.json({
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      timezone: 'Africa/Lagos',
      availability,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to check availability.' },
      { status: 400 }
    );
  }
}
