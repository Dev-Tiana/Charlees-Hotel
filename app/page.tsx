import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { AvailabilityBar } from '@/components/public/AvailabilityBar';
import { MediaFrame } from '@/components/public/MediaFrame';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';
import { HeroBackgroundVideo } from '@/components/public/HeroBackgroundVideo';
import { RooftopVideoPlayer } from '@/components/public/RooftopVideoPlayer';
import { RoomShowcaseAndBooking } from '@/components/public/RoomShowcaseAndBooking';
import {
  EditorialReveal,
  HeroEntrance,
} from '@/components/public/EditorialMotion';
import { HotelDataService } from '@/lib/services/hotel-data-service';
import { getLagosDateString, getLagosTomorrowDateString } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const today = getLagosDateString();
  const tomorrow = getLagosTomorrowDateString();

  const [categories, media, settings, facilities, initialAvailability] = await Promise.all([
    HotelDataService.getRoomCategories(),
    HotelDataService.getMediaAssets(true),
    HotelDataService.getHotelSettings(),
    HotelDataService.getFacilities(),
    HotelDataService.checkAvailability(today, tomorrow),
  ]);

  const heroVideoAsset =
    media.find((m) => m.section_key === 'hero' && m.media_type === 'video') ?? null;
  const heroVideoSrc =
    heroVideoAsset?.public_url || '/media/hero/charlees-pool-courtyard-hero.mp4';
  const heroPosterSrc =
    heroVideoAsset?.poster_url || '/media/hero/charlees-pool-courtyard-hero-poster.jpg';

  const exteriorAsset = media.find((m) => m.section_key === 'exterior') ?? null;
  const poolAssets = media.filter((m) => m.section_key === 'pool');
  const rooftopAsset = media.find((m) => m.section_key === 'rooftop') ?? null;
  const diningAsset = media.find((m) => m.section_key === 'dining') ?? null;
  const riverEthiopeAssets = media.filter(
    (m) => m.section_key === 'exp_river_ethiope' || m.section_key === 'abraka'
  );
  const abrakaMarketAssets = media.filter((m) => m.section_key === 'exp_abraka_market');
  const abrakaTopAssets = media.filter((m) => m.section_key === 'exp_abraka_top');

  const poolFacility = facilities.find((f) => f.slug === 'swimming-pool');
  const rooftopFacility = facilities.find((f) => f.slug === 'rooftop-lounge');

  const onlinePaystackEnabled = Boolean(process.env.PAYSTACK_SECRET_KEY);
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();

  return (
    <PublicShell>
      <main>
        {/* UNIFIED HERO SECTION WITH FULL-BLEED BRIGHT COURTYARD VIDEO */}
        <section className="relative overflow-hidden bg-[#0D0D0E] text-[#FAF9F6]">
          <HeroBackgroundVideo src={heroVideoSrc} poster={heroPosterSrc} />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8 pt-16 sm:pt-24 lg:pt-28 pb-16 sm:pb-20 min-h-[540px] sm:min-h-[600px] lg:min-h-[650px] flex flex-col justify-end">
            <div className="max-w-3xl space-y-6">
              <HeroEntrance delay={0}>
                <p className="text-xs uppercase tracking-[0.22em] text-[#F3D896] font-semibold [text-shadow:0_2px_12px_rgba(0,0,0,0.85),0_1px_3px_rgba(0,0,0,0.8)]">
                  Abraka · Delta State · Nigeria
                </p>
              </HeroEntrance>

              <HeroEntrance delay={0.08}>
                <h1 className="font-display text-[clamp(2.35rem,4.4vw,4.25rem)] leading-[1.06] font-normal tracking-tight text-[#FAF9F6] text-balance [text-shadow:0_3px_22px_rgba(0,0,0,0.78),0_1px_5px_rgba(0,0,0,0.72)]">
                  White Architecture and Quiet Composure in Abraka
                </h1>
              </HeroEntrance>

              <HeroEntrance delay={0.14}>
                <p className="text-base sm:text-lg leading-relaxed text-[#FAF9F6] max-w-xl [text-shadow:0_2px_16px_rgba(0,0,0,0.82),0_1px_4px_rgba(0,0,0,0.78)]">
                  Standing in crisp white plaster along No. 2 Lawson Obi Street, Charlees Hotel &amp; Suites offers four private room tiers, an outdoor swimming pool, and a rooftop space shaped for unhurried stays.
                </p>
              </HeroEntrance>

              <HeroEntrance delay={0.2} className="pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-2.5 bg-[#D6B46A] text-[#0D0D0E] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] whitespace-nowrap hover:bg-[#E2C581] shadow-[0_6px_22px_rgba(0,0,0,0.35)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B46A]"
                  >
                    <span>Book Your Stay</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="#rooms-booking"
                    className="inline-flex items-center gap-2 border border-[#FAF9F6]/75 bg-[#0D0D0E]/25 backdrop-blur-[2px] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FAF9F6] [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] whitespace-nowrap hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B46A]"
                  >
                    <span>Explore Rooms</span>
                  </Link>
                </div>

                <p className="mt-6 pr-16 sm:pr-28 flex items-start gap-2 text-xs text-[#FAF9F6] [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#F3D896] shrink-0" aria-hidden="true" />
                  <span>{settings.hotel_profile.address}</span>
                </p>
              </HeroEntrance>
            </div>
          </div>
        </section>

        {/* BESPOKE CHARLEES STAY PLANNER & AVAILABILITY LEDGER */}
        <div className="bg-[#0D0D0E] border-t border-[#26231E]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 sm:py-10">
            <AvailabilityBar categories={categories} />
          </div>
        </div>

        {/* 01. ARCHITECTURAL STORYTELLING INTRODUCTION */}
        <section className="border-t border-[#E6E1D8] bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <EditorialReveal className="lg:col-span-5">
                <MediaFrame
                  asset={exteriorAsset}
                  fallbackTitle="Bright Plaster Courtyards and Arrival"
                  figureCode="Fig. 02 · Architecture"
                  aspectClass="aspect-[3/4]"
                />
              </EditorialReveal>

              <EditorialReveal delay={0.1} className="lg:col-span-7 lg:pl-8 space-y-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                  01. The Property
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
                  A serene white residence set just off the Benin Junction corridor
                </h2>
                <div className="space-y-4 text-base leading-relaxed text-[#4A453E] max-w-2xl">
                  <p>
                    Positioned behind O2 Arena on Lawson Obi Street, Charlees Hotel &amp; Suites steps back from the movement of Abraka into a composed architectural setting. Its white painted facade reflects the bright Delta sunlight by day and frames warm evening gatherings around the pool and rooftop.
                  </p>
                  <p>
                    Whether arriving for academic engagements at Delta State University, regional business across Ethiope East, or a quiet weekend near the Ethiope River, guests find straightforward hospitality grounded in clean rooms and attentive operations.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center gap-6">
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#171614] border-b border-[#8C6822] pb-1 hover:text-[#8C6822] transition-colors"
                  >
                    <span>Read the Property Story</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/gallery"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#5C574F] hover:text-[#8C6822] transition-colors"
                  >
                    <span>View Property Gallery</span>
                  </Link>
                </div>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* 02. ACCOMMODATION — ALL 4 ROOM CATEGORIES IMMEDIATELY VISIBLE */}
        <section id="rooms-booking" className="border-t border-[#E6E1D8] bg-[#FAF9F6]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
            <EditorialReveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-[#E6E1D8] mb-10">
              <div className="space-y-3 max-w-2xl">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                  02. Accommodation
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
                  Four room categories ready to explore and reserve directly
                </h2>
              </div>
              <Link
                href="/rooms"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium text-[#171614] hover:text-[#8C6822] whitespace-nowrap shrink-0"
              >
                <span>Open Full Rooms Directory</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </EditorialReveal>

            <RoomShowcaseAndBooking
              categories={categories}
              media={media}
              initialToday={today}
              initialTomorrow={tomorrow}
              initialAvailability={initialAvailability}
              bankDetails={settings.hotel_profile}
              onlinePaystackEnabled={onlinePaystackEnabled}
              advanceDaysRequired={settings.cancellation_policy.advanceDaysRequired}
              sameDayWindowMinutes={settings.cancellation_policy.sameDayWindowMinutes}
              expandAllOnMount={true}
              isDevelopmentMode={isDevelopmentMode}
            />
          </div>
        </section>

        {/* 03. INDEPENDENT SECTION: SWIMMING POOL */}
        <section className="bg-[#0D0D0E] text-[#FAF9F6] border-t border-[#26231E]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <EditorialReveal className="lg:col-span-7">
                <ExperienceMediaGallery
                  title={poolFacility?.name || 'The Swimming Pool'}
                  subtitle="Facility 01 · Swimming Pool"
                  assets={poolAssets}
                  aspectClass="aspect-[4/5]"
                  maxWidthClass="max-w-2xl lg:mx-0"
                  tone="dark"
                />
              </EditorialReveal>

              <EditorialReveal delay={0.1} className="lg:col-span-5 space-y-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#D6B46A]">
                  03. Swimming Pool
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#FAF9F6] text-balance">
                  {poolFacility?.name || 'The Swimming Pool'}
                </h2>
                {poolFacility?.operating_hours ? (
                  <p className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-[#D6B46A]">
                    {poolFacility.operating_hours}
                  </p>
                ) : null}
                <p className="text-base leading-relaxed text-[#B5AFA4]">
                  {poolFacility?.summary ||
                    'Set within the quiet perimeter of the hotel grounds, the swimming pool offers resident guests a calm place to cool down after daytime travel across Delta State.'}
                </p>
                <p className="text-xs text-[#9E978B]">
                  Complimentary poolside access for checked-in residents; towels available at front desk reception.
                </p>
                <div className="pt-2">
                  <Link
                    href="/facilities"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#D6B46A] hover:text-white transition-colors"
                  >
                    <span>Explore Swimming Pool Details</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* 04. INDEPENDENT SECTION: ROOFTOP LOUNGE */}
        <section className="bg-[#141311] text-[#FAF9F6] border-t border-[#26231E]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <EditorialReveal className="lg:col-span-5 space-y-5 order-2 lg:order-1">
                <p className="text-xs uppercase tracking-[0.22em] text-[#D6B46A]">
                  04. Rooftop Lounge
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#FAF9F6] text-balance">
                  {rooftopFacility?.name || 'The Rooftop Lounge'}
                </h2>
                {rooftopFacility?.operating_hours ? (
                  <p className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-[#D6B46A]">
                    {rooftopFacility.operating_hours}
                  </p>
                ) : null}
                <p className="text-base leading-relaxed text-[#B5AFA4]">
                  {rooftopFacility?.summary ||
                    'Elevated above Lawson Obi Street, the rooftop space looks out over Abraka as evening light settles across the town, offering fresh air and unhurried conversation.'}
                </p>
                <div className="pt-2">
                  <Link
                    href="/facilities"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#D6B46A] hover:text-white transition-colors"
                  >
                    <span>Explore Rooftop &amp; Facilities</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </EditorialReveal>

              <EditorialReveal delay={0.1} className="lg:col-span-7 order-1 lg:order-2">
                <RooftopVideoPlayer
                  asset={rooftopAsset}
                  title={rooftopFacility?.name || 'The Rooftop Lounge'}
                  tone="dark"
                  maxWidthClass="max-w-lg lg:ml-auto lg:mr-0"
                />
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* 05. CONFIGURABLE DINING & REFRESHMENTS */}
        {settings.hotel_profile.diningEnabled ? (
          <section className="border-t border-[#E6E1D8] bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <EditorialReveal className="lg:col-span-6 space-y-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                    05. Dining &amp; Refreshments
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#171614] text-balance">
                    Dining at Charlees Hotel &amp; Suites
                  </h2>
                  <p className="text-base leading-relaxed text-[#5C574F]">
                    {settings.hotel_profile.diningStatusNote}
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/dining"
                      className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium text-[#171614] border-b border-[#8C6822] pb-1 hover:text-[#8C6822]"
                    >
                      <span>View Dining Details</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </EditorialReveal>

                <EditorialReveal delay={0.1} className="lg:col-span-6">
                  <MediaFrame
                    asset={diningAsset}
                    fallbackTitle="Dining & Refreshment Space"
                    figureCode="Fig. 05 · Hospitality Service"
                    aspectClass="aspect-[16/10]"
                  />
                </EditorialReveal>
              </div>
            </div>
          </section>
        ) : null}

        {/* 06. EXPERIENCES IN ABRAKA (ISOLATED SUBSECTIONS) */}
        <section className="border-t border-[#E6E1D8] bg-[#F2EFE9]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <EditorialReveal className="lg:col-span-5 space-y-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                  06. Abraka Experiences
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
                  River Ethiope and independent destinations around Abraka
                </h2>
                <p className="text-base leading-relaxed text-[#4A453E]">
                  Abraka is shaped by the clear spring waters of River Ethiope, calm Delta greenery, and vibrant local town life in Ethiope East. Explore each independent experience page below at your own pace.
                </p>
                <div className="pt-2">
                  <Link
                    href="/experiences"
                    className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] transition-colors"
                  >
                    <span>Explore All Experiences</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </EditorialReveal>

              <EditorialReveal delay={0.1} className="lg:col-span-7">
                <ExperienceMediaGallery
                  title="River Ethiope"
                  subtitle="Ethiope East · Abraka"
                  assets={riverEthiopeAssets}
                  aspectClass="aspect-[4/5]"
                  maxWidthClass="max-w-2xl"
                />
              </EditorialReveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#D8D1C5]">
              <article className="bg-white border border-[#E6E1D8] p-6 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
                    01 · River Ethiope ({riverEthiopeAssets.length} Visuals)
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-[#171614]">River Ethiope</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C574F]">
                    Clear spring-fed inland waterway flowing through Abraka, Delta State — appreciated for natural pools and riverside canoe crossings.
                  </p>
                </div>
                <Link
                  href="/experiences/river-ethiope"
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#171614] hover:text-[#8C6822]"
                >
                  <span>Visit River Ethiope Page</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </article>

              <article className="bg-white border border-[#E6E1D8] p-6 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
                    02 · Abraka, Ethiope East
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-[#171614]">Abraka Market</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C574F]">
                    Local town market serving Abraka and Ethiope East communities in Delta State with seasonal produce and regional wares.
                    {abrakaMarketAssets.length > 0 ? ` (${abrakaMarketAssets.length} curated visuals)` : ''}
                  </p>
                </div>
                <Link
                  href="/experiences/abraka-market"
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#171614] hover:text-[#8C6822]"
                >
                  <span>Visit Abraka Market Page</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </article>

              <article className="bg-white border border-[#E6E1D8] p-6 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C6822]">
                    03 · {abrakaTopAssets.length > 0 ? 'Abraka Corridor' : 'Pending Verification'}
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-[#171614]">Abraka Top</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C574F]">
                    {abrakaTopAssets.length > 0
                      ? 'Verified visual highlights from Abraka Top, Delta State.'
                      : 'Awaiting confirmed location guidance and photography from Charlees Hotel management.'}
                  </p>
                </div>
                <Link
                  href="/experiences/abraka-top"
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#171614] hover:text-[#8C6822]"
                >
                  <span>Visit Abraka Top Page</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* 07. LOCATION, CONTACT & BOOKING CLARITY */}
        <section className="border-t border-[#E6E1D8] bg-[#FAF9F6]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7 space-y-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                  07. Location &amp; Reservations
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#171614] text-balance">
                  Arrive directly at No. 2 Lawson Obi Street
                </h2>
                <p className="text-base leading-relaxed text-[#5C574F] max-w-xl">
                  Located behind O2 Arena before Benin Junction in Abraka, Delta State. Direct website bookings confirm physical room availability and clearly state your cancellation window in West Africa Time.
                </p>
                <div className="pt-4 flex flex-wrap gap-4">
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F]"
                  >
                    <span>Book Direct</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/find-booking"
                    className="inline-flex items-center gap-2 border border-[#D8D1C5] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#171614] hover:border-[#8C6822]"
                  >
                    <span>Find Existing Booking</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
                    Street Address
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#171614]">
                    {settings.hotel_profile.address}
                  </p>
                </div>
                <div className="border-t border-[#EFEAE0] pt-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
                    Cancellation Standard
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5C574F]">
                    Advance bookings may be cancelled up to one day before arrival. Same day bookings may be cancelled within one hour of creation.
                  </p>
                </div>
                <div className="border-t border-[#EFEAE0] pt-4 flex items-center justify-between text-xs uppercase tracking-[0.16em]">
                  <Link href="/contact" className="text-[#171614] hover:text-[#8C6822] font-medium">
                    Contact Desk
                  </Link>
                  <Link href="/faq" className="text-[#171614] hover:text-[#8C6822] font-medium">
                    Read FAQ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
