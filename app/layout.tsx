import type { Metadata } from 'next';
import './globals.css';
import { HotelDataService } from '@/lib/services/hotel-data-service';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.APP_URL ||
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Charlees Hotel & Suites | Abraka, Delta State',
    template: '%s | Charlees Hotel & Suites',
  },
  description:
    'Contemporary hospitality in Abraka, Delta State, Nigeria. Direct room reservations with swimming pool and rooftop spaces on Lawson Obi Street.',
  openGraph: {
    title: 'Charlees Hotel & Suites | Abraka, Delta State',
    description:
      'Contemporary hospitality in Abraka, Delta State, Nigeria. Direct room reservations with swimming pool and rooftop spaces on Lawson Obi Street.',
    type: 'website',
    locale: 'en_NG',
    siteName: 'Charlees Hotel & Suites',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Charlees Hotel & Suites | Abraka, Delta State',
    description:
      'Direct reservations at Charlees Hotel & Suites, No. 2 Lawson Obi Street, Abraka, Delta State, Nigeria.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await HotelDataService.getHotelSettings();

  const hotelJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: 'Charlees Hotel & Suites',
    description:
      'Hotel accommodation in Abraka, Delta State, Nigeria featuring Standard, Twin, Deluxe, and Luxury rooms alongside a swimming pool and rooftop space.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'No. 2 Lawson Obi Street, behind O2 Arena, before Benin Junction',
      addressLocality: 'Abraka',
      addressRegion: 'Delta State',
      addressCountry: 'NG',
    },
    amenityFeature: [
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Swimming Pool',
        value: true,
      },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Rooftop',
        value: true,
      },
    ],
    ...(settings.hotel_profile.phone
      ? { telephone: settings.hotel_profile.phone }
      : {}),
    email: settings.hotel_profile.email || 'reservations@charleeshotel.com',
    url: siteUrl,
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF9F6] text-[#171614] font-sans antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}


