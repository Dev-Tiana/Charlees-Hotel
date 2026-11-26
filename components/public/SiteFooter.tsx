import Link from 'next/link';
import { HotelSettings, MediaAsset } from '@/lib/types';
import { BrandLogo } from '@/components/public/BrandLogo';

interface SiteFooterProps {
  logoAsset?: MediaAsset | null;
  settings: HotelSettings;
}

export function SiteFooter({ logoAsset, settings }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const profile = settings.hotel_profile;

  return (
    <footer className="bg-[#0D0D0E] text-[#F5F2EB] border-t border-[#292622]">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-14 border-b border-[#26231E]">
          <div className="md:col-span-5 space-y-5">
            <BrandLogo logoAsset={logoAsset} variant="dark" />
            <p className="text-sm leading-relaxed text-[#B5AFA4] max-w-md">
              {profile.address}
            </p>
            <div className="space-y-1.5 text-sm text-[#D6B46A]">
              <p>
                <span className="text-[#8F897D]">Email: </span>
                <a
                  href={`mailto:${profile.email || 'reservations@charleeshotel.com'}`}
                  className="hover:underline"
                >
                  {profile.email || 'reservations@charleeshotel.com'}
                </a>
              </p>
              {profile.phone ? (
                <p>
                  <span className="text-[#8F897D]">Telephone: </span>
                  <a href={`tel:${profile.phone}`} className="hover:underline">
                    {profile.phone}
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#D6B46A] font-sans font-semibold">
              The Hotel
            </h2>
            <ul className="space-y-2.5 text-sm text-[#C7C1B7]">
              <li><Link href="/rooms" className="hover:text-white transition-colors">Accommodation</Link></li>
              <li><Link href="/facilities" className="hover:text-white transition-colors">Swimming Pool &amp; Rooftop</Link></li>
              <li><Link href="/dining" className="hover:text-white transition-colors">Dining</Link></li>
              <li><Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Charlees</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#D6B46A] font-sans font-semibold">
              Reservations &amp; Local Guide
            </h2>
            <ul className="space-y-2.5 text-sm text-[#C7C1B7]">
              <li><Link href="/book" className="hover:text-white transition-colors">Reserve a Room</Link></li>
              <li><Link href="/find-booking" className="hover:text-white transition-colors">Find Booking</Link></li>
              <li><Link href="/experiences" className="hover:text-white transition-colors">Experiences in Abraka</Link></li>
              <li><Link href="/experiences/river-ethiope" className="hover:text-white transition-colors">River Ethiope</Link></li>
              <li><Link href="/experiences/abraka-market" className="hover:text-white transition-colors">Abraka Market</Link></li>
              <li><Link href="/experiences/abraka-top" className="hover:text-white transition-colors">Abraka Top</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact &amp; Directions</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#D6B46A] font-sans font-semibold">
              Policies &amp; Operations
            </h2>
            <ul className="space-y-2.5 text-sm text-[#C7C1B7]">
              <li><Link href="/policies/cancellation" className="hover:text-white transition-colors">Cancellation Policy</Link></li>
              <li><Link href="/policies/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/policies/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/admin" className="text-[#D6B46A] hover:underline">Staff Management Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#8F897D]">
          <p>
            © {year} Charlees Hotel &amp; Suites, Abraka, Delta State, Nigeria.
          </p>
          <p>
            Abraka, Delta State · Africa/Lagos local time
          </p>
        </div>
      </div>
    </footer>
  );
}
