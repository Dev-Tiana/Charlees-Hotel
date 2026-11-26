import type { Metadata } from 'next';
import { AdminSetupClient } from '@/components/admin/AdminSetupClient';
import { hasOwnerAccount } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Initial Administrator Setup',
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage() {
  const ownerExists = await hasOwnerAccount();
  const requiresServerPasscode = Boolean(process.env.ADMIN_BOOTSTRAP_PASSCODE);

  return (
    <AdminSetupClient
      hasOwner={ownerExists}
      requiresServerPasscode={requiresServerPasscode}
    />
  );
}
