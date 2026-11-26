'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeDollarSign,
  Ban,
  BedDouble,
  CalendarCheck2,
  CalendarRange,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  History,
  Image as ImageIcon,
  Info,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  RotateCcw,
  Settings,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { DevPreviewStaffCard } from '@/lib/db/seed-data';
import type { StaffSessionClient } from '@/components/admin/AdminAuthGate';
import type { AdminSnapshotData } from '@/components/admin/admin-types';
import { getRoleLabel, roleHasPermission, type PermissionCode } from '@/lib/auth/permissions';

function ModuleSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 bg-white border border-[#E5DFD5] animate-pulse" />
      <div className="h-64 bg-white border border-[#E5DFD5] animate-pulse" />
    </div>
  );
}

const OverviewModule = dynamic(
  () => import('@/components/admin/modules/OverviewModule').then((m) => m.OverviewModule),
  { loading: () => <ModuleSkeleton /> }
);
const ReservationsModule = dynamic(
  () => import('@/components/admin/modules/ReservationsModule').then((m) => m.ReservationsModule),
  { loading: () => <ModuleSkeleton /> }
);
const RoomManagementModule = dynamic(
  () =>
    import('@/components/admin/modules/RoomsAndAvailabilityModules').then(
      (m) => m.RoomManagementModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const RoomAvailabilityModule = dynamic(
  () =>
    import('@/components/admin/modules/RoomsAndAvailabilityModules').then(
      (m) => m.RoomAvailabilityModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const RatesAndPackagesModule = dynamic(
  () =>
    import('@/components/admin/modules/RoomsAndAvailabilityModules').then(
      (m) => m.RatesAndPackagesModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const PaymentsTransactionsModule = dynamic(
  () =>
    import('@/components/admin/modules/FinanceModules').then(
      (m) => m.PaymentsTransactionsModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const BankTransferConfirmationsModule = dynamic(
  () =>
    import('@/components/admin/modules/FinanceModules').then(
      (m) => m.BankTransferConfirmationsModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const CancellationRequestsModule = dynamic(
  () =>
    import('@/components/admin/modules/FinanceModules').then(
      (m) => m.CancellationRequestsModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const RefundManagementModule = dynamic(
  () =>
    import('@/components/admin/modules/FinanceModules').then(
      (m) => m.RefundManagementModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const HousekeepingModule = dynamic(
  () =>
    import('@/components/admin/modules/OperationsModules').then((m) => m.HousekeepingModule),
  { loading: () => <ModuleSkeleton /> }
);
const MaintenanceModule = dynamic(
  () =>
    import('@/components/admin/modules/OperationsModules').then((m) => m.MaintenanceModule),
  { loading: () => <ModuleSkeleton /> }
);
const MediaManagementModule = dynamic(
  () =>
    import('@/components/admin/modules/OperationsModules').then(
      (m) => m.MediaManagementModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const LiveChatModule = dynamic(
  () => import('@/components/admin/modules/LiveChatModule').then((m) => m.LiveChatModule),
  { loading: () => <ModuleSkeleton /> }
);
const StaffManagementModule = dynamic(
  () =>
    import('@/components/admin/modules/AdminSystemModules').then(
      (m) => m.StaffManagementModule
    ),
  { loading: () => <ModuleSkeleton /> }
);
const ReportsModule = dynamic(
  () => import('@/components/admin/modules/AdminSystemModules').then((m) => m.ReportsModule),
  { loading: () => <ModuleSkeleton /> }
);
const AuditLogsModule = dynamic(
  () => import('@/components/admin/modules/AdminSystemModules').then((m) => m.AuditLogsModule),
  { loading: () => <ModuleSkeleton /> }
);
const SettingsModule = dynamic(
  () => import('@/components/admin/modules/AdminSystemModules').then((m) => m.SettingsModule),
  { loading: () => <ModuleSkeleton /> }
);

interface NavItem {
  id: string;
  group: 'Operations' | 'Revenue & Finance' | 'Property & Care' | 'Administration';
  label: string;
  icon: typeof LayoutDashboard;
  permission: PermissionCode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', group: 'Operations', label: 'Dashboard Overview', icon: LayoutDashboard, permission: 'dashboard:view' },
  { id: 'reservations', group: 'Operations', label: 'Reservations', icon: CalendarCheck2, permission: 'reservations:view' },
  { id: 'availability', group: 'Operations', label: 'Room Availability', icon: CalendarRange, permission: 'availability:view' },
  { id: 'rooms', group: 'Operations', label: 'Room Management', icon: BedDouble, permission: 'rooms:view' },
  { id: 'rates', group: 'Operations', label: 'Rates & Packages', icon: BadgeDollarSign, permission: 'rates:manage' },

  { id: 'payments', group: 'Revenue & Finance', label: 'Payments & Transactions', icon: CreditCard, permission: 'payments:view' },
  { id: 'bank_transfers', group: 'Revenue & Finance', label: 'Bank Transfers', icon: Landmark, permission: 'payments:verify' },
  { id: 'cancellations', group: 'Revenue & Finance', label: 'Cancellation Requests', icon: Ban, permission: 'cancellations:view' },
  { id: 'refunds', group: 'Revenue & Finance', label: 'Refund Management', icon: RotateCcw, permission: 'refunds:view' },

  { id: 'chat', group: 'Property & Care', label: 'Live Chat', icon: MessageSquare, permission: 'chat:view' },
  { id: 'housekeeping', group: 'Property & Care', label: 'Housekeeping', icon: ClipboardCheck, permission: 'housekeeping:view' },
  { id: 'maintenance', group: 'Property & Care', label: 'Maintenance', icon: Wrench, permission: 'maintenance:view' },
  { id: 'media', group: 'Property & Care', label: 'Media Management', icon: ImageIcon, permission: 'media:manage' },

  { id: 'staff', group: 'Administration', label: 'Staff Management', icon: Users, permission: 'staff:manage' },
  { id: 'reports', group: 'Administration', label: 'Reports', icon: FileBarChart2, permission: 'reports:view' },
  { id: 'audit', group: 'Administration', label: 'Audit Logs', icon: History, permission: 'audit:view' },
  { id: 'settings', group: 'Administration', label: 'Settings', icon: Settings, permission: 'settings:manage' },
];

const GROUP_ORDER: NavItem['group'][] = [
  'Operations',
  'Revenue & Finance',
  'Property & Care',
  'Administration',
];

export function AdminWorkspace({
  session,
  storageMode,
  initialSnapshot = null,
  isDevelopmentMode = false,
  devPreviewStaff = [],
  onSwitchDevRole,
  onLogout,
}: {
  session: StaffSessionClient;
  storageMode: 'supabase_live' | 'preview_runtime';
  initialSnapshot?: AdminSnapshotData | null;
  isDevelopmentMode?: boolean;
  devPreviewStaff?: DevPreviewStaffCard[];
  onSwitchDevRole?: (email: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [data, setData] = useState<AdminSnapshotData | null>(initialSnapshot);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [loadError, setLoadError] = useState('');
  const [resettingMock, setResettingMock] = useState(false);

  const fetchSnapshot = async () => {
    try {
      const res = await fetch('/api/admin/snapshot');
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error || 'Could not load operational snapshot.');
      } else {
        setData(json as AdminSnapshotData);
        setLoadError('');
      }
    } catch {
      setLoadError('Network error loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetMock = async () => {
    setResettingMock(true);
    try {
      const res = await fetch('/api/admin/dev-reset', { method: 'POST' });
      if (res.ok) {
        await fetchSnapshot();
      }
    } finally {
      setResettingMock(false);
    }
  };

  useEffect(() => {
    if (initialSnapshot) return;
    let active = true;
    fetch('/api/admin/snapshot')
      .then(async (res) => {
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setLoadError(json.error || 'Could not load operational snapshot.');
        } else {
          setData(json as AdminSnapshotData);
          setLoadError('');
        }
      })
      .catch(() => {
        if (active) setLoadError('Network error loading dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialSnapshot]);

  const visibleNav = useMemo(
    () => NAV_ITEMS.filter((item) => roleHasPermission(session.role, item.permission)),
    [session.role]
  );

  const resolvedTab = visibleNav.some((n) => n.id === activeTab)
    ? activeTab
    : visibleNav[0]?.id || 'overview';
  const currentTitle =
    NAV_ITEMS.find((n) => n.id === resolvedTab)?.label || 'Dashboard Overview';

  const counts = useMemo(() => {
    if (!data) return { bankTransfers: 0, cancellations: 0, chat: 0 };
    return {
      bankTransfers: data.payments.filter(
        (p) => p.method === 'bank_transfer' && ['pending', 'pending_verification'].includes(p.status)
      ).length,
      cancellations: data.cancellations.filter((c) => c.status === 'requested').length,
      chat: data.chatConversations.reduce((sum, c) => sum + c.unread_staff_count, 0),
    };
  }, [data]);

  const getCountForTab = (tabId: string): number => {
    if (tabId === 'bank_transfers') return counts.bankTransfers;
    if (tabId === 'cancellations') return counts.cancellations;
    if (tabId === 'chat') return counts.chat;
    return 0;
  };

  const renderNavGroups = (onPick?: () => void) => (
    <div className="space-y-5">
      {GROUP_ORDER.map((group) => {
        const items = visibleNav.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E867A]">
              {group}
            </p>
            {items.map((item) => {
              const Icon = item.icon;
              const active = resolvedTab === item.id;
              const count = getCountForTab(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    onPick?.();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#D6B46A]/15 text-[#D6B46A] border border-[#D6B46A]/35'
                      : 'text-[#C8C1B6] hover:bg-[#191815] hover:text-[#FAF9F6] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {count > 0 ? (
                    <span className="font-mono tabular-nums text-[11px] font-semibold text-[#D6B46A] shrink-0">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#171614] font-sans flex">
      {/* Persistent Left Vertical Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#0D0D0E] text-[#FAF9F6] border-r border-[#26231E]">
        <div className="p-5 border-b border-[#26231E] space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#D6B46A] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Website</span>
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E978B]">
              Charlees Management
            </p>
            <p className="font-display text-lg font-normal text-white mt-0.5 truncate">
              {session.fullName}
            </p>
            <p className="text-[11px] text-[#9E978B]">{getRoleLabel(session.role)}</p>
          </div>
        </div>

        <nav aria-label="Management modules" className="flex-1 p-3 overflow-y-auto">
          {renderNavGroups()}
        </nav>

        <div className="p-4 border-t border-[#26231E] space-y-2 text-xs">
          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center gap-2 text-[#B8B0A3] hover:text-white py-1.5"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {isDevelopmentMode ? (
          <div className="bg-[#181612] text-[#E7E2D9] border-b border-[#2E2920] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Info className="w-3.5 h-3.5 text-[#D6B46A] shrink-0" aria-hidden="true" />
              <span className="truncate">
                <strong className="text-[#D6B46A] font-medium">Development Mode:</strong>{' '}
                Using temporary local mock data while Supabase integration is paused.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onSwitchDevRole && devPreviewStaff.length > 0 ? (
                <select
                  aria-label="Preview staff role"
                  value={session.email}
                  onChange={(e) => onSwitchDevRole(e.target.value)}
                  className="h-7 px-2 text-[11px] bg-[#0D0D0E] border border-[#3A352D] text-[#FAF9F6]"
                >
                  {devPreviewStaff.map((member) => (
                    <option key={member.staffId} value={member.email}>
                      Role: {member.roleName}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                disabled={resettingMock}
                onClick={handleResetMock}
                className="h-7 px-2.5 text-[11px] border border-[#3A352D] text-[#D6B46A] hover:border-[#D6B46A] disabled:opacity-50 whitespace-nowrap"
              >
                {resettingMock ? 'Resetting...' : 'Reset Mock Data'}
              </button>
            </div>
          </div>
        ) : null}

        <header className="h-14 bg-white border-b border-[#E5DFD5] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((p) => !p)}
              className="lg:hidden p-2 border border-[#D8D1C5] text-[#171614]"
              aria-label="Toggle management sidebar"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <p className="text-xs text-[#6B6459] truncate">
              Charlees Hotel &amp; Suites /{' '}
              <span className="font-semibold text-[#171614]">{currentTitle}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="lg:hidden inline-flex items-center gap-1 text-xs font-medium text-[#8C6822] hover:text-[#171614] whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Website</span>
            </Link>
            <span className="hidden sm:inline text-[11px] font-mono text-[#6B6459]">
              {storageMode === 'supabase_live' ? 'Supabase Live' : 'Local Mock Store'}
            </span>
            <button
              type="button"
              onClick={fetchSnapshot}
              className="px-3 py-1.5 text-xs border border-[#D8D1C5] bg-white hover:bg-[#FAF8F4] whitespace-nowrap"
            >
              Refresh Data
            </button>
          </div>
        </header>

        {/* Mobile Drawer Sidebar */}
        {mobileNavOpen ? (
          <div className="lg:hidden bg-[#0D0D0E] text-[#FAF9F6] border-b border-[#26231E] p-4 space-y-4">
            {renderNavGroups(() => setMobileNavOpen(false))}
            <div className="pt-3 border-t border-[#26231E] flex items-center justify-between text-xs">
              <Link href="/" className="text-[#D6B46A]">
                Back to Website
              </Link>
              <button type="button" onClick={onLogout} className="text-red-300">
                Sign Out
              </button>
            </div>
          </div>
        ) : null}

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {loading ? (
            <ModuleSkeleton />
          ) : loadError || !data ? (
            <div className="bg-white border border-red-200 p-6 text-sm text-red-700">
              {loadError || 'Unable to load hotel records.'}
            </div>
          ) : (
            <>
              {resolvedTab === 'overview' && (
                <OverviewModule data={data} onNavigate={setActiveTab} />
              )}
              {resolvedTab === 'reservations' && (
                <ReservationsModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'rooms' && (
                <RoomManagementModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'availability' && <RoomAvailabilityModule data={data} />}
              {resolvedTab === 'rates' && (
                <RatesAndPackagesModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'payments' && (
                <PaymentsTransactionsModule
                  data={data}
                  role={session.role}
                  onRefresh={fetchSnapshot}
                />
              )}
              {resolvedTab === 'bank_transfers' && (
                <BankTransferConfirmationsModule
                  data={data}
                  role={session.role}
                  onRefresh={fetchSnapshot}
                />
              )}
              {resolvedTab === 'cancellations' && (
                <CancellationRequestsModule
                  data={data}
                  role={session.role}
                  onRefresh={fetchSnapshot}
                />
              )}
              {resolvedTab === 'refunds' && (
                <RefundManagementModule
                  data={data}
                  role={session.role}
                  onRefresh={fetchSnapshot}
                />
              )}
              {resolvedTab === 'chat' && (
                <LiveChatModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'housekeeping' && (
                <HousekeepingModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'maintenance' && (
                <MaintenanceModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'media' && (
                <MediaManagementModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'staff' && (
                <StaffManagementModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
              {resolvedTab === 'reports' && <ReportsModule data={data} />}
              {resolvedTab === 'audit' && <AuditLogsModule data={data} />}
              {resolvedTab === 'settings' && (
                <SettingsModule data={data} role={session.role} onRefresh={fetchSnapshot} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
