import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildSessionCookieHeader, signSessionToken } from '@/lib/auth/session';
import { HotelDataService } from '@/lib/services/hotel-data-service';

const devPreviewSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: NextRequest) {
  if (!HotelDataService.isDevelopmentMockMode()) {
    return NextResponse.json(
      { error: 'Development mode role preview is disabled when live Supabase is active.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = devPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Select a valid preview staff account.' }, { status: 400 });
    }

    const user = await HotelDataService.getStaffUserByEmail(parsed.data.email);
    if (!user) {
      return NextResponse.json({ error: 'Preview staff profile not found.' }, { status: 404 });
    }

    const token = signSessionToken({
      userId: user.user_id,
      staffId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role_slug,
    });

    const res = NextResponse.json({
      ok: true,
      developmentMode: true,
      session: {
        userId: user.user_id,
        staffId: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role_slug,
      },
      token,
    });
    res.headers.set('Set-Cookie', buildSessionCookieHeader(token));
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to start preview session.' },
      { status: 400 }
    );
  }
}
