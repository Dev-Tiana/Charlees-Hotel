import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSnapshot,
  processRefundAdmin,
  updatePaymentProviderStatus,
} from '@/lib/db/store';
import {
  verifyPaystackSignature,
  verifyPaystackTransaction,
} from '@/lib/payments/paystack';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!verifyPaystackSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid Paystack signature.' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        reference?: string;
        transaction_reference?: string;
        id?: string | number;
        gateway_response?: string;
        metadata?: { booking_reference?: string };
      };
    };

    const eventType = event.event || '';
    const ref = event.data?.reference || '';

    if (eventType === 'charge.success' && ref) {
      await verifyPaystackTransaction({
        paystackReference: ref,
        expectedBookingReference: event.data?.metadata?.booking_reference,
      });
    } else if (eventType === 'charge.failed' && ref) {
      const snapshot = await getAdminSnapshot();
      const payment = snapshot.payments.find((p) => p.provider_reference === ref);
      if (payment) {
        await updatePaymentProviderStatus({
          paymentId: payment.id,
          status: 'failed',
          providerReference: ref,
          notes: `Webhook charge.failed: ${event.data?.gateway_response || 'Transaction declined'}.`,
        });
      }
    } else if (eventType === 'refund.processed' || eventType === 'refund.failed') {
      const txRef = event.data?.transaction_reference || ref;
      const snapshot = await getAdminSnapshot();
      const refund = snapshot.refunds.find(
        (r) =>
          (txRef && r.original_payment_reference === txRef) ||
          (event.data?.id && r.provider_refund_reference?.includes(String(event.data.id)))
      );
      if (refund) {
        await processRefundAdmin({
          refundId: refund.id,
          action: eventType === 'refund.processed' ? 'complete' : 'fail',
          providerRefundReference:
            eventType === 'refund.processed'
              ? refund.provider_refund_reference || `PAYSTACK-REFUND-${event.data?.id ?? Date.now()}`
              : undefined,
          failureReason:
            eventType === 'refund.failed'
              ? event.data?.gateway_response || 'Paystack reported refund failure.'
              : undefined,
          actor: {
            userId: 'system-paystack-webhook',
            staffId: 'system-paystack-webhook',
            email: 'paystack-webhook@charleeshotel.com',
            role: 'accountant',
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook handling error.' },
      { status: 400 }
    );
  }
}
