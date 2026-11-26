'use client';

import { useState, useSyncExternalStore } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackConversionEvent(
  eventName: string,
  path: string,
  metadata?: Record<string, unknown>
) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, { page_path: path, ...metadata });
    }
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: eventName, path, metadata }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Non-blocking analytics beacon
  }
}

function subscribeConsent() {
  return () => undefined;
}

function getConsentSnapshot(): 'unknown' | 'accepted' | 'declined' {
  try {
    const saved = document.cookie
      .split('; ')
      .find((c) => c.startsWith('charlees_analytics_consent='))
      ?.split('=')[1];
    if (saved === 'accepted' || saved === 'declined') {
      return saved;
    }
  } catch {
    // Ignore cookie read error
  }
  return 'unknown';
}

function getConsentServerSnapshot(): 'unknown' | 'accepted' | 'declined' {
  return 'unknown';
}

export function AnalyticsTracker({ measurementId }: { measurementId?: string }) {
  const cookieConsent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );
  const [overrideConsent, setOverrideConsent] = useState<'accepted' | 'declined' | null>(null);
  const consent = overrideConsent ?? cookieConsent;

  const handleChoice = (choice: 'accepted' | 'declined') => {
    document.cookie = `charlees_analytics_consent=${choice}; Path=/; Max-Age=15552000; SameSite=Lax`;
    setOverrideConsent(choice);
  };

  return (
    <>
      {consent === 'accepted' && measurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="charlees-ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}');
            `}
          </Script>
        </>
      ) : null}

      {consent === 'unknown' ? (
        <aside
          aria-label="Cookie and analytics preference"
          className="fixed bottom-4 right-4 z-30 max-w-sm bg-[#0D0D0E] text-[#FAF9F6] border border-[#2C2822] p-4 shadow-lg"
        >
          <p className="text-xs leading-relaxed text-[#CFC9BE] mb-3">
            Charlees Hotel &amp; Suites uses essential session storage for reservations and optional analytics when permitted.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleChoice('accepted')}
              className="bg-[#D6B46A] text-[#0D0D0E] px-3.5 py-1.5 text-xs font-medium tracking-wide hover:bg-[#E2C581]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleChoice('declined')}
              className="border border-[#3B362E] text-[#CFC9BE] px-3.5 py-1.5 text-xs font-medium hover:text-white"
            >
              Essential Only
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
