import { NextRequest, NextResponse } from 'next/server';
import { requireStaffPermission } from '@/lib/auth/session';
import { getAdminSnapshot, getStaffUsers } from '@/lib/db/store';

export async function GET(req: NextRequest) {
  try {
    await requireStaffPermission(req, 'dashboard:view');
    const [snapshot, staff] = await Promise.all([getAdminSnapshot(), getStaffUsers()]);
    const sanitizedStaff = staff.map(({ password_hash: _ph, ...rest }) => rest);
    return NextResponse.json({
      ...snapshot,
      staff: sanitizedStaff,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    const status = msg === 'FORBIDDEN' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
