import { Building2, CreditCard, LogOut, Menu, Receipt, Shield, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui/Button';

const ITEMS = [
  { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/admin/plans', label: 'Plans', icon: CreditCard },
  { to: '/admin/invoices', label: 'Invoices', icon: Receipt },
];

export function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  const clear = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const current = ITEMS.find((i) => location.pathname.startsWith(i.to))?.label ?? 'Overview';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-fg/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[240px] lg:w-auto lg:sticky lg:top-0 lg:self-start lg:h-screen',
          'border-r border-line bg-sunk px-3.5 pt-4 pb-3.5 flex flex-col gap-4 transition-transform duration-200 ease-snap',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5 px-1.5">
            <div className="w-9 h-9 rounded-xl grid place-items-center bg-violet/15 text-violet">
              <Shield size={16} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[15.5px] leading-tight tracking-tight text-violet">Admin Panel</p>
              <p className="text-[11.5px] text-muted">EakPromosi · platform</p>
            </div>
          </Link>
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

        <nav className="flex flex-col gap-0.5 flex-1">
          {ITEMS.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
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
                  {isActive && <span className="absolute -left-[14px] top-2 bottom-2 w-[3px] rounded-r bg-violet" />}
                  <i.icon size={16} className={cn(isActive && 'text-violet')} />
                  {i.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-3 border border-line rounded-lg bg-panel">
          <p className="text-xs text-muted">Signed in as</p>
          <p className="text-[13px] font-semibold truncate">{user?.email}</p>
          <div className="flex items-center justify-between mt-2.5">
            <Button variant="outline" size="xs" onClick={() => navigate('/')}>
              Keluar panel
            </Button>
            <Button variant="ghost" size="xs" iconOnly onClick={handleLogout} aria-label="Logout">
              <LogOut size={14} />
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 glass-top border-b border-line-soft">
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
              <div className="text-[11px] text-violet font-semibold">ADMIN</div>
              <div className="text-base font-bold tracking-tight">{current}</div>
            </div>
          </div>
        </header>
        <div
          key={location.pathname}
          className="px-4 md:px-7 py-6 md:py-7 pb-14 max-w-[1440px] w-full mx-auto animate-page-in"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
