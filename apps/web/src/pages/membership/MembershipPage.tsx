import { LinkIcon } from 'lucide-react';

import { Alert } from '../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

export function MembershipPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Join & Membership Sync"
        description="Antrean join otomatis dari hasil Discovery, plus sinkronisasi berkala apakah akun masih member."
      />

      <Alert
        tone="warn"
        title="Rate limit penting"
        description="Akun baru maks 20 join/hari; naik bertahap setelah 7 hari aktif. Flood-wait otomatis dihormati (job di-delay bukan di-retry)."
      />

      <Card>
        <CardHeader
          title="Antrean Join"
          subtitle="Join dieksekusi oleh worker telegram:join dengan honor flood-wait dan rate-limit per akun."
          icon={<LinkIcon size={14} />}
        />
        <CardBody>
          <EmptyState
            icon={<LinkIcon size={24} />}
            title="Belum ada antrean join"
            description="Antrean terisi otomatis saat Discovery menemukan link baru, atau tambah manual dari Inventory."
          />
        </CardBody>
      </Card>
    </div>
  );
}
