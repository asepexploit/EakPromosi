const nf = new Intl.NumberFormat('id-ID');
const cf = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : nf.format(Math.round(v));

export const formatCompact = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : Math.abs(v) >= 10_000 ? cf.format(v) : nf.format(Math.round(v));

export const formatPct = (ratio: number | null | undefined, digits = 1): string =>
  ratio == null || !Number.isFinite(ratio)
    ? '—'
    : (ratio * 100).toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + '%';

export const formatIdr = (v: number): string => (v === 0 ? 'Gratis' : `Rp ${nf.format(Math.round(v))}`);

const TZ = 'Asia/Jakarta';
export const formatDate = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString('id-ID', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
export const formatDateShort = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString('id-ID', { timeZone: TZ, day: 'numeric', month: 'short' });
export const formatTime = (iso: string | Date): string =>
  new Date(iso)
    .toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    .replace(/\./g, ':');
export const formatDateTime = (iso: string | Date): string => `${formatDateShort(iso)}, ${formatTime(iso)}`;

export function formatAgo(iso: string | Date): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'baru saja';
  if (s < 3600) return `${Math.round(s / 60)} mnt lalu`;
  if (s < 86_400) return `${Math.round(s / 3600)} jam lalu`;
  if (s < 86_400 * 7) return `${Math.round(s / 86_400)} hari lalu`;
  return formatDateShort(iso);
}

export const initialsOf = (name: string | null | undefined): string =>
  String(name ?? '?')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

const GRADS: ReadonlyArray<readonly [string, string]> = [
  ['#37BBFE', '#1E88D6'],
  ['#8B7CF7', '#5B4FE0'],
  ['#34D399', '#059669'],
  ['#FBBF24', '#F97316'],
  ['#F472B6', '#DB2777'],
  ['#60A5FA', '#4F46E5'],
  ['#2DD4BF', '#0E7490'],
];
export function gradientFor(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pair = GRADS[h % GRADS.length]!;
  return `linear-gradient(140deg, ${pair[0]}, ${pair[1]})`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
}
