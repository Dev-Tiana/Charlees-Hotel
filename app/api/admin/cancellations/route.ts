import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import { reviewCancellationRequestAdmin } from '@/lib/db/store';

const reviewSchema = z.object({
  cancellationId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  decisionReason: z.string().trim().max(400).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'cancellations:review');
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid cancellation review request.' },
        { status: 400 }
      );
    }

    const result = await reviewCancellationRequestAdmin({
      cancellationId: parsed.data.cancellationId,
      decision: parsed.data.decision,
      decisionReason: parsed.data.decisionReason,
      actor: {
        userId: session.userId,
        staffId: session.staffId,
        email: session.email,
        role: session.role,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to review cancellation request.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
