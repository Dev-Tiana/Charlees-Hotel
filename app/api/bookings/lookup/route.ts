import { NextRequest, NextResponse } from 'next/server';
import {
  EXPIRED_CANCELLATION_MESSAGE,
  getHotelSettings,
  lookupReservationByReference,
} from '@/lib/db/store';

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get('reference') || '';
    const email = req.nextUrl.searchParams.get('email') || '';

    if (!reference.trim() || !email.trim()) {
      return NextResponse.json(
        { error: 'Both booking reference and guest email address are required.' },
        { status: 400 }
      );
    }

    const found = await lookupReservationByReference(reference, email);
    if (!found) {
      return NextResponse.json(
        { error: 'No matching reservation was found for that reference and email.' },
        { status: 404 }
      );
    }

    const settings = await getHotelSettings();
    const now = Date.now();
    const deadlineMs = new Date(found.reservation.cancellation_deadline_at).getTime();
    const statusAllowsRequest = ['pending_payment', 'confirmed'].includes(found.reservation.status);
    const hasPendingRequest =
      found.reservation.status === 'cancellation_requested' ||
      found.cancellation?.status === 'requested';
    const withinPolicyWindow = now <= deadlineMs;
    const isExpired =
      ['checked_in', 'checked_out', 'no_show'].includes(found.reservation.status) ||
      (statusAllowsRequest && !withinPolicyWindow);

    const maskedCancellation = found.cancellation
      ? {
          ...found.cancellation,
          refund_account_number: found.cancellation.refund_account_number
            ? `••••${found.cancellation.refund_account_number.slice(-4)}`
            : null,
        }
      : null;

    return NextResponse.json({
      ...found,
      cancellation: maskedCancellation,
      bankDetails: {
        bankName: settings.hotel_profile.bankName,
        bankAccountName: settings.hotel_profile.bankAccountName,
        bankAccountNumber: settings.hotel_profile.bankAccountNumber,
      },
      cancellationPolicy: {
        withinPolicyWindow,
        canRequestCancellation: statusAllowsRequest && !hasPendingRequest && withinPolicyWindow,
        hasPendingRequest,
        isExpired,
        expiredMessage: EXPIRED_CANCELLATION_MESSAGE,
        deadlineAt: found.reservation.cancellation_deadline_at,
        isSameDayBooking: found.reservation.is_same_day_booking,
        refundTimelineNote: settings.cancellation_policy.refundTimelineNote,
        refundPercentageConfirmedByManagement:
          settings.cancellation_policy.refundPercentageConfirmedByManagement,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to look up reservation.' },
      { status: 400 }
    );
  }
}
