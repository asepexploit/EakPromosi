import { Building2, CreditCard, Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../stores/auth';

const ITEMS = [
  { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/admin/plans', label: 'Plans', icon: CreditCard },
  { to: '/admin/invoices', label: 'Invoices', icon: Receipt },
];

export function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const handleLogout = async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clear();
    navigate('/login');
  };
  return (
    <div className="min-h-screen flex bg-bg text-fg">
      <aside className="w-56 border-r border-line bg-panel flex flex-col">
        <div className="p-5 border-b border-line">
          <Link to="/admin" className="text-sm font-semibold text-violet">Admin Panel</Link>
          <p className="text-[10px] text-muted mt-1">EakPromosi · platform</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {ITEMS.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-violet/10 text-violet font-medium' : 'text-fg hover:bg-sunk',
                )
              }
            >
              <i.icon size={16} /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-line text-xs flex items-center justify-between">
          <span className="truncate">{user?.email}</span>
          <button type="button" className="text-muted hover:text-fg" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
