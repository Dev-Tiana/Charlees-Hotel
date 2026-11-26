import { NextRequest, NextResponse } from 'next/server';
import { getCurrentStaffSession, hasOwnerAccount } from '@/lib/auth/session';
import { getStorageMode } from '@/lib/db/store';

export async function GET(req: NextRequest) {
  const session = await getCurrentStaffSession(req);
  const ownerExists = await hasOwnerAccount();
  return NextResponse.json({
    authenticated: Boolean(session),
    session,
    needsBootstrap: !ownerExists,
    storageMode: getStorageMode(),
  });
}
