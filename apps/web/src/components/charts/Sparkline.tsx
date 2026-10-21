import { cn } from '../../lib/cn';

interface SparklineProps {
  values: ReadonlyArray<number>;
  color?: string;
  height?: number;
  className?: string;
}

/** Pure-SVG sparkline, token-colored by default. */
export function Sparkline({ values, color = 'rgb(var(--tg))', height = 36, className }: SparklineProps): JSX.Element {
  const W = 160;
  const H = height;
  if (values.length === 0) return <div className={cn('text-xs text-muted', className)} style={{ height }} />;

  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.05 || 1;
  const n = values.length;
  const x = (i: number): number => (n === 1 ? W / 2 : 2 + (i * (W - 4)) / (n - 1));
  const y = (v: number): number => H - 2 - ((v - min) / (max - min || 1)) * (H - 4);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(2)},${H} L${x(0).toFixed(2)},${H} Z`;
  const uid = `spk-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={uid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.22} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${uid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n - 1)} cy={y(values[n - 1]!)} r={2.6} fill={color} />
      </svg>
    </div>
  );
}
