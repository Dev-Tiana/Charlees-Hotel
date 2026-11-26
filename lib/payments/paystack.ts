import crypto from 'crypto';
import {
  confirmPaymentRecord,
  lookupReservationByReference,
  setPaymentProviderReference,
  updatePaymentProviderStatus,
} from '@/lib/db/store';

export function isPaystackServerConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey || !signatureHeader) return false;

  const computed = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(computed, 'utf8');
  const providedBuf = Buffer.from(signatureHeader.trim().toLowerCase(), 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export interface InitializePaystackResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializePaystackCheckout(params: {
  bookingReference: string;
  guestEmail: string;
  callbackUrl: string;
}): Promise<InitializePaystackResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error(
      'Online card payment via Paystack requires PAYSTACK_SECRET_KEY on the server. Please select Bank Transfer or try again once configured.'
    );
  }

  const found = await lookupReservationByReference(params.bookingReference, params.guestEmail);
  if (!found) {
    throw new Error('Reservation not found or email does not match.');
  }
  const { reservation, guest, category, payments } = found;

  if (reservation.payment_status === 'paid' || reservation.status === 'confirmed') {
    throw new Error('This reservation has already been paid and confirmed.');
  }
  if (reservation.status === 'cancelled') {
    throw new Error('Cancelled reservations cannot be paid online.');
  }

  const pendingPay =
    payments.find((p) => p.status !== 'refunded' && p.status !== 'confirmed') || payments[0];
  if (!pendingPay) {
    throw new Error('Payment record could not be located for this reservation.');
  }

  const uniqueReference = `CHS-${reservation.booking_reference}-${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;
  const amountKobo = Math.round(reservation.total_amount_ngn * 100);

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: (guest?.email || params.guestEmail).trim().toLowerCase(),
      amount: amountKobo,
      currency: 'NGN',
      reference: uniqueReference,
      callback_url: params.callbackUrl,
      metadata: {
        booking_reference: reservation.booking_reference,
        reservation_id: reservation.id,
        payment_id: pendingPay.id,
        category_name: category?.name || 'Suite',
        guest_name: guest?.full_name || 'Guest',
      },
    }),
  });

  const payload = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      authorization_url?: string;
      access_code?: string;
      reference?: string;
    };
  };

  if (
    !response.ok ||
    !payload.status ||
    !payload.data?.authorization_url ||
    !payload.data?.reference
  ) {
    throw new Error(
      payload.message || 'Paystack could not initialize checkout. Please try again or use Bank Transfer.'
    );
  }

  await setPaymentProviderReference({
    paymentId: pendingPay.id,
    providerReference: payload.data.reference,
    method: 'online_paystack',
    notes: 'Paystack Checkout initialized; awaiting guest completion.',
  });

  return {
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code || '',
    reference: payload.data.reference,
  };
}

export type PaystackVerificationOutcome = {
  verified: boolean;
  status: 'confirmed' | 'pending' | 'abandoned' | 'failed' | 'unconfigured';
  message: string;
  providerReference: string;
  gatewayStatus?: string;
  amountPaidNgn?: number;
};

export async function verifyPaystackTransaction(params: {
  paystackReference: string;
  expectedBookingReference?: string;
}): Promise<PaystackVerificationOutcome> {
  const ref = params.paystackReference.trim();
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    return {
      verified: false,
      status: 'unconfigured',
      providerReference: ref,
      message:
        'Online card verification requires PAYSTACK_SECRET_KEY on the server.',
    };
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: 'no-store',
    }
  );

  const verifyJson = (await verifyRes.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
      gateway_response?: string;
      metadata?: {
        booking_reference?: string;
      };
    };
  };

  if (!verifyRes.ok || !verifyJson.status || !verifyJson.data) {
    return {
      verified: false,
      status: 'failed',
      providerReference: ref,
      message: verifyJson.message || 'Paystack could not locate this transaction reference.',
    };
  }

  const tx = verifyJson.data;
  const bookingRefFromTx =
    params.expectedBookingReference?.trim().toUpperCase() ||
    tx.metadata?.booking_reference?.trim().toUpperCase();

  const found = bookingRefFromTx
    ? await lookupReservationByReference(bookingRefFromTx)
    : null;

  if (!found) {
    return {
      verified: false,
      status: 'failed',
      providerReference: tx.reference || ref,
      gatewayStatus: tx.status,
      message: 'Reservation associated with this transaction could not be found.',
    };
  }

  const payment =
    found.payments.find((p) => p.provider_reference === ref) || found.payments[0];
  if (!payment) {
    return {
      verified: false,
      status: 'failed',
      providerReference: tx.reference || ref,
      gatewayStatus: tx.status,
      message: 'Payment record missing for this reservation.',
    };
  }

  // Already confirmed idempotently
  if (payment.status === 'confirmed' && found.reservation.payment_status === 'paid') {
    return {
      verified: true,
      status: 'confirmed',
      providerReference: payment.provider_reference || tx.reference || ref,
      gatewayStatus: tx.status,
      amountPaidNgn: payment.amount_ngn,
      message: 'Payment verified and reservation confirmed.',
    };
  }

  const gatewayStatus = (tx.status || '').toLowerCase();
  const expectedKobo = Math.round(found.reservation.total_amount_ngn * 100);
  const actualKobo = Number(tx.amount ?? 0);
  const currency = (tx.currency || 'NGN').toUpperCase();

  if (gatewayStatus === 'success') {
    if (currency !== 'NGN' || actualKobo < expectedKobo) {
      await updatePaymentProviderStatus({
        paymentId: payment.id,
        status: 'failed',
        providerReference: tx.reference || ref,
        notes: `Paystack amount or currency mismatch (received ${currency} ${actualKobo / 100}, expected NGN ${found.reservation.total_amount_ngn}).`,
      });
      return {
        verified: false,
        status: 'failed',
        providerReference: tx.reference || ref,
        gatewayStatus,
        message: 'Verified payment amount does not match the reservation total.',
      };
    }

    await confirmPaymentRecord({
      paymentId: payment.id,
      providerReference: tx.reference || ref,
      method: 'online_paystack',
      notes: `Verified server-side via Paystack (${tx.gateway_response || 'Approved'}).`,
    });

    return {
      verified: true,
      status: 'confirmed',
      providerReference: tx.reference || ref,
      gatewayStatus,
      amountPaidNgn: actualKobo / 100,
      message: 'Payment verified directly with Paystack and reservation confirmed.',
    };
  }

  if (gatewayStatus === 'abandoned') {
    await updatePaymentProviderStatus({
      paymentId: payment.id,
      status: 'pending',
      providerReference: tx.reference || ref,
      notes: 'Paystack checkout window was closed before completing payment.',
    });
    return {
      verified: false,
      status: 'abandoned',
      providerReference: tx.reference || ref,
      gatewayStatus,
      message:
        'Online card checkout was not completed. Your booking remains unpaid — you may retry card payment or complete a bank transfer.',
    };
  }

  if (gatewayStatus === 'ongoing' || gatewayStatus === 'pending' || gatewayStatus === 'queued') {
    await updatePaymentProviderStatus({
      paymentId: payment.id,
      status: 'pending',
      providerReference: tx.reference || ref,
      notes: `Paystack reports transaction status: ${gatewayStatus}.`,
    });
    return {
      verified: false,
      status: 'pending',
      providerReference: tx.reference || ref,
      gatewayStatus,
      message:
        'Paystack reports your transaction is still processing. Please wait a moment and verify again or check Find Booking.',
    };
  }

  await updatePaymentProviderStatus({
    paymentId: payment.id,
    status: 'failed',
    providerReference: tx.reference || ref,
    notes: `Paystack transaction ${gatewayStatus || 'failed'}: ${tx.gateway_response || 'Declined'}.`,
  });
  return {
    verified: false,
    status: 'failed',
    providerReference: tx.reference || ref,
    gatewayStatus,
    message:
      tx.gateway_response || 'Your online card payment did not succeed. Please try again or pay by bank transfer.',
  };
}
