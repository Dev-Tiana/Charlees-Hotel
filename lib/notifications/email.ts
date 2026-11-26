export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ status: 'sent' | 'skipped' | 'failed'; detail: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL || 'reservations@charleeshotel.com';

  if (!apiKey) {
    return {
      status: 'skipped',
      detail: 'Email provider key (RESEND_API_KEY) not configured; recorded in notification log.',
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { status: 'failed', detail: `Resend API error: ${body}` };
    }

    return { status: 'sent', detail: 'Email dispatched via Resend.' };
  } catch (err) {
    return {
      status: 'failed',
      detail: err instanceof Error ? err.message : 'Email request failed.',
    };
  }
}
