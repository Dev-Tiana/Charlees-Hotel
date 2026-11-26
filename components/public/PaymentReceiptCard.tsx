'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, CheckCircle2, Download, Printer, Share2, ShieldCheck } from 'lucide-react';
import { CopyReferenceButton } from '@/components/public/CopyReferenceButton';
import { formatLagosDateTime, formatNaira } from '@/lib/timezone';

export interface PaymentReceiptProps {
  bookingReference: string;
  paymentReference: string;
  guestName: string;
  roomCategoryName: string;
  roomNumber?: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  childrenCount?: number;
  amountPaidNgn: number;
  paymentMethodLabel: string;
  paymentDateIso: string;
  hotelAddress?: string;
  hotelPhone?: string;
}

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, (ch) => (ch === '₦' ? 'NGN ' : ch === '·' ? '-' : ' '))
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildReceiptPdfBlob(props: PaymentReceiptProps): Blob {
  const lines: { text: string; size: number; y: number; bold?: boolean }[] = [
    { text: 'CHARLEES HOTEL & SUITES', size: 18, y: 742, bold: true },
    {
      text: props.hotelAddress || 'No. 2 Lawson Obi Street, Behind O2 Arena, Abraka, Delta State',
      size: 9,
      y: 724,
    },
    { text: 'VERIFIED PAYMENT RECEIPT - PAID & CONFIRMED', size: 11, y: 696, bold: true },
    { text: '--------------------------------------------------------------------------', size: 10, y: 680 },
    { text: `Booking Reference:   ${props.bookingReference}`, size: 11, y: 656, bold: true },
    { text: `Payment Reference:   ${props.paymentReference}`, size: 11, y: 636 },
    { text: `Payment Status:      Paid & Verified`, size: 11, y: 616, bold: true },
    { text: `Payment Date (WAT):  ${formatLagosDateTime(props.paymentDateIso)}`, size: 10, y: 596 },
    { text: '--------------------------------------------------------------------------', size: 10, y: 576 },
    { text: `Guest Name:          ${props.guestName}`, size: 11, y: 552 },
    {
      text: `Room Category:       ${props.roomCategoryName}${props.roomNumber ? ` (Room ${props.roomNumber})` : ''}`,
      size: 11,
      y: 532,
    },
    { text: `Check-In Date:       ${props.checkInDate}`, size: 11, y: 512 },
    { text: `Check-Out Date:      ${props.checkOutDate}`, size: 11, y: 492 },
    {
      text: `Stay Duration:       ${props.nights} ${props.nights === 1 ? 'Night' : 'Nights'} (${props.adults} ${props.adults === 1 ? 'Adult' : 'Adults'}${props.childrenCount ? `, ${props.childrenCount} Children` : ''})`,
      size: 10,
      y: 472,
    },
    { text: '--------------------------------------------------------------------------', size: 10, y: 452 },
    { text: `Payment Method:      ${props.paymentMethodLabel}`, size: 11, y: 428 },
    { text: `Amount Paid:         ${formatNaira(props.amountPaidNgn)}`, size: 13, y: 404, bold: true },
    { text: '--------------------------------------------------------------------------', size: 10, y: 382 },
    {
      text: 'This receipt is issued solely for confirmed and verified payments settled with',
      size: 9,
      y: 356,
    },
    {
      text: 'Charlees Hotel & Suites, Abraka, Delta State, Nigeria.',
      size: 9,
      y: 342,
    },
  ];

  const streamOps = [
    'BT',
    ...lines.map(
      (line) =>
        `/${line.bold ? 'F2' : 'F1'} ${line.size} Tf 1 0 0 1 54 ${line.y} Tm (${escapePdfText(line.text)}) Tj`
    ),
    'ET',
  ].join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamOps.length} >>\nstream\n${streamOps}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function PaymentReceiptCard(props: PaymentReceiptProps) {
  const [sharedStatus, setSharedStatus] = useState<'idle' | 'shared' | 'copied'>('idle');

  useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove('printing-receipt');
    };
    window.addEventListener('afterprint', cleanup);
    return () => {
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, []);

  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 1000);
  };

  const handleDownloadPdf = () => {
    const blob = buildReceiptPdfBlob(props);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Charlees-Receipt-${props.bookingReference}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleShare = async () => {
    const filename = `Charlees-Receipt-${props.bookingReference}.pdf`;
    const summaryText = `Charlees Hotel & Suites — Verified Payment Receipt\nBooking Reference: ${props.bookingReference}\nPayment Reference: ${props.paymentReference}\nGuest: ${props.guestName}\nRoom: ${props.roomCategoryName}\nDates: ${props.checkInDate} to ${props.checkOutDate}\nAmount Paid: ${formatNaira(props.amountPaidNgn)}\nStatus: Paid & Verified`;

    try {
      const blob = buildReceiptPdfBlob(props);
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `Charlees Hotel Receipt (${props.bookingReference})`,
          text: summaryText,
          files: [file],
        });
        setSharedStatus('shared');
        setTimeout(() => setSharedStatus('idle'), 2500);
        return;
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: `Charlees Hotel Receipt (${props.bookingReference})`,
          text: summaryText,
        });
        setSharedStatus('shared');
        setTimeout(() => setSharedStatus('idle'), 2500);
        return;
      }
    } catch {
      // User canceled native share or browser blocked; fall through cleanly to clipboard copy
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setSharedStatus('copied');
      setTimeout(() => setSharedStatus('idle'), 2500);
    } catch {
      handleDownloadPdf();
    }
  };

  return (
    <section
      aria-label="Verified Payment Receipt"
      className="receipt-print-area border border-[#0D0D0E] bg-white shadow-[0_14px_40px_rgba(23,22,20,0.06)]"
    >
      {/* Top Hotel Identity Banner */}
      <div className="bg-[#0D0D0E] text-[#FAF9F6] px-6 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#26231E]">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[#2C2822] bg-[#0D0D0E]">
            <Image
              src="/media/property/charlees-official-logo.webp"
              alt="Charlees Hotel & Suites Official Crest"
              fill
              sizes="48px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl tracking-tight text-[#FAF9F6]">
              Charlees Hotel &amp; Suites
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#D6B46A]">
              Abraka · Delta State · Official Payment Receipt
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 border border-emerald-400/50 bg-emerald-950/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
          <span>Paid &amp; Verified</span>
        </span>
      </div>

      {/* Receipt Ledger Details */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Guest Name
            </p>
            <p className="mt-1 font-medium text-[#171614]">{props.guestName}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Booking Reference
            </p>
            <p className="mt-1 font-mono-tabular font-semibold text-[#171614]">
              {props.bookingReference}
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Payment Reference
            </p>
            <p className="mt-1 font-mono-tabular text-[#171614] break-all">
              {props.paymentReference}
            </p>
          </div>

          <div className="border-t border-[#EFEAE0] pt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Room Category
            </p>
            <p className="mt-1 font-medium text-[#171614]">
              {props.roomCategoryName}
              {props.roomNumber ? ` · Room ${props.roomNumber}` : ''}
            </p>
          </div>

          <div className="border-t border-[#EFEAE0] pt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Check-In &amp; Check-Out Dates
            </p>
            <p className="mt-1 font-mono-tabular text-[#171614]">
              {props.checkInDate} to {props.checkOutDate}
            </p>
            <p className="text-xs text-[#5C574F] mt-0.5">
              {props.nights} {props.nights === 1 ? 'night' : 'nights'} · {props.adults}{' '}
              {props.adults === 1 ? 'adult' : 'adults'}
              {props.childrenCount ? `, ${props.childrenCount} children` : ''}
            </p>
          </div>

          <div className="border-t border-[#EFEAE0] pt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Payment Date (WAT)
            </p>
            <p className="mt-1 font-mono-tabular text-[#171614]">
              {formatLagosDateTime(props.paymentDateIso)}
            </p>
          </div>
        </div>

        {/* Amount & Settlement Breakdown */}
        <div className="border border-[#E6E1D8] bg-[#FAF9F6] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Payment Method
            </p>
            <p className="text-sm font-medium text-[#171614]">{props.paymentMethodLabel}</p>
            <p className="inline-flex items-center gap-1.5 text-xs text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Status: Paid &amp; Verified</span>
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
              Amount Paid
            </p>
            <p className="mt-0.5 font-mono-tabular text-3xl font-semibold text-[#171614]">
              {formatNaira(props.amountPaidNgn)}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[#6B6459] leading-relaxed">
          {props.hotelAddress ||
            'No. 2 Lawson Obi Street, Behind O2 Arena, Before Benin Junction, Abraka, Delta State'}{' '}
          {props.hotelPhone ? `· Front Desk: ${props.hotelPhone}` : ''}
        </p>

        {/* Action Footer — Hidden During Print */}
        <div className="no-print border-t border-[#EFEAE0] pt-5 flex flex-wrap items-center justify-between gap-3">
          <CopyReferenceButton reference={props.bookingReference} />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 border border-[#D8D1C5] bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#171614] hover:border-[#8C6822] transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#8C6822]" aria-hidden="true" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 bg-[#0D0D0E] text-[#FAF9F6] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#26231F] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#D6B46A]" aria-hidden="true" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 border border-[#D8D1C5] bg-[#FAF9F6] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#171614] hover:border-[#8C6822] transition-colors"
            >
              {sharedStatus === 'idle' ? (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#8C6822]" aria-hidden="true" />
                  <span>Share</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span className="text-emerald-800">
                    {sharedStatus === 'shared' ? 'Shared' : 'Summary Copied'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
