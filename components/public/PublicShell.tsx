import { ReactNode } from 'react';
import { HotelDataService } from '@/lib/services/hotel-data-service';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { AnalyticsTracker } from '@/components/public/AnalyticsTracker';
import { PublicLiveChatWidget } from '@/components/public/PublicLiveChatWidget';

export async function PublicShell({ children }: { children: ReactNode }) {
  const [settings, media] = await Promise.all([
    HotelDataService.getHotelSettings(),
    HotelDataService.getMediaAssets(true),
  ]);

  const logoAsset = media.find((m) => m.section_key === 'logo') ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#171614]">
      <SiteHeader logoAsset={logoAsset} />
      <div className="flex-1">{children}</div>
      <SiteFooter logoAsset={logoAsset} settings={settings} />
      <PublicLiveChatWidget />
      <AnalyticsTracker measurementId={settings.analytics.gaMeasurementId} />
    </div>
  );
}
