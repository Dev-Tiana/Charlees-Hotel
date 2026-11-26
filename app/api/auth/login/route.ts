import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildSessionCookieHeader,
  signSessionToken,
  verifyPassword,
} from '@/lib/auth/session';
import { getStaffUserByEmail } from '@/lib/db/store';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please enter a valid staff email address and password.' },
        { status: 400 }
      );
    }

    const user = await getStaffUserByEmail(parsed.data.email);

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }
    if (user.employment_status !== 'active') {
      return NextResponse.json(
        { error: 'This staff account is currently suspended or inactive.' },
        { status: 403 }
      );
    }

    const valid = verifyPassword(parsed.data.password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
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
      { error: err instanceof Error ? err.message : 'Sign in failed.' },
      { status: 400 }
    );
  }
}
