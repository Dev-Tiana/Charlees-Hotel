import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, requireStaffPermission } from '@/lib/auth/session';
import { createOrBootstrapStaff } from '@/lib/db/store';

const staffSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  roleSlug: z.enum([
    'owner',
    'administrator',
    'manager',
    'receptionist',
    'accountant',
    'housekeeping',
  ]),
  department: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(120),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'staff:manage');
    const body = await req.json();
    const parsed = staffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Provide valid staff details and a password of at least 8 characters.' },
        { status: 400 }
      );
    }

    const created = await createOrBootstrapStaff({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      roleSlug: parsed.data.roleSlug,
      department: parsed.data.department,
      passwordHash: hashPassword(parsed.data.password),
      actor: { userId: session.userId, email: session.email, role: session.role },
    });

    const { password_hash: _ph, ...safeStaff } = created;
    return NextResponse.json({ ok: true, staff: safeStaff }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to create staff member.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
