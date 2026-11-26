import { NextRequest, NextResponse } from 'next/server';
import { requireStaffPermission } from '@/lib/auth/session';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export async function POST(req: NextRequest) {
  if (!HotelDataService.isDevelopmentMockMode()) {
    return NextResponse.json(
      { error: 'Mock data reset is unavailable while Supabase live mode is enabled.' },
      { status: 403 }
    );
  }

  try {
    await requireStaffPermission(req, 'dashboard:view');
    await HotelDataService.resetMockRuntimeDb();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to reset mock dataset.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
