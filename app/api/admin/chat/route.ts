import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/auth/session';
import {
  markStaffChatRead,
  replyStaffChat,
  setChatStatusStaff,
} from '@/lib/db/store';

const replySchema = z.object({
  action: z.literal('reply'),
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(1200),
});

const statusSchema = z.object({
  action: z.literal('set_status'),
  conversationId: z.string().min(1),
  status: z.enum(['open', 'resolved']),
});

const readSchema = z.object({
  action: z.literal('mark_read'),
  conversationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.action === 'reply') {
      const session = await requireStaffPermission(req, 'chat:reply');
      const parsed = replySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Reply message cannot be empty.' }, { status: 400 });
      }
      const res = await replyStaffChat({
        conversationId: parsed.data.conversationId,
        body: parsed.data.message,
        actor: {
          userId: session.userId,
          email: session.email,
          role: session.role,
          fullName: session.fullName,
        },
      });
      return NextResponse.json({ ok: true, ...res });
    }

    if (body?.action === 'set_status') {
      const session = await requireStaffPermission(req, 'chat:reply');
      const parsed = statusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid chat status.' }, { status: 400 });
      }
      const conversation = await setChatStatusStaff({
        conversationId: parsed.data.conversationId,
        status: parsed.data.status,
        actor: {
          userId: session.userId,
          email: session.email,
          role: session.role,
        },
      });
      return NextResponse.json({ ok: true, conversation });
    }

    if (body?.action === 'mark_read') {
      await requireStaffPermission(req, 'chat:view');
      const parsed = readSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid conversation id.' }, { status: 400 });
      }
      await markStaffChatRead(parsed.data.conversationId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid chat operation.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chat action failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
