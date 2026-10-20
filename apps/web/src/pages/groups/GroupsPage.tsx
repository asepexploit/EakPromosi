import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { apiFetch } from '../../lib/api';
import type { Group } from '@eak/shared';

export function GroupsPage(): JSX.Element {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['groups', search],
    queryFn: () => apiFetch<Group[]>('/groups', { query: { search: search || undefined, limit: 100 } }),
  });

  const togglePromotion = useMutation({
    mutationFn: ({ id, allow }: { id: string; allow: boolean }) =>
      apiFetch(`/groups/${id}/promotion`, { method: 'PATCH', json: { allowPromotion: allow } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Group & Channel Inventory</h1>
        <p className="text-xs text-muted">
          Satu baris per grup (unik by telegram_chat_id). Membership N:M dikelola di modul Join.
        </p>
      </div>
      <Card>
        <CardHeader title={`Grup (${data.length})`} actions={<Input placeholder="Cari nama / username…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />} />
        <CardBody>
          {isLoading ? (
            <div className="text-muted text-sm">Memuat…</div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted">Belum ada grup. Mulai dari modul Discovery atau Auto Join.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted border-b border-line">
                <tr>
                  <th className="text-left py-2 font-medium">Nama</th>
                  <th className="text-left font-medium">Type</th>
                  <th className="text-left font-medium">Members</th>
                  <th className="text-left font-medium">Promotion</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((g) => (
                  <tr key={g.id} className="border-b border-line/60">
                    <td className="py-2">
                      <div className="font-medium">{g.title}</div>
                      <div className="text-xs text-muted">{g.username ? `@${g.username}` : g.telegramChatId}</div>
                    </td>
                    <td>{g.type}</td>
                    <td className="tabular">{g.memberCount ?? '—'}</td>
                    <td>
                      <Badge tone={g.allowPromotion ? 'ok' : 'default'}>
                        {g.allowPromotion ? 'Allow' : 'Off'}
                      </Badge>
                      {g.excluded && (
                        <Badge tone="bad" className="ml-2">Excluded</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePromotion.mutate({ id: g.id, allow: !g.allowPromotion })}
                      >
                        Toggle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
