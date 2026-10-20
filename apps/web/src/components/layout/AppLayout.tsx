import {
  LayoutDashboard,
  Users,
  Database,
  Compass,
  LinkIcon,
  Megaphone,
  Calendar,
  MessageCircle,
  Activity,
  ListTodo,
  BarChart3,
  CreditCard,
  Receipt,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../stores/auth';

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

export function AppLayout({ children }: { children: ReactNode }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const tenants = useAuthStore((s) => s.tenants);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? tenants[0];

  const handleLogout = async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-bg text-fg">
      <aside className="w-64 shrink-0 border-r border-line bg-panel flex flex-col">
        <div className="p-5 border-b border-line">
          <Link to="/" className="text-base font-semibold tracking-tight">
            EakPromosi
          </Link>
          {activeTenant && (
            <select
              value={activeTenant.id}
              onChange={(e) => setActiveTenant(e.target.value)}
              className="mt-3 w-full text-xs bg-sunk border border-line rounded-md px-2 py-1.5 text-fg"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.planCode}
                </option>
              ))}
            </select>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-muted">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                          isActive ? 'bg-tg/10 text-tg-deep font-medium' : 'text-fg hover:bg-sunk',
                        )
                      }
                    >
                      <item.icon size={16} aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {user?.isPlatformAdmin && (
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-muted">ADMIN</div>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    isActive ? 'bg-violet/10 text-violet font-medium' : 'text-fg hover:bg-sunk',
                  )
                }
              >
                <Shield size={16} aria-hidden /> Admin Panel
              </NavLink>
            </div>
          )}
        </nav>
        <div className="p-3 border-t border-line">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user?.displayName}</p>
              <p className="text-[10px] text-muted truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-muted hover:text-fg"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
