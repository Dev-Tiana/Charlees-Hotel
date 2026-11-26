import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { RoleSlug } from '@/lib/types';
import { hasActiveOwnerAccount } from '@/lib/db/store';
import { PermissionCode, roleHasPermission } from '@/lib/auth/permissions';

export const SESSION_COOKIE_NAME = 'charlees_staff_session';

// Process-wide fallback signing key if AUTH_SESSION_SECRET is not provided in env
const globalForAuth = globalThis as typeof globalThis & {
  __charleesSessionSecret?: string;
};

function getSessionSecret(): string {
  if (process.env.AUTH_SESSION_SECRET) {
    return process.env.AUTH_SESSION_SECRET;
  }
  if (!globalForAuth.__charleesSessionSecret) {
    globalForAuth.__charleesSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalForAuth.__charleesSessionSecret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export interface SessionPayload {
  userId: string;
  staffId: string;
  email: string;
  fullName: string;
  role: RoleSlug;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(full), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(encoded)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentStaffSession(
  req?: NextRequest
): Promise<SessionPayload | null> {
  // 1. Check Authorization: Bearer header if passed
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = verifySessionToken(token);
      if (verified) return verified;
    }
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (cookieToken) {
      return verifySessionToken(cookieToken);
    }
    return null;
  }

  // 2. Server Component / Route Handler cookie & header lookup
  const hdrs = await headers();
  const authHeader = hdrs.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const verified = verifySessionToken(authHeader.slice(7).trim());
    if (verified) return verified;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireStaffPermission(
  req: NextRequest,
  permission: PermissionCode
): Promise<SessionPayload> {
  // Verify same-origin for cookie-authenticated mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          throw new Error('Invalid request origin.');
        }
      } catch {
        throw new Error('Invalid request origin.');
      }
    }
  }

  const session = await getCurrentStaffSession(req);
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  if (!roleHasPermission(session.role, permission)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export async function hasOwnerAccount(): Promise<boolean> {
  return hasActiveOwnerAccount();
}

export function buildSessionCookieHeader(token: string, maxAgeSeconds = 43200): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`;
}
