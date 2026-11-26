'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { RoleSlug } from '@/lib/types';
import { formatLagosDateTime, formatNaira } from '@/lib/timezone';
import { getRoleLabel, roleHasPermission } from '@/lib/auth/permissions';
import { AdminSnapshotData } from '@/components/admin/admin-types';

export function StaffManagementModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canManage = roleHasPermission(role, 'staff:manage');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleSlug, setRoleSlug] = useState<RoleSlug>('receptionist');
  const [department, setDepartment] = useState('Front Desk');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, roleSlug, department, password }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || 'Could not add staff.');
    else {
      setFullName('');
      setEmail('');
      setPassword('');
      await onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {canManage ? (
        <form onSubmit={handleAddStaff} className="bg-white border border-[#E5DFD5] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#171614]">Add Staff Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <input
              type="email"
              required
              placeholder="Work Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Temporary Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value as RoleSlug)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              <option value="administrator">Administrator</option>
              <option value="manager">Manager</option>
              <option value="receptionist">Receptionist</option>
              <option value="accountant">Accountant</option>
              <option value="housekeeping">Housekeeping</option>
            </select>
            <input
              type="text"
              required
              placeholder="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <button type="submit" className="h-9 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium hover:bg-[#24211D]">
              Create Staff Member
            </button>
          </div>
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </form>
      ) : null}

      <div className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Role</th>
              <th className="py-3 px-4 font-medium">Department</th>
              <th className="py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {data.staff.map((member) => (
              <tr key={member.id} className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-medium text-[#171614]">{member.full_name}</td>
                <td className="py-3 px-4 text-[#5C574F]">{member.email}</td>
                <td className="py-3 px-4 font-medium text-[#171614]">{getRoleLabel(member.role_slug)}</td>
                <td className="py-3 px-4 text-[#5C574F]">{member.department}</td>
                <td className="py-3 px-4 capitalize text-[#3F3A32]">{member.employment_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportsModule({ data }: { data: AdminSnapshotData }) {
  const confirmedByCategory = data.categories.map((cat) => {
    const matchingRes = data.reservations.filter(
      (r) => r.category_id === cat.id && r.payment_status === 'paid'
    );
    const rev = matchingRes.reduce((s, r) => s + r.total_amount_ngn, 0);
    return { name: cat.name, count: matchingRes.length, revenue: rev };
  });

  const paystackTotal = data.payments
    .filter((p) => p.method === 'online_paystack' && p.status === 'confirmed')
    .reduce((s, p) => s + p.amount_ngn, 0);
  const transferTotal = data.payments
    .filter((p) => p.method === 'bank_transfer' && p.status === 'confirmed')
    .reduce((s, p) => s + p.amount_ngn, 0);
  const posTotal = data.payments
    .filter((p) => p.method === 'pos' && p.status === 'confirmed')
    .reduce((s, p) => s + p.amount_ngn, 0);

  const exportCsv = () => {
    const rows = [
      ['Booking Ref', 'Guest', 'Email', 'Check In', 'Check Out', 'Status', 'Payment Status', 'Total NGN'],
      ...data.reservations.map((res) => {
        const guest = data.guests.find((g) => g.id === res.primary_guest_id);
        return [
          res.booking_reference,
          guest?.full_name || '',
          guest?.email || '',
          res.check_in_date,
          res.check_out_date,
          res.status,
          res.payment_status,
          String(res.total_amount_ngn),
        ];
      }),
    ];
    const csv = rows
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'charlees-reservations-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5DFD5] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#171614]">Revenue, Channel &amp; Cancellation Reports</h2>
          <p className="text-xs text-[#6B6459]">
            Live financial breakdown derived from verified reservations, payments, cancellations, and refunds.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-4 py-2 text-xs font-medium hover:bg-[#24211D] whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Download CSV</span>
        </button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5DFD5] p-5">
          <p className="text-xs text-[#6B6459]">Paystack Verified Revenue</p>
          <p className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#171614]">
            {formatNaira(paystackTotal)}
          </p>
        </div>
        <div className="bg-white border border-[#E5DFD5] p-5">
          <p className="text-xs text-[#6B6459]">GT Bank Verified Revenue</p>
          <p className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#171614]">
            {formatNaira(transferTotal)}
          </p>
        </div>
        <div className="bg-white border border-[#E5DFD5] p-5">
          <p className="text-xs text-[#6B6459]">Front Desk POS Revenue</p>
          <p className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#171614]">
            {formatNaira(posTotal)}
          </p>
        </div>
      </section>

      <section className="bg-white border border-[#E5DFD5] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#171614]">Confirmed Revenue by Room Category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {confirmedByCategory.map((row) => (
            <div key={row.name} className="border border-[#E5DFD5] p-4">
              <p className="text-xs text-[#6B6459]">{row.name}</p>
              <p className="mt-1 text-lg font-mono tabular-nums font-semibold text-[#171614]">
                {formatNaira(row.revenue)}
              </p>
              <p className="text-[11px] text-[#6B6459]">{row.count} paid bookings</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <div className="p-4 border-b border-[#EFEAE0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#171614]">Guest Directory</h3>
          <span className="text-xs font-mono tabular-nums text-[#6B6459]">{data.guests.length} guests</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Guest Name</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Phone</th>
              <th className="py-3 px-4 font-medium text-right">Bookings</th>
              <th className="py-3 px-4 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {data.guests.map((guest) => {
              const stays = data.reservations.filter((r) => r.primary_guest_id === guest.id).length;
              return (
                <tr key={guest.id} className="hover:bg-[#FAF8F4]">
                  <td className="py-2.5 px-4 font-medium text-[#171614]">{guest.full_name}</td>
                  <td className="py-2.5 px-4 text-[#5C574F]">{guest.email}</td>
                  <td className="py-2.5 px-4 font-mono text-[#5C574F]">{guest.phone}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#171614]">{stays}</td>
                  <td className="py-2.5 px-4 text-[#6B6459] max-w-xs truncate">{guest.notes || 'Standard profile'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function AuditLogsModule({ data }: { data: AdminSnapshotData }) {
  const [search, setSearch] = useState('');
  const filtered = data.auditLogs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.actor_email.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      JSON.stringify(log.details).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E5DFD5] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#171614]">Immutable Operations Audit Trail</h2>
          <p className="text-xs text-[#6B6459]">Chronological log of reservations, payment confirmations, cancellation reviews, and room updates.</p>
        </div>
        <input
          type="search"
          placeholder="Filter actor, action, entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
        />
      </div>

      <section className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Timestamp (WAT)</th>
              <th className="py-3 px-4 font-medium">Actor</th>
              <th className="py-3 px-4 font-medium">Action</th>
              <th className="py-3 px-4 font-medium">Entity</th>
              <th className="py-3 px-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#6B6459]">
                  No audit events match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[#FAF8F4]">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-[#5C574F] whitespace-nowrap">
                    {formatLagosDateTime(log.created_at)}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="text-[#171614]">{log.actor_email}</span>{' '}
                    <span className="text-[#6B6459]">({log.actor_role})</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[#171614]">{log.action}</td>
                  <td className="py-2.5 px-4 font-mono text-[#5C574F]">{log.entity_type}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-[#6B6459] max-w-md truncate">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function SettingsModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canManage = roleHasPermission(role, 'settings:manage');
  const [profile, setProfile] = useState(data.settings.hotel_profile);
  const [policy, setPolicy] = useState(data.settings.cancellation_policy);
  const [analytics, setAnalytics] = useState(data.settings.analytics);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotel_profile: profile,
        cancellation_policy: policy,
        analytics,
      }),
    });
    if (res.ok) {
      setSavedMsg('Settings saved and audited.');
      await onRefresh();
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white border border-[#E5DFD5] p-5 space-y-2 text-xs">
        <p className="font-semibold text-[#171614]">Database &amp; Storage Connection Status</p>
        <p className="text-[#5C574F]">
          Active Engine:{' '}
          <span className="font-mono font-medium text-[#171614]">
            {data.storageMode === 'supabase_live'
              ? 'Supabase PostgreSQL + Storage (Live)'
              : 'Development Mode — Local Mock Store (Supabase integration paused while finishing UI workflows. Schema and configuration preserved.)'}
          </span>
        </p>
      </div>

      <section className="bg-white border border-[#E5DFD5] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#171614]">Hotel Contact &amp; Designated Bank Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#5C574F] mb-1">Reception Phone</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-[#5C574F] mb-1">WhatsApp Number</label>
            <input
              type="text"
              value={profile.whatsapp}
              onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-[#5C574F] mb-1">Bank Name (For Guest Transfers)</label>
            <input
              type="text"
              value={profile.bankName}
              onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-[#5C574F] mb-1">Account Name</label>
            <input
              type="text"
              value={profile.bankAccountName}
              onChange={(e) => setProfile({ ...profile, bankAccountName: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-[#5C574F] mb-1">Account Number</label>
            <input
              type="text"
              value={profile.bankAccountNumber}
              onChange={(e) => setProfile({ ...profile, bankAccountNumber: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
          </div>
          <div>
            <label className="block text-[#5C574F] mb-1">Dining Status &amp; Hours Note</label>
            <input
              type="text"
              value={profile.diningStatusNote}
              onChange={(e) => setProfile({ ...profile, diningStatusNote: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-[#E5DFD5] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#171614]">Cancellation &amp; Refund Policy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#5C574F] mb-1">Eligible Refund Percentage (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={policy.refundPercentageOnEligible}
              onChange={(e) =>
                setPolicy({ ...policy, refundPercentageOnEligible: Number(e.target.value) })
              }
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
          </div>
          <div>
            <label className="block text-[#5C574F] mb-1">Refund Timeline Note</label>
            <input
              type="text"
              value={policy.refundTimelineNote}
              onChange={(e) => setPolicy({ ...policy, refundTimelineNote: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-[#3F3A32]">
            <input
              type="checkbox"
              checked={policy.refundPercentageConfirmedByManagement}
              onChange={(e) =>
                setPolicy({ ...policy, refundPercentageConfirmedByManagement: e.target.checked })
              }
            />
            <span>Mark refund allocation confirmed by management</span>
          </label>
          <label className="inline-flex items-center gap-2 text-[#3F3A32]">
            <input
              type="checkbox"
              checked={policy.allowManagerExceptionOverride}
              onChange={(e) =>
                setPolicy({ ...policy, allowManagerExceptionOverride: e.target.checked })
              }
            />
            <span>Allow authorized manager exception overrides</span>
          </label>
        </div>
      </section>

      <section className="bg-white border border-[#E5DFD5] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#171614]">Analytics &amp; Search Console</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#5C574F] mb-1">GA4 Measurement ID</label>
            <input
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={analytics.gaMeasurementId}
              onChange={(e) => setAnalytics({ ...analytics, gaMeasurementId: e.target.value })}
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
          </div>
          <div>
            <label className="block text-[#5C574F] mb-1">Search Console Verification Token</label>
            <input
              type="text"
              value={analytics.searchConsoleVerification}
              onChange={(e) =>
                setAnalytics({ ...analytics, searchConsoleVerification: e.target.value })
              }
              className="w-full h-9 px-3 border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
          </div>
        </div>
      </section>

      {savedMsg ? (
        <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 p-3">{savedMsg}</p>
      ) : null}

      {canManage ? (
        <button
          type="submit"
          className="bg-[#0D0D0E] text-[#FAF9F6] px-6 py-2.5 text-xs font-medium uppercase tracking-wider hover:bg-[#24211D]"
        >
          Save Hotel Configuration
        </button>
      ) : null}
    </form>
  );
}
