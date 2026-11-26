import { NextResponse } from 'next/server';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Charlees Hotel & Suites API',
    storageMode: HotelDataService.getStorageMode(),
    developmentMode: HotelDataService.isDevelopmentMockMode(),
    timezone: 'Africa/Lagos',
  });
}
