import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { apiFetch } from './lib/api';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { useAuthStore } from './stores/auth';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { GroupsPage } from './pages/groups/GroupsPage';
import { DiscoveryPage } from './pages/discovery/DiscoveryPage';
import { MembershipPage } from './pages/membership/MembershipPage';
import { BroadcastsPage } from './pages/broadcasts/BroadcastsPage';
import { CampaignsPage } from './pages/campaigns/CampaignsPage';
import { DmPage } from './pages/dm/DmPage';
import { MonitoringPage } from './pages/monitoring/MonitoringPage';
import { QueuePage } from './pages/queue/QueuePage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { PlansPage } from './pages/billing/PlansPage';
import { PaymentsPage } from './pages/billing/PaymentsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AdminTenantsPage } from './pages/admin/AdminTenantsPage';
import { AdminPlansPage } from './pages/admin/AdminPlansPage';
import { AdminInvoicesPage } from './pages/admin/AdminInvoicesPage';
import type { SessionBundle } from '@eak/shared';

function useBootstrapSession(): void {
  const setBundle = useAuthStore((s) => s.setBundle);
  const clear = useAuthStore((s) => s.clear);
  const { data, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<SessionBundle>('/auth/me'),
    retry: false,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (data) setBundle(data);
    else if (isError) clear();
  }, [data, isError, setBundle, clear]);
}

function RequireAuth({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }): JSX.Element {
  const { loaded, user } = useAuthStore();
  if (!loaded) return <div className="p-6 text-muted">Memuat sesi…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.isPlatformAdmin) return <Navigate to="/" replace />;
  return children;
}

export function App(): JSX.Element {
  useBootstrapSession();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/admin/*"
        element={
          <RequireAuth adminOnly>
            <AdminLayout>
              <Routes>
                <Route index element={<AdminTenantsPage />} />
                <Route path="tenants" element={<AdminTenantsPage />} />
                <Route path="plans" element={<AdminPlansPage />} />
                <Route path="invoices" element={<AdminInvoicesPage />} />
              </Routes>
            </AdminLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppLayout>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="discovery" element={<DiscoveryPage />} />
                <Route path="membership" element={<MembershipPage />} />
                <Route path="broadcasts" element={<BroadcastsPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="dm" element={<DmPage />} />
                <Route path="monitoring" element={<MonitoringPage />} />
                <Route path="queue" element={<QueuePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="billing/plans" element={<PlansPage />} />
                <Route path="billing/payments" element={<PaymentsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
