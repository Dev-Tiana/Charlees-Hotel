import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import { createOrUpdateHousekeepingTask } from '@/lib/db/store';

const hkSchema = z.object({
  id: z.string().optional(),
  physicalRoomId: z.string().optional(),
  taskType: z.enum(['turnover', 'daily_refresh', 'deep_clean', 'inspection']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'inspected']),
  assignedStaffId: z.string().nullable().optional(),
  notes: z.string().max(400).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'housekeeping:manage');
    const body = await req.json();
    const parsed = hkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid housekeeping payload.' }, { status: 400 });
    }
    const task = await createOrUpdateHousekeepingTask({
      ...parsed.data,
      actor: { userId: session.userId, email: session.email, role: session.role },
    });
    return NextResponse.json({ ok: true, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Housekeeping update failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
