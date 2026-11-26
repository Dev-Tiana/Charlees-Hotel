import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import { updateRoomCategoryAdmin, upsertPhysicalRoomAdmin } from '@/lib/db/store';

const physicalRoomSchema = z.object({
  type: z.literal('physical_room'),
  id: z.string().optional(),
  categoryId: z.string().min(1),
  roomNumber: z.string().trim().min(1).max(20),
  floorLabel: z.string().trim().min(1).max(60),
  operationalStatus: z.enum(['available', 'occupied', 'maintenance', 'blocked']),
  housekeepingStatus: z.enum(['clean', 'dirty', 'cleaning', 'inspected']),
  notes: z.string().max(400).optional(),
  isActive: z.boolean().optional(),
});

const categorySchema = z.object({
  type: z.literal('category'),
  id: z.string().min(1),
  nightly_rate_ngn: z.number().int().min(1000).optional(),
  short_description: z.string().max(400).optional(),
  editorial_description: z.string().max(1500).optional(),
  verified_amenities: z.array(z.string().trim().min(1)).optional(),
  max_guests_note: z.string().nullable().optional(),
  bed_configuration_note: z.string().nullable().optional(),
  dimensions_note: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'rooms:manage');
    const body = await req.json();

    if (body?.type === 'physical_room') {
      const parsed = physicalRoomSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid physical room data.' }, { status: 400 });
      }
      const room = await upsertPhysicalRoomAdmin({
        ...parsed.data,
        actor: { userId: session.userId, email: session.email, role: session.role },
      });
      return NextResponse.json({ ok: true, room });
    }

    if (body?.type === 'category') {
      const parsed = categorySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid room category configuration.' }, { status: 400 });
      }
      const category = await updateRoomCategoryAdmin({
        ...parsed.data,
        actor: { userId: session.userId, email: session.email, role: session.role },
      });
      return NextResponse.json({ ok: true, category });
    }

    return NextResponse.json({ error: 'Invalid room payload type.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Room update failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
