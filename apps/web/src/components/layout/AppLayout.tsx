import type { MonitoringSnapshot, Subscription } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  Command,
  Compass,
  CreditCard,
  Database,
  LayoutDashboard,
  LinkIcon,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Receipt,
  Search,
  Send,
  Settings,
  Shield,
  Siren,
  Users,
  ListTodo,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { CommandPalette } from './CommandPalette';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatDateShort, initialsOf } from '../../lib/format';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui/Button';
import { useConfirm } from '../ui/ConfirmDialog';
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator } from '../ui/DropdownMenu';
import { Progress } from '../ui/Progress';
import { useToast } from '../ui/Toast';
import { Tooltip } from '../ui/Tooltip';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: 'live' | 'detect' | 'join' | 'campaigns' | 'reply' | 'accounts';
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
      { to: '/accounts', label: 'Telegram Accounts', icon: Users, badgeKey: 'accounts' },
      { to: '/groups', label: 'Group & Channel', icon: Database },
    ],
  },
  {
    title: 'AUTOMATION',
    items: [
      { to: '/discovery', label: 'Auto Discovery', icon: Compass, badgeKey: 'detect' },
      { to: '/membership', label: 'Auto Join', icon: LinkIcon, badgeKey: 'join' },
      { to: '/broadcasts', label: 'Auto Broadcast', icon: Megaphone },
      { to: '/campaigns', label: 'Campaign Management', icon: Calendar, badgeKey: 'campaigns' },
      { to: '/dm', label: 'Auto-DM & Reply', icon: MessageCircle, badgeKey: 'reply' },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { to: '/monitoring', label: 'Live Monitoring', icon: Activity, badgeKey: 'live' },
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
  return { section: 'WORKSPACE', title: 'Dashboard' };
}

export function AppLayout({ children }: { children: ReactNode }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const tenants = useAuthStore((s) => s.tenants);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? tenants[0];
  const crumb = findCrumb(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Keyboard shortcut: Ctrl/Cmd+K opens the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close drawer on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const { data: sub } = useQuery({
    queryKey: ['subscriptions', 'current'],
    queryFn: () => apiFetch<Subscription>('/subscriptions/current'),
    staleTime: 60_000,
  });

  const { data: snapshot } = useQuery({
    queryKey: ['monitoring', 'snapshot', 'nav'],
    queryFn: () => apiFetch<MonitoringSnapshot>('/monitoring/snapshot'),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  });

  const engineState = useMemo((): 'ok' | 'warn' | 'bad' => {
    if (!snapshot) return 'ok';
    const s = snapshot.services;
    if (s.worker === 'down' || s.redis === 'down') return 'bad';
    if (s.worker === 'degraded' || s.telegram === 'degraded') return 'warn';
    return 'ok';
  }, [snapshot]);

  const engineLabel =
    engineState === 'ok' ? 'Automation aktif' : engineState === 'warn' ? 'Automation terbatas' : 'Automation terhenti';

  const notifCount = snapshot?.recentErrors.length ?? 0;

  const handleLogout = async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clear();
    navigate('/login');
  };

  const handleEmergencyStop = async (): Promise<void> => {
    const ok = await confirm.confirm({
      title: 'Stop darurat seluruh automation?',
      description:
        'Semua broadcast, auto-join, auto-reply, dan auto-discovery akan dihentikan segera. Anda bisa melanjutkannya kembali satu per satu.',
      tone: 'danger',
      confirmLabel: 'Stop darurat',
    });
    if (!ok) return;
    try {
      await apiFetch<void>('/monitoring/emergency-stop', { method: 'POST' });
      toast.success('Perintah stop darurat dikirim.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghentikan automation.');
    }
  };

  const initials = initialsOf(user?.displayName);

  return (
    <div className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-fg/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[260px] lg:w-auto lg:sticky lg:top-0 lg:self-start lg:h-screen lg:max-h-screen',
          'overflow-y-auto scrollbar-thin border-r border-line bg-sunk px-3.5 pt-4 pb-3.5 flex flex-col gap-4',
          'transition-transform duration-200 ease-snap',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={16} />
          </Button>
        </div>

        <nav className="flex flex-col gap-5">
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
                          <span className="flex-1 min-w-0 truncate">{item.label}</span>
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

        <div className="mt-auto pt-4 flex flex-col gap-2.5">
          {sub && activeTenant ? <PlanSummaryCard sub={sub} planCode={activeTenant.planCode} /> : null}
        </div>
      </aside>

      <main className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 glass-top border-b border-line">
          <div className="flex items-center gap-2 md:gap-3 px-4 md:px-7 py-3 min-h-[64px]">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="lg:hidden -ml-1"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={18} />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-muted font-medium hidden sm:block">
                {crumb.section}
                <ChevronDown size={11} className="inline mx-1 -mt-0.5 -rotate-90" />
                <span className="text-fg/80">{activeTenant?.name ?? 'Workspace'}</span>
              </div>
              <div className="text-base font-bold tracking-tight truncate">{crumb.title}</div>
            </div>

            <button
              type="button"
              className="hidden md:flex items-center gap-2 h-9 pl-3 pr-2 min-w-[200px] rounded-lg border border-line bg-panel text-muted hover:border-tg/40 hover:shadow-focus-tg transition-all"
              onClick={() => setPaletteOpen(true)}
            >
              <Search size={14} />
              <span className="flex-1 text-left text-[13px]">Cari campaign, akun, menu…</span>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-mono px-1.5 py-0.5 rounded border border-line bg-sunk text-muted">
                <Command size={10} />K
              </span>
            </button>

            <Tooltip content="Status engine automation">
              <button
                type="button"
                onClick={() => navigate('/monitoring')}
                className={cn(
                  'hidden md:inline-flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-lg border border-line bg-panel text-[12.5px] font-semibold whitespace-nowrap',
                  'hover:bg-sunk transition-colors',
                )}
              >
                <span
                  className={cn(
                    'relative w-2.5 h-2.5 rounded-full inline-block',
                    engineState === 'ok' && 'bg-ok',
                    engineState === 'warn' && 'bg-warn',
                    engineState === 'bad' && 'bg-bad',
                  )}
                >
                  {engineState === 'ok' && (
                    <span className="absolute inset-0 rounded-full animate-pulse-ring bg-ok" />
                  )}
                </span>
                <span>{engineLabel}</span>
                <ChevronDown size={13} className="text-muted" />
              </button>
            </Tooltip>

            <Tooltip content="Stop darurat semua automation">
              <button
                type="button"
                onClick={() => void handleEmergencyStop()}
                className="relative w-9 h-9 grid place-items-center rounded-lg border border-bad/40 bg-panel text-bad hover:bg-bad/10 transition-colors flex-none"
                aria-label="Stop darurat"
              >
                <Siren size={16} />
              </button>
            </Tooltip>

            <Tooltip content="Notifikasi worker">
              <button
                type="button"
                onClick={() => navigate('/monitoring')}
                className="relative w-9 h-9 grid place-items-center rounded-lg border border-line bg-panel text-muted hover:text-fg hover:bg-sunk transition-colors flex-none"
                aria-label="Notifikasi"
              >
                <Bell size={16} />
                {notifCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-bad border-2 border-panel" />
                )}
              </button>
            </Tooltip>

            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg grid place-items-center text-white text-xs font-bold flex-none"
                  style={{ background: 'linear-gradient(140deg, #8B7CF7, #2AABEE)' }}
                  title={user?.email ?? ''}
                >
                  {initials}
                </button>
              }
            >
              <MenuLabel>{user?.displayName ?? 'Pengguna'}</MenuLabel>
              <MenuItem icon={<UserIcon size={14} />} onSelect={() => navigate('/settings')}>
                Profil & keamanan
              </MenuItem>
              <MenuItem icon={<Sparkles size={14} />} onSelect={() => navigate('/billing/plans')}>
                Kelola langganan
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<LogOut size={14} />} danger onSelect={handleLogout}>
                Keluar
              </MenuItem>
            </DropdownMenu>
          </div>
        </header>

        <div
          key={location.pathname}
          className="px-4 md:px-7 py-6 md:py-7 pb-14 max-w-[1440px] w-full mx-auto animate-page-in"
        >
          {children}
        </div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
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

function PlanSummaryCard({ sub, planCode }: { sub: Subscription; planCode: string }): JSX.Element {
  const navigate = useNavigate();
  const now = Date.now();
  const endsAt = sub.endsAt ? new Date(sub.endsAt).getTime() : null;
  const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 86_400_000)) : null;
  const pct = daysLeft == null ? 100 : Math.max(0, Math.min(100, (1 - daysLeft / 31) * 100));

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 text-white shadow-tg-glow"
      style={{ background: 'radial-gradient(120% 140% at 100% 0%, #4cc6ff 0%, #1E88D6 45%, #145fa8 100%)' }}
    >
      <div className="absolute -right-7 -bottom-10 w-[120px] h-[120px] rounded-full bg-white/5" aria-hidden />
      <p className="text-[11.5px] opacity-85 flex items-center gap-1.5">
        <CreditCard size={12} /> Langganan
        <span className="ml-auto bg-white/20 px-2 py-[1px] rounded-full text-[10.5px] font-semibold capitalize">
          {sub.status}
        </span>
      </p>
      <p className="text-xl font-bold tracking-tight mt-0.5 mb-2.5">
        {planCode.toUpperCase()} <span className="text-[12px] font-medium opacity-80">· {sub.period}</span>
      </p>
      <Progress value={pct} tone="tg" className="h-1.5 bg-white/20" />
      <div className="flex justify-between items-center mt-2.5 text-[11.5px] opacity-90">
        <span>
          {daysLeft == null
            ? 'tanpa masa berlaku'
            : daysLeft > 0
              ? `${daysLeft} hari lagi${sub.endsAt ? ` · ${formatDateShort(sub.endsAt)}` : ''}`
              : `berakhir ${sub.endsAt ? formatDateShort(sub.endsAt) : ''}`}
        </span>
        <button
          type="button"
          onClick={() => navigate('/billing/plans')}
          className="relative z-10 bg-white/20 hover:bg-white/30 transition-colors px-2.5 py-1 rounded-md text-xs font-semibold"
        >
          Kelola
        </button>
      </div>
    </div>
  );
}
