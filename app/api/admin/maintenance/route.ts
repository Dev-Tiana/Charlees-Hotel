import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import { createOrUpdateMaintenanceIssue } from '@/lib/db/store';

const maintSchema = z.object({
  id: z.string().optional(),
  physicalRoomId: z.string().nullable().optional(),
  areaLabel: z.string().max(120).optional(),
  title: z.string().max(160).optional(),
  description: z.string().max(800).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  blocksRoom: z.boolean().optional(),
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
  assignedStaffId: z.string().nullable().optional(),
  resolutionNotes: z.string().max(800).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'maintenance:manage');
    const body = await req.json();
    const parsed = maintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid maintenance payload.' }, { status: 400 });
    }
    const issue = await createOrUpdateMaintenanceIssue({
      ...parsed.data,
      actor: { userId: session.userId, email: session.email, role: session.role },
    });
    return NextResponse.json({ ok: true, issue });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Maintenance update failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
