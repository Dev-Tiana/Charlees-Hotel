import { NextRequest, NextResponse } from 'next/server';
import { requireStaffPermission } from '@/lib/auth/session';
import { updateHotelSettingsAdmin } from '@/lib/db/store';

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'settings:manage');
    const body = await req.json();
    const updated = await updateHotelSettingsAdmin({
      settings: body,
      actor: { userId: session.userId, email: session.email, role: session.role },
    });
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to update settings.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
