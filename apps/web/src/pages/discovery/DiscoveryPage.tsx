import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { DiscoveredLink, DiscoverySource } from '@eak/shared';

export function DiscoveryPage(): JSX.Element {
  const { data: sources = [] } = useQuery({
    queryKey: ['discovery', 'sources'],
    queryFn: () => apiFetch<DiscoverySource[]>('/discovery/sources'),
  });
  const { data: links = [] } = useQuery({
    queryKey: ['discovery', 'links'],
    queryFn: () => apiFetch<DiscoveredLink[]>('/discovery/links'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auto Discovery</h1>
        <p className="text-xs text-muted">
          Sumber yang dikonfigurasi akan di-scan periodik. Discovery TIDAK auto-join — gunakan modul Join untuk tindak lanjut.
        </p>
      </div>

      <Card>
        <CardHeader title={`Sumber (${sources.length})`} />
        <CardBody>
          {sources.length === 0 ? (
            <p className="text-sm text-muted">Belum ada sumber. Tambah grup/channel yang akun userbot sudah ikuti.</p>
          ) : (
            <ul className="divide-y divide-line">
              {sources.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted">Max {s.maxLinksPerDay} link/hari · deteksi mentions: {s.detectMentions ? 'ya' : 'tidak'}</p>
                  </div>
                  <Badge tone={s.enabled ? 'ok' : 'default'}>{s.enabled ? 'Aktif' : 'Nonaktif'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Link ditemukan (${links.length})`} />
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="text-left py-2">URL</th>
                <th className="text-left">Jenis</th>
                <th className="text-left">Status</th>
                <th className="text-left">Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b border-line/60">
                  <td className="py-2 text-xs">{l.url}</td>
                  <td>{l.kind}</td>
                  <td><Badge tone={l.status === 'valid' ? 'ok' : l.status === 'invalid' ? 'bad' : 'default'}>{l.status}</Badge></td>
                  <td className="text-xs text-muted">{new Date(l.lastSeenAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
