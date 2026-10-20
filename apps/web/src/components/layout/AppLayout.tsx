import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  Command,
  Compass,
  CreditCard,
  Database,
  LayoutDashboard,
  LinkIcon,
  LogOut,
  Megaphone,
  MessageCircle,
  Receipt,
  Search,
  Send,
  Settings,
  Shield,
  Users,
  ListTodo,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import type { Subscription } from '@eak/shared';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/accounts', label: 'Telegram Accounts', icon: Users },
      { to: '/groups', label: 'Group & Channel', icon: Database },
    ],
  },
  {
    title: 'AUTOMATION',
    items: [
      { to: '/discovery', label: 'Auto Discovery', icon: Compass },
      { to: '/membership', label: 'Auto Join', icon: LinkIcon },
      { to: '/broadcasts', label: 'Auto Broadcast', icon: Megaphone },
      { to: '/campaigns', label: 'Campaign Management', icon: Calendar },
      { to: '/dm', label: 'Auto-DM & Reply', icon: MessageCircle },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { to: '/monitoring', label: 'Live Monitoring', icon: Activity },
      { to: '/queue', label: 'Task Queue', icon: ListTodo },
      { to: '/reports', label: 'Statistics & Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'BILLING & ACCOUNT',
    items: [
      { to: '/billing/plans', label: 'Subscription & Plans', icon: CreditCard },
      { to: '/billing/payments', label: 'Payment History', icon: Receipt },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function findCrumb(pathname: string): { section: string; title: string } {
  for (const sec of SECTIONS) {
    for (const item of sec.items) {
      if (item.to === pathname || (item.to !== '/' && pathname.startsWith(item.to))) {
        return { section: sec.title, title: item.label };
      }
    }
  }
  if (pathname === '/') return { section: 'WORKSPACE', title: 'Dashboard' };
  return { section: 'WORKSPACE', title: 'Dashboard' };
}

export function AppLayout({ children }: { children: ReactNode }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const tenants = useAuthStore((s) => s.tenants);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const location = useLocation();
  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? tenants[0];
  const crumb = findCrumb(location.pathname);

  const { data: sub } = useQuery({
    queryKey: ['subscriptions', 'current'],
    queryFn: () => apiFetch<Subscription>('/subscriptions/current'),
    staleTime: 60_000,
  });

  const handleLogout = async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clear();
    navigate('/login');
  };

  const initials = (user?.displayName ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-bg text-fg grid grid-cols-[252px_minmax(0,1fr)]">
      <aside className="sticky top-0 self-start h-screen max-h-screen overflow-y-auto scrollbar-thin border-r border-line bg-sunk px-3.5 pt-4 pb-3.5 flex flex-col gap-4">
        <Brand />
        {activeTenant && (
          <WorkspaceSwitcher
            tenants={tenants}
            activeId={activeTenant.id}
            onChange={setActiveTenant}
          />
        )}

        <nav className="flex flex-col gap-5 flex-1 min-h-0">
          {SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-0.5">
              <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted/80">
                {section.title}
              </div>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13.5px] font-medium transition-all duration-150 ease-snap',
                          isActive
                            ? 'bg-panel text-fg shadow-card ring-1 ring-line'
                            : 'text-muted hover:bg-fg/[0.045] hover:text-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute -left-[14px] top-2 bottom-2 w-[3px] rounded-r bg-tg" />
                          )}
                          <item.icon size={16} className={cn(isActive && 'text-tg-ink')} aria-hidden />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {user?.isPlatformAdmin && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted/80">
                ADMIN
              </div>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13.5px] font-medium transition-colors',
                    isActive ? 'bg-violet/10 text-violet font-semibold' : 'text-muted hover:bg-fg/[0.045] hover:text-fg',
                  )
                }
              >
                <Shield size={16} aria-hidden /> Admin Panel
              </NavLink>
            </div>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5">
          {sub && activeTenant ? <PlanUsageCard sub={sub} planCode={activeTenant.planCode} /> : null}
        </div>
      </aside>

      <main className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 glass-top border-b border-line-soft">
          <div className="flex items-center gap-3 px-7 py-3 min-h-[64px]">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted flex items-center gap-1.5">{crumb.section}</div>
              <div className="text-base font-bold tracking-tight truncate">{crumb.title}</div>
            </div>
            <button
              type="button"
              className="hidden md:flex items-center gap-2 h-9 pl-3 pr-2 min-w-[240px] rounded-lg border border-line bg-panel text-muted hover:border-tg/40 hover:shadow-focus-tg transition-all"
            >
              <Search size={14} />
              <span className="flex-1 text-left text-[13px]">Search anything…</span>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-mono px-1.5 py-0.5 rounded border border-line bg-sunk text-muted">
                <Command size={10} />K
              </span>
            </button>
            <button
              type="button"
              className="relative w-9 h-9 grid place-items-center rounded-lg border border-line bg-panel text-muted hover:text-fg hover:bg-sunk transition-colors"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-bad ring-2 ring-panel" />
            </button>
            <div
              className="w-9 h-9 rounded-lg grid place-items-center text-white text-xs font-bold flex-none"
              style={{ background: 'linear-gradient(140deg, #8B7CF7, #2AABEE)' }}
              title={user?.email ?? ''}
            >
              {initials}
            </div>
            <Button variant="ghost" size="sm" iconOnly onClick={handleLogout} aria-label="Logout">
              <LogOut size={16} />
            </Button>
          </div>
        </header>

        <div className="px-7 py-7 pb-14 max-w-[1440px] w-full mx-auto animate-page-in">{children}</div>
      </main>
    </div>
  );
}

function Brand(): JSX.Element {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1.5">
      <div
        className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-tg"
        style={{ background: 'linear-gradient(140deg, #37BBFE 0%, #1E88D6 100%)' }}
      >
        <Send size={16} strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-[15.5px] leading-tight tracking-tight">EakPromosi</p>
        <p className="text-[11.5px] text-muted">Telegram Automation</p>
      </div>
    </Link>
  );
}

function WorkspaceSwitcher({
  tenants,
  activeId,
  onChange,
}: {
  tenants: ReturnType<typeof useAuthStore.getState>['tenants'];
  activeId: string;
  onChange: (id: string) => void;
}): JSX.Element {
  const active = tenants.find((t) => t.id === activeId);
  return (
    <div className="relative">
      <select
        value={activeId}
        onChange={(e) => onChange(e.target.value)}
        className="peer absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Pilih tenant"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} · {t.planCode}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2.5 w-full px-2.5 py-2 border border-line rounded-lg bg-panel peer-hover:border-tg/45 peer-hover:shadow-card transition-all">
        <div className="w-7 h-7 rounded-md bg-tg/10 text-tg-ink grid place-items-center text-xs font-bold flex-none">
          {active?.name?.slice(0, 2).toUpperCase() ?? 'TN'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[13px] truncate">{active?.name ?? 'Tenant'}</p>
          <p className="text-[11.5px] text-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ok inline-block" />
            {active?.planCode?.toUpperCase() ?? 'FREE'}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanUsageCard({ sub, planCode }: { sub: Subscription; planCode: string }): JSX.Element {
  const navigate = useNavigate();
  const broadcastsToday = sub.usage.broadcastsToday;
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 text-white shadow-tg-glow"
      style={{ background: 'radial-gradient(120% 140% at 100% 0%, #4cc6ff 0%, #1E88D6 45%, #145fa8 100%)' }}
    >
      <div className="absolute -right-7 -bottom-10 w-[120px] h-[120px] rounded-full bg-white/5" />
      <p className="text-[11.5px] opacity-85 flex items-center gap-1.5">
        <CreditCard size={12} /> Paket aktif
      </p>
      <p className="text-xl font-bold tracking-tight mt-0.5 mb-2.5">
        {planCode.toUpperCase()} <span className="text-[12px] font-medium opacity-80">· broadcast hari ini</span>
      </p>
      <Progress value={(broadcastsToday / 20) * 100} tone="tg" className="h-1.5 bg-white/20" />
      <div className="flex justify-between items-center mt-2.5 text-[11.5px] opacity-90">
        <span>{broadcastsToday} terkirim</span>
        <button
          type="button"
          onClick={() => navigate('/billing/plans')}
          className="relative z-10 bg-white/20 hover:bg-white/30 transition-colors px-2.5 py-1 rounded-md text-xs font-semibold"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
