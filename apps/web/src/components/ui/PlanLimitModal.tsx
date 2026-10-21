import { Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from './Button';
import { Dialog } from './Dialog';

interface PlanLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** PLAN_LIMIT_* code from the 402 response. */
  code?: string;
  /** Human-readable message from the API error. */
  message?: string;
}

const COPY: Record<string, { title: string; body: string }> = {
  PLAN_LIMIT_ACCOUNTS: {
    title: 'Batas akun Telegram tercapai',
    body: 'Paket Anda tidak mengizinkan tambah akun lagi. Upgrade untuk membuka lebih banyak slot akun MTProto.',
  },
  PLAN_LIMIT_CAMPAIGNS: {
    title: 'Batas campaign bersamaan',
    body: 'Jumlah campaign aktif sudah mencapai batas paket. Selesaikan atau arsipkan salah satu, atau upgrade.',
  },
  PLAN_LIMIT_BROADCASTS_PER_DAY: {
    title: 'Batas broadcast harian',
    body: 'Kuota pengiriman broadcast harian paket Anda sudah habis. Upgrade untuk menaikkan batasnya.',
  },
  PLAN_LIMIT_DISCOVERY_SOURCES: {
    title: 'Batas discovery sources',
    body: 'Paket Anda membatasi jumlah sumber Discovery. Upgrade untuk menambah sumber baru.',
  },
  PLAN_FEATURE_DISABLED: {
    title: 'Fitur tidak tersedia di paket ini',
    body: 'Fitur yang Anda akses hanya tersedia di paket yang lebih tinggi.',
  },
};

export function PlanLimitModal({ open, onOpenChange, code, message }: PlanLimitModalProps): JSX.Element {
  const navigate = useNavigate();
  const copy = (code && COPY[code]) || { title: 'Butuh paket lebih tinggi', body: message ?? 'Operasi ini melebihi batas paket aktif Anda.' };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Crown size={18} className="text-warn" /> {copy.title}
        </span>
      }
      description={copy.body}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Nanti saja
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onOpenChange(false);
              navigate('/billing/plans');
            }}
          >
            <Sparkles size={14} /> Lihat paket
          </Button>
        </>
      }
    >
      <div className="rounded-xl p-4 bg-tg/5 border border-tg/30 text-sm text-fg">
        <p className="font-semibold mb-1">Billing EakPromosi — subscription only</p>
        <p className="text-muted text-xs">
          Pembayaran via Pakasir. Aktivasi otomatis setelah webhook <code className="font-mono">invoice.paid</code>.
        </p>
      </div>
    </Dialog>
  );
}
