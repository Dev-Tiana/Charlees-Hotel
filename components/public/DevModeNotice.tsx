import { Info } from 'lucide-react';

export function DevModeNotice({
  title = 'Development Mode · Local Mock Data',
  description = 'Supabase database and live payment integrations are paused while finishing the website interface. Reservations, transfer proofs, and cancellations run on temporary local mock data and are not permanently saved.',
  tone = 'light',
}: {
  title?: string;
  description?: string;
  tone?: 'light' | 'dark';
}) {
  const isDark = tone === 'dark';

  return (
    <div
      role="status"
      className={`border px-4 py-3 text-xs leading-relaxed flex items-start gap-3 ${
        isDark
          ? 'bg-[#171512] border-[#3A3224] text-[#E7E2D9]'
          : 'bg-[#F8F4EC] border-[#DFD4BE] text-[#3F3A32]'
      }`}
    >
      <Info
        className={`w-4 h-4 shrink-0 mt-0.5 ${
          isDark ? 'text-[#D6B46A]' : 'text-[#8C6822]'
        }`}
        aria-hidden="true"
      />
      <div>
        <p
          className={`font-semibold uppercase tracking-[0.14em] text-[11px] ${
            isDark ? 'text-[#D6B46A]' : 'text-[#73541A]'
          }`}
        >
          {title}
        </p>
        <p className="mt-0.5">{description}</p>
      </div>
    </div>
  );
}
