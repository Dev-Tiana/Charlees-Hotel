import type { MetadataRoute } from 'next';

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.APP_URL ||
  'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/rooms',
    '/rooms/standard-room',
    '/rooms/twin-room',
    '/rooms/deluxe-room',
    '/rooms/luxury-room',
    '/facilities',
    '/experiences',
    '/experiences/river-ethiope',
    '/experiences/abraka-market',
    '/experiences/abraka-top',
    '/about',
    '/gallery',
    '/dining',
    '/contact',
    '/faq',
    '/book',
    '/find-booking',
    '/manage-booking',
    '/policies/privacy',
    '/policies/terms',
    '/policies/cancellation',
  ];

  const now = new Date();
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' || route === '/rooms' ? 'weekly' : 'monthly',
    priority: route === '' ? 1.0 : route.startsWith('/rooms') || route === '/book' ? 0.9 : 0.7,
  }));
}
