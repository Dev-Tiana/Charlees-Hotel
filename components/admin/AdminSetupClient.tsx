'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';

export function AdminSetupClient({
  hasOwner,
  requiresServerPasscode,
}: {
  hasOwner: boolean;
  requiresServerPasscode: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (hasOwner) {
    return (
      <div className="min-h-screen bg-[#F2EFE9] flex items-center justify-center px-4 py-12 font-sans">
        <div className="w-full max-w-md bg-white border border-[#E6E1D8] p-8 sm:p-10 space-y-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C6822] font-semibold">
            Charlees Operations
          </p>
          <h1 className="font-display text-3xl text-[#171614]">
            Administrator Already Configured
          </h1>
          <p className="text-sm text-[#5C574F] leading-relaxed">
            The primary administrator account has already been initialized. Please proceed to the standard staff sign in portal.
          </p>
          <Link
            href="/admin"
            className="w-full h-11 inline-flex items-center justify-center bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F]"
          >
            Go to Staff Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          passcode: passcode || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Initial administrator setup failed.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Network error during administrator setup.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2EFE9] flex items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-md bg-white border border-[#E6E1D8] p-8 sm:p-10 space-y-6">
        <div className="space-y-2 border-b border-[#EFEAE0] pb-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C6822]">
              Internal Initial Setup
            </span>
            <Link href="/admin" className="text-xs text-[#5C574F] hover:text-[#171614]">
              Staff Sign In
            </Link>
          </div>
          <h1 className="font-display text-3xl text-[#171614]">
            Register Primary Administrator
          </h1>
          <p className="text-xs text-[#5C574F] leading-relaxed">
            One time internal setup for the initial Hotel Owner account. This page locks automatically once configured.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="setup-name"
              className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
            >
              Full Name
            </label>
            <input
              id="setup-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 px-3 text-sm border border-[#D8D1C5] bg-[#FAF9F6] focus:outline-none focus:border-[#0D0D0E]"
            />
          </div>

          <div>
            <label
              htmlFor="setup-email"
              className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
            >
              Administrator Email
            </label>
            <input
              id="setup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 text-sm border border-[#D8D1C5] bg-[#FAF9F6] focus:outline-none focus:border-[#0D0D0E]"
            />
          </div>

          <div>
            <label
              htmlFor="setup-password"
              className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
            >
              Password (Minimum 8 characters)
            </label>
            <input
              id="setup-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 text-sm border border-[#D8D1C5] bg-[#FAF9F6] focus:outline-none focus:border-[#0D0D0E]"
            />
          </div>

          {requiresServerPasscode ? (
            <div>
              <label
                htmlFor="setup-passcode"
                className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#8C6822] mb-1.5"
              >
                Environment Setup Key
              </label>
              <input
                id="setup-passcode"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full h-11 px-3 text-sm border border-[#D8D1C5] bg-[#FAF9F6] focus:outline-none focus:border-[#0D0D0E]"
              />
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 p-3">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{submitting ? 'Creating Account...' : 'Create Owner Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
