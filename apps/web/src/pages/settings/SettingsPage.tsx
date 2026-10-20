import { useQuery } from '@tanstack/react-query';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import type { TenantMember } from '@eak/shared';

export function SettingsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { data: members = [] } = useQuery({
    queryKey: ['tenants', 'members'],
    queryFn: () => apiFetch<TenantMember[]>('/tenants/members'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card>
        <CardHeader title="Profil" />
        <CardBody className="text-sm space-y-1">
          <div><span className="text-muted">Nama:</span> {user?.displayName}</div>
          <div><span className="text-muted">Email:</span> {user?.email}</div>
          <div><span className="text-muted">Timezone:</span> {user?.timezone}</div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={`Anggota tenant (${members.length})`} />
        <CardBody>
          <ul className="divide-y divide-line text-sm">
            {members.map((m) => (
              <li key={m.id} className="py-2 flex justify-between">
                <div>
                  <p className="font-medium">{m.displayName}</p>
                  <p className="text-xs text-muted">{m.email}</p>
                </div>
                <span className="text-xs text-muted uppercase">{m.role}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
