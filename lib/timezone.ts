export const HOTEL_TIMEZONE = 'Africa/Lagos'; // UTC+1, no DST

/**
 * Returns YYYY-MM-DD in Africa/Lagos local time for a given Date.
 */
export function getLagosDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOTEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getLagosTomorrowDateString(): string {
  const today = getLagosDateString();
  const d = parseDateOnly(today);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Parses YYYY-MM-DD into UTC midnight for deterministic calendar arithmetic.
 */
export function parseDateOnly(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function calculateNights(checkInDate: string, checkOutDate: string): number {
  const start = parseDateOnly(checkInDate);
  const end = parseDateOnly(checkOutDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Computes the server-authoritative cancellation deadline in ISO UTC
 * corresponding to Africa/Lagos (UTC+1) rules:
 * - Same-day booking: 1 hour (or configured minutes) after booking creation.
 * - Advance booking: up to 1 day (or configured days) before check-in date (23:59:59 WAT).
 */
export function computeCancellationDeadline(params: {
  checkInDate: string;
  createdAt: Date;
  advanceDaysRequired?: number;
  sameDayWindowMinutes?: number;
}): {
  deadlineIso: string;
  isSameDayBooking: boolean;
} {
  const advanceDays = params.advanceDaysRequired ?? 1;
  const sameDayMinutes = params.sameDayWindowMinutes ?? 60;
  const createdLagosDate = getLagosDateString(params.createdAt);

  if (createdLagosDate >= params.checkInDate) {
    const deadline = new Date(params.createdAt.getTime() + sameDayMinutes * 60 * 1000);
    return {
      deadlineIso: deadline.toISOString(),
      isSameDayBooking: true,
    };
  }

  // Advance booking: end of day (23:59:59 Africa/Lagos = 22:59:59 UTC) on (checkInDate - advanceDays)
  const checkInUtc = parseDateOnly(params.checkInDate);
  checkInUtc.setUTCDate(checkInUtc.getUTCDate() - advanceDays);
  // 23:59:59 WAT (UTC+1) is 22:59:59 UTC on the same calendar date
  checkInUtc.setUTCHours(22, 59, 59, 999);

  return {
    deadlineIso: checkInUtc.toISOString(),
    isSameDayBooking: false,
  };
}

export function formatLagosDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: HOTEL_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}
