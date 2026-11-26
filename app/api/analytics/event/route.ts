import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordAnalyticsEvent } from '@/lib/db/store';

const eventSchema = z.object({
  event_name: z.string().trim().min(2).max(80),
  path: z.string().trim().min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await recordAnalyticsEvent(parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
