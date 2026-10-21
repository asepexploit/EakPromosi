import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { Dialog } from '../ui/Dialog';

interface Command {
  id: string;
  label: string;
  hint?: string;
  section: string;
  to: string;
}

const COMMANDS: ReadonlyArray<Command> = [
  { id: 'dashboard', label: 'Dashboard Overview', section: 'Workspace', to: '/' },
  { id: 'accounts', label: 'Telegram Accounts', section: 'Workspace', to: '/accounts' },
  { id: 'groups', label: 'Group & Channel Inventory', section: 'Workspace', to: '/groups' },
  { id: 'discovery', label: 'Auto Discovery', section: 'Automation', to: '/discovery' },
  { id: 'membership', label: 'Auto Join & Membership', section: 'Automation', to: '/membership' },
  { id: 'broadcasts', label: 'Auto Broadcast', section: 'Automation', to: '/broadcasts' },
  { id: 'campaigns', label: 'Campaign Management', section: 'Automation', to: '/campaigns' },
  { id: 'dm', label: 'Auto-DM & Auto Reply', section: 'Automation', to: '/dm' },
  { id: 'monitoring', label: 'Live Monitoring', section: 'Monitoring', to: '/monitoring' },
  { id: 'queue', label: 'Task Queue & Logs', section: 'Monitoring', to: '/queue' },
  { id: 'reports', label: 'Statistics & Reports', section: 'Monitoring', to: '/reports' },
  { id: 'plans', label: 'Subscription & Plans', section: 'Billing', to: '/billing/plans' },
  { id: 'payments', label: 'Payment History', section: 'Billing', to: '/billing/payments' },
  { id: 'settings', label: 'Settings', section: 'Account', to: '/settings' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props): JSX.Element {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      // give the dialog a tick to mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = n
      ? COMMANDS.filter((c) => (c.label + ' ' + c.section).toLowerCase().includes(n))
      : COMMANDS.slice(0, 8);
    return list;
  }, [q]);

  const go = (c: Command): void => {
    onOpenChange(false);
    navigate(c.to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Perintah cepat" description="Lompat ke halaman apa saja." size="lg">
      <div className="flex items-center gap-2.5 px-3 py-2 border border-line rounded-lg bg-bg">
        <Search size={16} className="text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIdx(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIdx((p) => Math.min(matches.length - 1, p + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIdx((p) => Math.max(0, p - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const chosen = matches[idx];
              if (chosen) go(chosen);
            }
          }}
          placeholder="Cari halaman…"
          className="flex-1 outline-none bg-transparent text-sm"
        />
        <kbd className="font-mono text-[10.5px] px-1.5 py-0.5 rounded border border-line bg-sunk text-muted">
          Enter
        </kbd>
      </div>
      <div className="mt-3 max-h-[320px] overflow-y-auto scrollbar-thin">
        {matches.length === 0 ? (
          <p className="text-xs text-muted px-2 py-6 text-center">Tidak ada hasil.</p>
        ) : (
          matches.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setIdx(i)}
              onClick={() => go(c)}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-left text-sm transition-colors',
                i === idx ? 'bg-tg/10 text-fg' : 'text-fg hover:bg-fg/5',
              )}
            >
              <span className="w-7 h-7 rounded-md bg-fg/[0.06] text-muted grid place-items-center flex-none">
                <Search size={13} />
              </span>
              <span className="flex-1 min-w-0 truncate">{c.label}</span>
              <span className="text-[11px] text-muted">{c.section}</span>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
