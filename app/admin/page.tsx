import type { Metadata } from 'next';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminSnapshotData } from '@/components/admin/admin-types';
import { getCurrentStaffSession, hasOwnerAccount } from '@/lib/auth/session';
import { HotelDataService } from '@/lib/services/hotel-data-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hotel Management System',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const [session, ownerExists] = await Promise.all([
    getCurrentStaffSession(),
    hasOwnerAccount(),
  ]);

  let initialSnapshot: AdminSnapshotData | null = null;
  if (session) {
    const [snapshot, staff] = await Promise.all([
      HotelDataService.getAdminSnapshot(),
      HotelDataService.getStaffUsers(),
    ]);
    const sanitizedStaff = staff.map(({ password_hash: _ph, ...rest }) => rest);
    initialSnapshot = {
      ...snapshot,
      staff: sanitizedStaff,
    };
  }

  const storageMode = HotelDataService.getStorageMode();
  const isDevelopmentMode = HotelDataService.isDevelopmentMockMode();
  const devPreviewStaff = isDevelopmentMode
    ? HotelDataService.getDevPreviewStaffAccounts()
    : [];

  return (
    <AdminAuthGate
      initialSession={session}
      initialHasOwner={ownerExists}
      initialStorageMode={storageMode}
      initialSnapshot={initialSnapshot}
      isDevelopmentMode={isDevelopmentMode}
      devPreviewStaff={devPreviewStaff}
    />
  );
}
