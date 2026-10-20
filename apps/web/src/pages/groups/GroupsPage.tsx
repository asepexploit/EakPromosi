import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Search } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { InputWithIcon } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { Switch } from '../../components/ui/Switch';
import { apiFetch } from '../../lib/api';
import type { Group } from '@eak/shared';

export function GroupsPage(): JSX.Element {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'allowed' | 'off'>('all');

  const { data = [], isLoading } = useQuery({
    queryKey: ['groups', search, filter],
    queryFn: () =>
      apiFetch<Group[]>('/groups', {
        query: {
          search: search || undefined,
          limit: 100,
          allowPromotion: filter === 'all' ? undefined : filter === 'allowed',
        },
      }),
  });

  const togglePromotion = useMutation({
    mutationFn: ({ id, allow }: { id: string; allow: boolean }) =>
      apiFetch(`/groups/${id}/promotion`, { method: 'PATCH', json: { allowPromotion: allow } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  const allowedCount = data.filter((g) => g.allowPromotion).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group & Channel Inventory"
        description="Satu baris per grup (unik by telegram_chat_id). Membership N:M dengan akun dikelola di modul Join."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-panel border border-line rounded-lg px-5 py-4 shadow-card">
          <p className="text-xs text-muted">Total grup</p>
          <p className="text-2xl font-bold tabular mt-1">{data.length}</p>
        </div>
        <div className="bg-panel border border-line rounded-lg px-5 py-4 shadow-card">
          <p className="text-xs text-muted">Allow promotion</p>
          <p className="text-2xl font-bold tabular mt-1 text-ok">{allowedCount}</p>
        </div>
        <div className="bg-panel border border-line rounded-lg px-5 py-4 shadow-card">
          <p className="text-xs text-muted">Excluded</p>
          <p className="text-2xl font-bold tabular mt-1 text-bad">{data.filter((g) => g.excluded).length}</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title={`Grup (${data.length})`}
          subtitle="Toggle allow_promotion untuk mengizinkan grup jadi target broadcast."
          icon={<Database size={14} />}
          actions={
            <InputWithIcon
              icon={<Search size={14} />}
              placeholder="Cari nama / username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapClassName="w-72"
            />
          }
        />
        <CardBody className="pt-0">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={data.length}>
              Semua
            </Chip>
            <Chip active={filter === 'allowed'} onClick={() => setFilter('allowed')}>
              Allow Promotion
            </Chip>
            <Chip active={filter === 'off'} onClick={() => setFilter('off')}>
              Belum dibuka
            </Chip>
          </div>

          {isLoading ? (
            <div className="skeleton h-[300px]" />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<Database size={24} />}
              title="Belum ada grup di inventory"
              description="Grup muncul otomatis setelah akun bergabung (dari Auto Join atau manual via Discovery)."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <th>Nama</th>
                  <th>Type</th>
                  <th className="r">Members</th>
                  <th>Promotion</th>
                  <th />
                </tr>
              </THead>
              <TBody>
                {data.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <TMain>{g.title}</TMain>
                      <TSub>{g.username ? `@${g.username}` : g.telegramChatId}</TSub>
                    </td>
                    <td>
                      <Badge tone={g.type === 'channel' ? 'info' : g.type === 'supergroup' ? 'violet' : 'default'} dot={false}>
                        {g.type}
                      </Badge>
                    </td>
                    <td className="r tabular">{g.memberCount ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={g.allowPromotion}
                          onChange={(next) => togglePromotion.mutate({ id: g.id, allow: next })}
                          aria-label={`allow promotion ${g.title}`}
                        />
                        {g.excluded && <Badge tone="bad">Excluded</Badge>}
                      </div>
                    </td>
                    <td className="r">
                      <Button size="xs" variant="ghost">
                        Detail
                      </Button>
                    </td>
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
