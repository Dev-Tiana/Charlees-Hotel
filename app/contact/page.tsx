import type { Metadata } from 'next';
import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { ContactFormClient } from '@/components/public/ContactFormClient';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact & Directions',
  description:
    'Find Charlees Hotel and Suites at No. 2 Lawson Obi Street, behind O2 Arena, before Benin Junction, Abraka, Delta State, Nigeria.',
};

export default async function ContactPage() {
  const settings = await HotelDataService.getHotelSettings();
  const profile = settings.hotel_profile;

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="max-w-3xl space-y-4 pb-12 border-b border-[#E6E1D8]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
            Reception &amp; Directions
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-[#171614]">
            Contact Charlees Hotel &amp; Suites
          </h1>
          <p className="text-base leading-relaxed text-[#5C574F]">
            Reach our Abraka front desk directly for room inquiries, group stay requests, or arrival guidance along Lawson Obi Street.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-12 items-start">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-2 border-b border-[#E6E1D8] pb-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>Property Address</span>
              </div>
              <p className="text-base leading-relaxed text-[#171614]">
                {profile.address}
              </p>
            </div>

            <div className="space-y-2 border-b border-[#E6E1D8] pb-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>Reservations Email</span>
              </div>
              <p className="text-base text-[#171614]">
                <a
                  href={`mailto:${profile.email || 'reservations@charleeshotel.com'}`}
                  className="hover:text-[#8C6822] underline underline-offset-4"
                >
                  {profile.email || 'reservations@charleeshotel.com'}
                </a>
              </p>
            </div>

            <div className="space-y-3 border-b border-[#E6E1D8] pb-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8C6822]">
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>Telephone &amp; WhatsApp</span>
              </div>
              {profile.phone ? (
                <p className="text-base text-[#171614]">
                  <a href={`tel:${profile.phone}`} className="hover:text-[#8C6822] underline underline-offset-4">
                    {profile.phone}
                  </a>
                </p>
              ) : (
                <p className="text-sm text-[#6B6459]">
                  Direct reception telephone number is configurable in hotel management settings.
                </p>
              )}

              {profile.whatsapp ? (
                <p className="pt-1">
                  <a
                    href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-[#D8D1C5] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[#171614] hover:border-[#8C6822]"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#8C6822]" aria-hidden="true" />
                    <span>Message via WhatsApp</span>
                  </a>
                </p>
              ) : null}
            </div>

            <div className="space-y-2 text-sm text-[#5C574F]">
              <p className="font-medium text-[#171614]">Arrival &amp; Departure Schedule</p>
              <p>Check in: {profile.checkInTimeNote}</p>
              <p>Check out: {profile.checkOutTimeNote}</p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ContactFormClient />
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
