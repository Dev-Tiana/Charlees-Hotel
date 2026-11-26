import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordContactInquiry } from '@/lib/db/store';
import { sendTransactionalEmail } from '@/lib/notifications/email';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(5).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please complete all required fields in the contact form.' },
        { status: 400 }
      );
    }

    const notification = await recordContactInquiry(parsed.data);

    await sendTransactionalEmail({
      to: process.env.NOTIFICATION_FROM_EMAIL || 'reservations@charleeshotel.com',
      subject: `Website Inquiry: ${parsed.data.subject}`,
      html: `<p><strong>From:</strong> ${parsed.data.name} (${parsed.data.email})</p><p>${parsed.data.message}</p>`,
    });

    return NextResponse.json({ ok: true, id: notification.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to submit message.' },
      { status: 400 }
    );
  }
}
