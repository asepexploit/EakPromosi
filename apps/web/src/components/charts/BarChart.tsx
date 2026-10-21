import { useMemo, useState } from 'react';

import { cn } from '../../lib/cn';

export interface BarSeries {
  key: string;
  label: string;
  /** CSS color (`rgb(var(--tg))` etc). */
  color: string;
}

export interface BarChartProps<TRow extends Record<string, number | string | undefined>> {
  rows: ReadonlyArray<TRow>;
  xKey: keyof TRow;
  xFormat?: (v: TRow[keyof TRow], row: TRow, i: number) => string;
  yFormat?: (v: number) => string;
  series: ReadonlyArray<BarSeries>;
  stacked?: boolean;
  height?: number;
  maxBar?: number;
  className?: string;
  /** Highlight a particular x value — the matching bar gets more saturated color. */
  highlightXValue?: string | number;
}

function niceDomain(max: number): { ticks: number[]; max: number } {
  if (!Number.isFinite(max) || max <= 0) return { ticks: [0, 0.25, 0.5, 0.75, 1], max: 1 };
  const rough = max * 1.08;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const base = rough / pow;
  const step = (base <= 1.5 ? 0.25 : base <= 3 ? 0.5 : base <= 6 ? 1 : 2) * pow;
  const topRaw = Math.ceil(rough / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= topRaw + step / 2; v += step) ticks.push(v);
  return { ticks, max: topRaw };
}

const defaultYFmt = (n: number): string =>
  Math.abs(n) >= 10_000
    ? new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : new Intl.NumberFormat('id-ID').format(Math.round(n));

/** Pure-SVG bar chart (grouped or stacked). Tokens from CSS vars, tooltip inside the chart. */
export function BarChart<TRow extends Record<string, number | string | undefined>>({
  rows,
  xKey,
  xFormat,
  yFormat,
  series,
  stacked = false,
  height = 230,
  maxBar = 28,
  className,
  highlightXValue,
}: BarChartProps<TRow>): JSX.Element {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  const { ticks, max } = useMemo(() => {
    const tot = (r: TRow): number => series.reduce((a, s) => a + (Number(r[s.key]) || 0), 0);
    const peak = rows.reduce((best, r) => {
      const v = stacked ? tot(r) : series.reduce((m, s) => Math.max(m, Number(r[s.key]) || 0), 0);
      return v > best ? v : best;
    }, 0);
    return niceDomain(peak);
  }, [rows, series, stacked]);

  const yFmt = yFormat ?? defaultYFmt;
  const W = 600;
  const H = height;
  const ML = 44;
  const MR = 10;
  const MT = 10;
  const MB = 26;
  const innerW = W - ML - MR;
  const innerH = H - MT - MB;
  const bandW = rows.length > 0 ? innerW / rows.length : innerW;
  const barW = Math.min(maxBar, bandW * 0.7);

  const yFor = (v: number): number => MT + innerH - (v / (max || 1)) * innerH;

  if (rows.length === 0) {
    return (
      <div className={cn('relative', className)} style={{ height, minHeight: height }}>
        <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">Belum ada data</div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} style={{ height, minHeight: height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* grid */}
        {ticks.map((t) => (
          <line
            key={t}
            x1={ML}
            x2={W - MR}
            y1={yFor(t) + 0.5}
            y2={yFor(t) + 0.5}
            stroke="rgb(var(--line) / 0.6)"
            strokeWidth={1}
          />
        ))}
        {/* y labels */}
        {ticks.map((t) => (
          <text
            key={`l-${t}`}
            x={ML - 8}
            y={yFor(t)}
            textAnchor="end"
            dominantBaseline="central"
            className="fill-muted"
            style={{ fontSize: 11 }}
          >
            {yFmt(t)}
          </text>
        ))}
        {/* hover band */}
        {hover && (
          <rect
            x={ML + hover.i * bandW + 2}
            y={MT}
            width={bandW - 4}
            height={innerH}
            fill="rgb(var(--fg) / 0.04)"
            rx={6}
          />
        )}
        {/* bars */}
        {rows.map((row, i) => {
          const bandX = ML + i * bandW + (bandW - barW) / 2;
          const xValue = row[xKey];
          const isHighlighted =
            highlightXValue !== undefined && String(xValue) === String(highlightXValue);
          if (stacked) {
            let acc = 0;
            return (
              <g key={i}>
                {series.map((s) => {
                  const v = Number(row[s.key]) || 0;
                  if (v === 0) return null;
                  const y1 = yFor(acc + v);
                  const y0 = yFor(acc);
                  const h = y0 - y1;
                  acc += v;
                  return (
                    <rect
                      key={s.key}
                      x={bandX}
                      y={y1}
                      width={barW}
                      height={Math.max(0, h)}
                      fill={s.color}
                      rx={3}
                      opacity={hover && hover.i !== i ? 0.45 : 1}
                    />
                  );
                })}
              </g>
            );
          }
          const n = series.length;
          const subW = barW / n;
          return (
            <g key={i}>
              {series.map((s, k) => {
                const v = Number(row[s.key]) || 0;
                const y1 = yFor(v);
                const h = yFor(0) - y1;
                return (
                  <rect
                    key={s.key}
                    x={bandX + k * subW + (n > 1 ? 1 : 0)}
                    y={y1}
                    width={subW - (n > 1 ? 2 : 0)}
                    height={Math.max(0, h)}
                    fill={s.color}
                    rx={3}
                    opacity={hover && hover.i !== i ? 0.45 : isHighlighted ? 1 : 1}
                  />
                );
              })}
            </g>
          );
        })}
        {/* x labels — show every nth to avoid overlap */}
        {rows.map((row, i) => {
          const every = Math.max(1, Math.ceil(rows.length / Math.min(rows.length, 10)));
          if ((rows.length - 1 - i) % every !== 0) return null;
          const label = xFormat ? xFormat(row[xKey], row, i) : String(row[xKey] ?? '');
          return (
            <text
              key={`x-${i}`}
              x={ML + i * bandW + bandW / 2}
              y={H - 8}
              textAnchor="middle"
              className="fill-muted"
              style={{ fontSize: 11 }}
            >
              {label}
            </text>
          );
        })}
        {/* interaction overlay */}
        {rows.map((_row, i) => (
          <rect
            key={`h-${i}`}
            x={ML + i * bandW}
            y={0}
            width={bandW}
            height={H - MB}
            fill="transparent"
            onMouseEnter={(e) => {
              const svg = e.currentTarget.ownerSVGElement;
              if (!svg) return;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX;
              pt.y = e.clientY;
              const ctm = svg.getScreenCTM();
              if (!ctm) return;
              const local = pt.matrixTransform(ctm.inverse());
              setHover({ i, x: local.x, y: local.y });
            }}
            onMouseMove={(e) => {
              const svg = e.currentTarget.ownerSVGElement;
              if (!svg) return;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX;
              pt.y = e.clientY;
              const ctm = svg.getScreenCTM();
              if (!ctm) return;
              const local = pt.matrixTransform(ctm.inverse());
              setHover({ i, x: local.x, y: local.y });
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover && (
        <div
          className="absolute pointer-events-none bg-panel border border-line rounded-lg shadow-pop px-2.5 py-2 text-xs min-w-[150px]"
          style={{
            left: `calc(${(hover.x / W) * 100}% + 10px)`,
            top: `calc(${(hover.y / H) * 100}% - 24px)`,
            transform: hover.x > W * 0.7 ? 'translateX(calc(-100% - 20px))' : 'none',
          }}
        >
          <div className="text-muted font-medium mb-1">
            {xFormat
              ? xFormat(rows[hover.i]![xKey], rows[hover.i]!, hover.i)
              : String(rows[hover.i]?.[xKey] ?? '')}
          </div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-2 tabular">
              <span className="flex items-center gap-1.5 text-muted">
                <i className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <b className="font-semibold">{yFmt(Number(rows[hover.i]?.[s.key]) || 0)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
