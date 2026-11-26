import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Charlees Hotel and Suites collects and protects guest reservation and inquiry records.',
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-14 sm:py-20 space-y-8">
        <div className="space-y-3 border-b border-[#E6E1D8] pb-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">Legal</p>
          <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#171614]">
            Privacy Policy
          </h1>
        </div>

        <section className="space-y-3 text-base leading-relaxed text-[#4A453E]">
          <h2 className="font-display text-2xl text-[#171614]">Information We Collect</h2>
          <p>
            When you reserve a room or submit an inquiry, Charlees Hotel &amp; Suites collects your full name, email address, telephone number, stay dates, and payment reference details strictly to administer your reservation and communicate stay updates.
          </p>
        </section>

        <section className="space-y-3 text-base leading-relaxed text-[#4A453E]">
          <h2 className="font-display text-2xl text-[#171614]">Security and Access</h2>
          <p>
            Reservation, payment, and guest records are stored in protected server databases accessible only to authorized hotel personnel according to their assigned operational role. Optional website analytics scripts only activate if you grant consent.
          </p>
        </section>
      </main>
    </PublicShell>
  );
}
