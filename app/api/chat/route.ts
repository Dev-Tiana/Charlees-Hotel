import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getGuestChatThread,
  sendGuestChatMessage,
  startOrGetGuestChat,
} from '@/lib/db/store';

const startSchema = z.object({
  action: z.literal('start'),
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email().max(160),
  bookingReference: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(1200),
});

const replySchema = z.object({
  action: z.literal('reply'),
  conversationId: z.string().min(1),
  token: z.string().min(10),
  message: z.string().trim().min(1).max(1200),
});

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId') || '';
    const token = req.nextUrl.searchParams.get('token') || '';
    if (!conversationId || !token) {
      return NextResponse.json(
        { error: 'Conversation credentials required.' },
        { status: 400 }
      );
    }

    const thread = await getGuestChatThread({ conversationId, guestToken: token });
    if (!thread) {
      return NextResponse.json(
        { error: 'Chat session not found or unauthorized.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      conversation: {
        id: thread.conversation.id,
        guest_name: thread.conversation.guest_name,
        guest_email: thread.conversation.guest_email,
        booking_reference: thread.conversation.booking_reference,
        status: thread.conversation.status,
        last_message_at: thread.conversation.last_message_at,
      },
      messages: thread.messages,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to fetch chat.' },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.action === 'start') {
      const parsed = startSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Please provide your name, email address, and message.' },
          { status: 400 }
        );
      }
      const res = await startOrGetGuestChat({
        guestName: parsed.data.guestName,
        guestEmail: parsed.data.guestEmail,
        bookingReference: parsed.data.bookingReference,
        initialMessage: parsed.data.message,
      });

      return NextResponse.json(
        {
          conversation: {
            id: res.conversation.id,
            guest_name: res.conversation.guest_name,
            guest_email: res.conversation.guest_email,
            booking_reference: res.conversation.booking_reference,
            status: res.conversation.status,
            last_message_at: res.conversation.last_message_at,
          },
          guestToken: res.conversation.guest_token,
          messages: res.messages,
        },
        { status: 201 }
      );
    }

    if (body?.action === 'reply') {
      const parsed = replySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid chat message.' }, { status: 400 });
      }
      const res = await sendGuestChatMessage({
        conversationId: parsed.data.conversationId,
        guestToken: parsed.data.token,
        body: parsed.data.message,
      });

      return NextResponse.json({
        conversation: {
          id: res.conversation.id,
          guest_name: res.conversation.guest_name,
          guest_email: res.conversation.guest_email,
          booking_reference: res.conversation.booking_reference,
          status: res.conversation.status,
          last_message_at: res.conversation.last_message_at,
        },
        messages: res.messages,
      });
    }

    return NextResponse.json({ error: 'Unsupported chat action.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to send chat message.';
    const status = msg.toLowerCase().includes('unauthorized') ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
