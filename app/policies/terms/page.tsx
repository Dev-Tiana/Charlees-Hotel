import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Reservation and stay terms for Charlees Hotel and Suites in Abraka, Delta State, Nigeria.',
};

export default function TermsPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-14 sm:py-20 space-y-8">
        <div className="space-y-3 border-b border-[#E6E1D8] pb-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">Legal</p>
          <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#171614]">
            Terms and Conditions
          </h1>
        </div>

        <section className="space-y-3 text-base leading-relaxed text-[#4A453E]">
          <h2 className="font-display text-2xl text-[#171614]">Reservations and Stay Totals</h2>
          <p>
            Reservation totals at Charlees Hotel &amp; Suites are calculated strictly on the server in Nigerian Naira based on your confirmed room category and stay duration.
          </p>
        </section>

        <section className="space-y-3 text-base leading-relaxed text-[#4A453E]">
          <h2 className="font-display text-2xl text-[#171614]">Payment Verification</h2>
          <p>
            Reservations paid via bank transfer remain pending verification until authorized hotel personnel verify receipt in the hotel bank account. Cash reservations are settled upon arrival at reception unless otherwise arranged with management.
          </p>
        </section>

        <section className="space-y-3 text-base leading-relaxed text-[#4A453E]">
          <h2 className="font-display text-2xl text-[#171614]">House Rules and Check In</h2>
          <p>
            Specific arrival times, departure times, and supplementary property policies are confirmed by Charlees Hotel &amp; Suites management and communicated directly to guests upon confirmation.
          </p>
        </section>
      </main>
    </PublicShell>
  );
}
