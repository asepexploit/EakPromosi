import { useQuery } from '@tanstack/react-query';
import { Compass, LinkIcon, Play } from 'lucide-react';

import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
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
      <PageHeader
        title="Auto Discovery"
        description="Sumber yang dikonfigurasi akan di-scan periodik via userbot. Discovery tidak auto-join — gunakan modul Join."
        actions={
          <Button variant="primary">
            <Compass size={14} /> Tambah Source
          </Button>
        }
      />

      <Alert
        tone="info"
        title="Discovery hanya menghasilkan link"
        description="Link yang ditemukan masuk ke tabel discovered_links. Join adalah antrean terpisah agar bisa dijadwal & dibatasi per akun."
      />

      <Card>
        <CardHeader
          title={`Sumber (${sources.length})`}
          subtitle="Grup/channel yang akun userbot sudah ikuti dan diizinkan untuk dibaca."
          icon={<Compass size={14} />}
        />
        <CardBody>
          {sources.length === 0 ? (
            <EmptyState
              icon={<Compass size={24} />}
              title="Belum ada sumber discovery"
              description="Tambah grup atau channel yang akun userbot sudah ikuti untuk mulai scan."
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {sources.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.title}</p>
                    <p className="text-xs text-muted">
                      Max {s.maxLinksPerDay} link/hari · mentions {s.detectMentions ? 'ya' : 'tidak'} · {s.linksFound} ditemukan
                    </p>
                    <Progress value={(s.linksFound / s.maxLinksPerDay) * 100} className="mt-2 max-w-sm" tone="tg" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.enabled ? 'ok' : 'default'} pulse={s.enabled}>
                      {s.enabled ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Play size={13} /> Scan sekarang
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Link ditemukan (${links.length})`}
          subtitle="Deduplicate otomatis per tenant (satu grup = satu entri, meski ditemukan berkali-kali)."
          icon={<LinkIcon size={14} />}
        />
        <CardBody className="pt-0">
          {links.length === 0 ? (
            <EmptyState title="Belum ada link ditemukan" description="Link muncul setelah worker telegram:link-detect menjalankan source." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <th>URL</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Terakhir dilihat</th>
                </tr>
              </THead>
              <TBody>
                {links.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{l.url}</td>
                    <td>
                      <Badge tone={l.kind === 'private_invite' ? 'violet' : 'info'} dot={false}>
                        {l.kind.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={l.status === 'valid' ? 'ok' : l.status === 'invalid' ? 'bad' : 'default'}>{l.status}</Badge>
                    </td>
                    <td className="text-xs text-muted tabular">{new Date(l.lastSeenAt).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
