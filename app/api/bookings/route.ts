import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createReservation, getHotelSettings } from '@/lib/db/store';
import { isPaystackServerConfigured } from '@/lib/payments/paystack';
import { getLagosDateString, formatLagosDateTime, formatNaira } from '@/lib/timezone';
import { sendTransactionalEmail } from '@/lib/notifications/email';

const bookingSchema = z.object({
  categorySlug: z.string().min(2).max(80),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(6),
  children: z.number().int().min(0).max(6).default(0),
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email().max(160),
  guestPhone: z.string().trim().min(7).max(40),
  specialRequests: z.string().trim().max(800).optional(),
  paymentMethod: z.enum(['online_paystack', 'bank_transfer']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            'Please complete all required reservation fields accurately and select either Online Card Payment (Paystack) or Bank Transfer.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const todayLagos = getLagosDateString();
    if (parsed.data.checkInDate < todayLagos) {
      return NextResponse.json(
        { error: 'Check-in date cannot be earlier than today in Abraka local time.' },
        { status: 400 }
      );
    }

    const [result, settings] = await Promise.all([
      createReservation({
        ...parsed.data,
        bookingSource: 'website',
      }),
      getHotelSettings(),
    ]);

    await sendTransactionalEmail({
      to: result.guest.email,
      subject: `Charlees Hotel & Suites Reservation ${result.reservation.booking_reference}`,
      html: `
        <h2>Reservation Received: ${result.reservation.booking_reference}</h2>
        <p>Dear ${result.guest.full_name},</p>
        <p>Thank you for reserving with Charlees Hotel & Suites, Abraka.</p>
        <ul>
          <li><strong>Room Category:</strong> ${result.category.name}</li>
          <li><strong>Check-In:</strong> ${result.reservation.check_in_date}</li>
          <li><strong>Check-Out:</strong> ${result.reservation.check_out_date}</li>
          <li><strong>Total:</strong> ${formatNaira(result.reservation.total_amount_ngn)}</li>
          <li><strong>Cancellation Deadline (WAT):</strong> ${formatLagosDateTime(result.reservation.cancellation_deadline_at)}</li>
        </ul>
      `,
    });

    return NextResponse.json(
      {
        reservation: result.reservation,
        payment: result.payment,
        category: result.category,
        guest: result.guest,
        assignedRoomNumber: result.assignedRoomNumber,
        bankDetails: {
          bankName: settings.hotel_profile.bankName,
          bankAccountName: settings.hotel_profile.bankAccountName,
          bankAccountNumber: settings.hotel_profile.bankAccountNumber,
        },
        onlineGatewayConfigured: isPaystackServerConfigured(),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create reservation.' },
      { status: 400 }
    );
  }
}
