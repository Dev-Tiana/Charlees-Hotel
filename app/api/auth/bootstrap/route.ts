import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildSessionCookieHeader,
  hashPassword,
  hasOwnerAccount,
  signSessionToken,
} from '@/lib/auth/session';
import { createOrBootstrapStaff } from '@/lib/db/store';

const bootstrapSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(120),
  passcode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ownerExists = await hasOwnerAccount();
    if (ownerExists) {
      return NextResponse.json(
        { error: 'Owner account has already been configured. Please sign in.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = bootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Provide your full name, valid email, and a password of at least 8 characters.' },
        { status: 400 }
      );
    }

    const requiredPasscode = process.env.ADMIN_BOOTSTRAP_PASSCODE;
    if (requiredPasscode && parsed.data.passcode !== requiredPasscode) {
      return NextResponse.json(
        { error: 'Bootstrap passcode does not match server configuration.' },
        { status: 403 }
      );
    }

    const staff = await createOrBootstrapStaff({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      roleSlug: 'owner',
      department: 'Executive Management',
      passwordHash: hashPassword(parsed.data.password),
    });

    const token = signSessionToken({
      userId: staff.user_id,
      staffId: staff.id,
      email: staff.email,
      fullName: staff.full_name,
      role: staff.role_slug,
    });

    const res = NextResponse.json({
      ok: true,
      session: {
        userId: staff.user_id,
        staffId: staff.id,
        email: staff.email,
        fullName: staff.full_name,
        role: staff.role_slug,
      },
      token,
    });
    res.headers.set('Set-Cookie', buildSessionCookieHeader(token));
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to initialize owner account.' },
      { status: 400 }
    );
  }
}
