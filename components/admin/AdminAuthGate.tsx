'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Info, Loader2, Lock } from 'lucide-react';
import { RoleSlug } from '@/lib/types';
import type { DevPreviewStaffCard } from '@/lib/db/seed-data';
import { AdminWorkspace } from '@/components/admin/AdminWorkspace';
import { AdminSnapshotData } from '@/components/admin/admin-types';

export interface StaffSessionClient {
  userId: string;
  staffId: string;
  email: string;
  fullName: string;
  role: RoleSlug;
}

interface AdminAuthGateProps {
  initialSession: StaffSessionClient | null;
  initialHasOwner: boolean;
  initialStorageMode: 'supabase_live' | 'preview_runtime';
  initialSnapshot: AdminSnapshotData | null;
  isDevelopmentMode?: boolean;
  devPreviewStaff?: DevPreviewStaffCard[];
}

export function AdminAuthGate({
  initialSession,
  initialHasOwner,
  initialStorageMode,
  initialSnapshot,
  isDevelopmentMode = false,
  devPreviewStaff = [],
}: AdminAuthGateProps) {
  const [session, setSession] = useState<StaffSessionClient | null>(initialSession);
  const [snapshot, setSnapshot] = useState<AdminSnapshotData | null>(initialSnapshot);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewBusyEmail, setPreviewBusyEmail] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter both your staff email address and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Sign in failed. Verify your email and password.');
        return;
      }

      setSnapshot(null);
      setSession(json.session);
    } catch {
      setError('Unable to reach the authentication service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevPreviewLogin = async (previewEmail: string) => {
    setPreviewBusyEmail(previewEmail);
    setError('');
    try {
      const res = await fetch('/api/auth/dev-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: previewEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Unable to enter Development Mode preview.');
        return;
      }
      setSnapshot(null);
      setSession(json.session);
    } catch {
      setError('Unable to start Development Mode preview session.');
    } finally {
      setPreviewBusyEmail(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSnapshot(null);
    setSession(null);
    setPassword('');
  };

  if (session) {
    return (
      <AdminWorkspace
        session={session}
        storageMode={initialStorageMode}
        initialSnapshot={snapshot}
        isDevelopmentMode={isDevelopmentMode}
        devPreviewStaff={devPreviewStaff}
        onSwitchDevRole={handleDevPreviewLogin}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2EFE9] flex flex-col items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Staff Sign-In Form */}
        <div
          className={`${
            isDevelopmentMode && devPreviewStaff.length > 0
              ? 'lg:col-span-6'
              : 'lg:col-span-12 max-w-md mx-auto w-full'
          } bg-white border border-[#E6E1D8] p-8 space-y-6 shadow-[0_14px_40px_rgba(23,22,20,0.06)]`}
        >
          <div className="space-y-2 border-b border-[#EFEAE0] pb-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C6822]">
                Charlees Operations
              </span>
              <Link href="/" className="text-xs text-[#5C574F] hover:text-[#171614] transition-colors">
                Public Website
              </Link>
            </div>
            <h1 className="font-display text-3xl font-normal text-[#171614]">
              Staff Sign In
            </h1>
            <p className="text-xs leading-relaxed text-[#5C574F]">
              {isDevelopmentMode
                ? 'Development Mode active: use a seeded staff account or choose a role preview panel on the right.'
                : 'Sign in with your authorized Charlees Hotel staff email address and password.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="auth-email"
                className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@charleeshotel.com"
                className="w-full h-11 px-3 text-sm border border-[#D8D1C5] bg-[#FAF9F6] text-[#171614] focus:outline-none focus:border-[#0D0D0E]"
              />
            </div>

            <div>
              <label
                htmlFor="auth-pass"
                className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Password
              </label>
              <input
                id="auth-pass"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 text-sm border border-[#D8D1C5] bg-[#FAF9F6] text-[#171614] focus:outline-none focus:border-[#0D0D0E]"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 p-3"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] disabled:opacity-60 transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lock className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="border-t border-[#EFEAE0] pt-4 flex items-center justify-between text-[11px] text-[#6B6459]">
            <span>
              {initialStorageMode === 'supabase_live'
                ? 'Live Supabase Auth'
                : 'Development Mode · Local Mock Store'}
            </span>
            {!initialHasOwner ? (
              <Link
                href="/admin/setup"
                className="text-[#8C6822] hover:text-[#171614] underline"
              >
                Initial Administrator Setup
              </Link>
            ) : null}
          </div>
        </div>

        {/* Right: Development Mode Instant Role Preview */}
        {isDevelopmentMode && devPreviewStaff.length > 0 ? (
          <section className="lg:col-span-6 bg-white border border-[#E6E1D8] p-8 space-y-5 shadow-[0_14px_40px_rgba(23,22,20,0.06)]">
            <div className="flex items-start gap-3 bg-[#F8F4EC] border border-[#DFD4BE] p-3.5 text-xs text-[#3F3A32]">
              <Info className="w-4 h-4 text-[#8C6822] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold uppercase tracking-[0.14em] text-[11px] text-[#73541A]">
                  Development Mode Role Preview
                </p>
                <p className="mt-0.5 leading-relaxed">
                  Supabase Auth is paused while finishing the management UI. Select any role below to preview its permissions and test dashboard modules with temporary mock data.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {devPreviewStaff.map((member) => {
                const isBusy = previewBusyEmail === member.email;
                return (
                  <button
                    key={member.staffId}
                    type="button"
                    disabled={Boolean(previewBusyEmail)}
                    onClick={() => handleDevPreviewLogin(member.email)}
                    className="w-full text-left border border-[#E6E1D8] bg-[#FAF9F6] p-3.5 hover:border-[#0D0D0E] transition-colors flex items-center justify-between gap-4 disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#171614]">
                          {member.roleName}
                        </span>
                        <span className="text-[11px] font-mono text-[#6B6459]">
                          {member.email}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#5C574F]">
                        {member.summary}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] font-medium text-[#8C6822]">
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <>
                          <span>Enter</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
