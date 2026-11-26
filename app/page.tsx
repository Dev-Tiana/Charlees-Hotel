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

  const exteriorAsset = media.find((m) => m.section_key === 'exterior') ?? null;
  const poolAssets = media.filter((m) => m.section_key === 'pool');
  const rooftopAsset = media.find((m) => m.section_key === 'rooftop') ?? null;
  const diningAsset = media.find((m) => m.section_key === 'dining') ?? null;
  const abrakaAssets = media.filter((m) => m.section_key === 'abraka');

  const poolFacility = facilities.find((f) => f.slug === 'swimming-pool');
  const rooftopFacility = facilities.find((f) => f.slug === 'rooftop-lounge');

  const onlinePaystackEnabled = Boolean(process.env.PAYSTACK_SECRET_KEY);
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();

  return (
    <PublicShell>
      <main>
        {/* UNIFIED HERO SECTION WITH FULL-BLEED BACKGROUND VIDEO */}
        <section className="relative overflow-hidden bg-[#0D0D0E] text-[#FAF9F6]">
          <HeroBackgroundVideo
            src="/media/hero/charlees-hero.mp4"
            poster="/media/hero/charlees-hero-poster.jpg"
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8 pt-16 sm:pt-24 lg:pt-28 pb-16 sm:pb-20 min-h-[540px] sm:min-h-[600px] lg:min-h-[650px] flex flex-col justify-end">
            <div className="max-w-3xl space-y-6">
              <HeroEntrance delay={0}>
                <p className="text-xs uppercase tracking-[0.22em] text-[#D6B46A] font-medium">
                  Abraka · Delta State · Nigeria
                </p>
              </HeroEntrance>

              <HeroEntrance delay={0.08}>
                <h1 className="font-display text-[clamp(2.35rem,4.4vw,4.25rem)] leading-[1.06] font-normal tracking-tight text-[#FAF9F6] text-balance">
                  White Architecture and Quiet Composure in Abraka
                </h1>
              </HeroEntrance>

              <HeroEntrance delay={0.14}>
                <p className="text-base sm:text-lg leading-relaxed text-[#E7E2D9] max-w-xl">
                  Standing in crisp white plaster along No. 2 Lawson Obi Street, Charlees Hotel &amp; Suites offers four private room tiers, an outdoor swimming pool, and a rooftop space shaped for unhurried stays.
                </p>
              </HeroEntrance>

              <HeroEntrance delay={0.2} className="pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-2.5 bg-[#D6B46A] text-[#0D0D0E] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] whitespace-nowrap hover:bg-[#E2C581] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B46A]"
                  >
                    <span>Book Your Stay</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="#rooms-booking"
                    className="inline-flex items-center gap-2 border border-[#FAF9F6]/45 bg-[#0D0D0E]/40 backdrop-blur-xs px-6 py-3.5 text-xs font-medium uppercase tracking-[0.18em] text-[#FAF9F6] whitespace-nowrap hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B46A]"
                  >
                    <span>Explore Rooms</span>
                  </Link>
                </div>

                <p className="mt-6 pr-16 sm:pr-28 flex items-start gap-2 text-xs text-[#D6D0C4]">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#D6B46A] shrink-0" aria-hidden="true" />
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

        {/* 02. ACCOMMODATION & INLINE CONNECTED ROOM BOOKING */}
        <section id="rooms-booking" className="border-t border-[#E6E1D8] bg-[#FAF9F6]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
            <EditorialReveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-[#E6E1D8] mb-10">
              <div className="space-y-3 max-w-2xl">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                  02. Accommodation
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
                  Select a room category to explore photographs and book directly
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
              initialRoomSlug="twin-room"
              isDevelopmentMode={isDevelopmentMode}
            />
          </div>
        </section>

        {/* 03. DEEP OBSIDIAN CONTRAST BAND: SWIMMING POOL & ROOFTOP */}
        <section className="bg-[#0D0D0E] text-[#FAF9F6] border-t border-[#26231E]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
            <EditorialReveal className="max-w-2xl space-y-3 mb-14">
              <p className="text-xs uppercase tracking-[0.22em] text-[#D6B46A]">
                03. Hotel Facilities
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#FAF9F6] text-balance">
                Spaces built for quiet afternoons and open evening air
              </h2>
              <p className="text-sm sm:text-base text-[#B5AFA4] leading-relaxed">
                Alongside guest accommodations, Charlees Hotel &amp; Suites features two signature on site facilities designed for unhurried moments within the property.
              </p>
            </EditorialReveal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              {/* Swimming Pool */}
              <EditorialReveal className="lg:col-span-6 space-y-5">
                <ExperienceMediaGallery
                  title={poolFacility?.name || 'The Swimming Pool'}
                  subtitle="Facility 01 · Swimming Pool"
                  assets={poolAssets}
                  aspectClass="aspect-[4/5]"
                  maxWidthClass="max-w-[460px] lg:mx-0"
                  tone="dark"
                />
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-3xl font-normal text-[#FAF9F6]">
                      {poolFacility?.name || 'The Swimming Pool'}
                    </h3>
                    {poolFacility?.operating_hours ? (
                      <span className="text-[11px] font-mono-tabular uppercase tracking-[0.14em] text-[#D6B46A]">
                        {poolFacility.operating_hours}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-[#B5AFA4]">
                    {poolFacility?.summary ||
                      'Set within the quiet perimeter of the hotel grounds, the swimming pool offers resident guests a calm place to cool down after daytime travel across Delta State.'}
                  </p>
                </div>
              </EditorialReveal>

              {/* Rooftop */}
              <EditorialReveal delay={0.1} className="lg:col-span-6 space-y-5 lg:mt-16">
                <RooftopVideoPlayer
                  asset={rooftopAsset}
                  title={rooftopFacility?.name || 'The Rooftop Lounge'}
                  tone="dark"
                  maxWidthClass="max-w-[390px] lg:mx-0"
                />
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-3xl font-normal text-[#FAF9F6]">
                      {rooftopFacility?.name || 'The Rooftop Lounge'}
                    </h3>
                    {rooftopFacility?.operating_hours ? (
                      <span className="text-[11px] font-mono-tabular uppercase tracking-[0.14em] text-[#D6B46A]">
                        {rooftopFacility.operating_hours}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-[#B5AFA4]">
                    {rooftopFacility?.summary ||
                      'Elevated above Lawson Obi Street, the rooftop space looks out over Abraka as evening light settles across the town, offering fresh air and unhurried conversation.'}
                  </p>
                </div>
              </EditorialReveal>
            </div>

            <div className="mt-12 pt-8 border-t border-[#26231E] flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-[#9E978B]">
                Complimentary poolside access for checked-in residents; towels available at front desk reception.
              </p>
              <Link
                href="/facilities"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#D6B46A] hover:text-white transition-colors"
              >
                <span>Explore Hotel Facilities</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* 04. CONFIGURABLE DINING & REFRESHMENTS */}
        {settings.hotel_profile.diningEnabled ? (
          <section className="border-t border-[#E6E1D8] bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <EditorialReveal className="lg:col-span-6 space-y-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                    04. Dining &amp; Refreshments
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

        {/* 05. EXPLORE ABRAKA (INDEPENDENT SURROUNDING EXPERIENCES) */}
        <section className="border-t border-[#E6E1D8] bg-[#F2EFE9]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <EditorialReveal className="lg:col-span-5 space-y-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                  05. Explore Abraka
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-[#171614] text-balance">
                  Natural riverbanks and town life beyond the gates
                </h2>
                <p className="text-base leading-relaxed text-[#4A453E]">
                  Abraka is shaped by the clear spring waters of the Ethiope River, lush vegetation, and the academic rhythm of Delta State University. Guests staying at Charlees may visit nearby independent landmarks across town at their own pace.
                </p>
                <div className="pt-2">
                  <Link
                    href="/explore-abraka"
                    className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] transition-colors"
                  >
                    <span>Read the Abraka Guide</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </EditorialReveal>

              <EditorialReveal delay={0.1} className="lg:col-span-7 space-y-8">
                <ExperienceMediaGallery
                  title="River Ethiope"
                  subtitle="Ethiope East · Abraka"
                  assets={abrakaAssets}
                  aspectClass="aspect-[4/5]"
                  maxWidthClass="max-w-[460px]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                  <div className="border-t border-[#D8D1C5] pt-4">
                    <h3 className="font-display text-xl text-[#171614]">Ethiope River</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5C574F]">
                      Clear spring fed inland waterway flowing through Abraka, appreciated for riverside calm.
                    </p>
                  </div>
                  <div className="border-t border-[#D8D1C5] pt-4">
                    <h3 className="font-display text-xl text-[#171614]">McCarthy Beach</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5C574F]">
                      Independent riverside recreation spot situated along the banks of the Ethiope River.
                    </p>
                  </div>
                  <div className="border-t border-[#D8D1C5] pt-4">
                    <h3 className="font-display text-xl text-[#171614]">Abraka Turf &amp; Country Club</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5C574F]">
                      Independent equestrian and leisure destination set on expansive greenery in Abraka.
                    </p>
                  </div>
                </div>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* 06. LOCATION, CONTACT & BOOKING CLARITY */}
        <section className="border-t border-[#E6E1D8] bg-[#FAF9F6]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7 space-y-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                  06. Location &amp; Reservations
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
