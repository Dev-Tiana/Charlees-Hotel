import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers on room categories, swimming pool and rooftop facilities, location in Abraka, and booking cancellations at Charlees Hotel and Suites.',
};

const FAQ_ITEMS = [
  {
    q: 'Where is Charlees Hotel and Suites located?',
    a: 'Charlees Hotel & Suites is located at No. 2 Lawson Obi Street, behind O2 Arena, before Benin Junction, Abraka, Delta State, Nigeria.',
  },
  {
    q: 'Which room categories are available at Charlees Hotel and Suites?',
    a: 'We offer four verified room tiers: Standard Room, Twin Room, Deluxe Room, and Luxury Room. You can inspect photographs, room information, and live date availability directly on our Rooms page.',
  },
  {
    q: 'Which facilities belong to Charlees Hotel and Suites?',
    a: 'Charlees Hotel & Suites features an on site swimming pool and a rooftop space for guests. External landmarks such as Ethiope River and McCarthy Beach are separate destinations around Abraka.',
  },
  {
    q: 'How does the cancellation policy work?',
    a: 'Advance reservations may be cancelled up to one day before the scheduled arrival date in West Africa Time. Same day reservations may be cancelled within one hour of booking creation.',
  },
  {
    q: 'How do bank transfer and cash payments work?',
    a: 'Guests may choose online payment when enabled, bank transfer, or cash upon arrival. Bank transfer payments remain in pending verification status until confirmed by our accounting or front desk staff.',
  },
  {
    q: 'How can I check or cancel an existing reservation?',
    a: 'Visit the Find Booking page and enter your booking reference together with the email address used during reservation to view live status, cancellation eligibility, and refund progress.',
  },
];

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="space-y-4 pb-10 border-b border-[#E6E1D8]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Guest Information
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#171614]">
            Frequently Asked Questions
          </h1>
          <p className="text-base text-[#5C574F]">
            Direct, factual answers regarding stays, room tiers, facilities, and reservations at Charlees Hotel &amp; Suites.
          </p>
        </div>

        <dl className="divide-y divide-[#E6E1D8]">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="py-7 space-y-2.5">
              <dt className="font-display text-2xl font-normal text-[#171614]">
                {item.q}
              </dt>
              <dd className="text-sm sm:text-base leading-relaxed text-[#4A453E]">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 pt-8 border-t border-[#E6E1D8] flex flex-wrap gap-4">
          <Link
            href="/book"
            className="bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em]"
          >
            Reserve a Room
          </Link>
          <Link
            href="/find-booking"
            className="border border-[#D8D1C5] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#171614]"
          >
            Find Booking
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
