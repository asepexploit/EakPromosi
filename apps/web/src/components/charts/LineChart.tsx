import { useMemo, useState } from 'react';

import { cn } from '../../lib/cn';

export interface LineSeries<TRow> {
  key: keyof TRow;
  label: string;
  color: string;
}

export interface LineChartProps<TRow extends Record<string, number | string | undefined>> {
  rows: ReadonlyArray<TRow>;
  xKey: keyof TRow;
  xFormat?: (v: TRow[keyof TRow]) => string;
  yFormat?: (v: number) => string;
  series: ReadonlyArray<LineSeries<TRow>>;
  height?: number;
  area?: boolean;
  className?: string;
}

const defaultYFmt = (n: number): string => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);

export function LineChart<TRow extends Record<string, number | string | undefined>>({
  rows,
  xKey,
  xFormat,
  yFormat,
  series,
  height = 220,
  area = false,
  className,
}: LineChartProps<TRow>): JSX.Element {
  const [hoverI, setHoverI] = useState<number | null>(null);
  const yFmt = yFormat ?? defaultYFmt;
  const W = 600;
  const ML = 44;
  const MR = 10;
  const MT = 10;
  const MB = 26;
  const innerW = W - ML - MR;
  const innerH = height - MT - MB;

  const { ticks, min, max } = useMemo(() => {
    let mn = Infinity;
    let mx = -Infinity;
    for (const r of rows) {
      for (const s of series) {
        const v = Number(r[s.key]);
        if (Number.isFinite(v)) {
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
    }
    if (!Number.isFinite(mn)) {
      mn = 0;
      mx = 1;
    }
    if (mn === mx) {
      mn -= 1;
      mx += 1;
    }
    const span = mx - mn;
    const pad = span * 0.1;
    mn = Math.min(0, mn - pad);
    mx = mx + pad;
    const n = 4;
    const step = (mx - mn) / n;
    const t: number[] = [];
    for (let i = 0; i <= n; i++) t.push(mn + i * step);
    return { ticks: t, min: mn, max: mx };
  }, [rows, series]);

  const xFor = (i: number): number => (rows.length === 1 ? ML + innerW / 2 : ML + (i * innerW) / (rows.length - 1));
  const yFor = (v: number): number => MT + innerH - ((v - min) / (max - min || 1)) * innerH;

  if (rows.length === 0) {
    return (
      <div className={cn('relative text-xs text-muted flex items-center justify-center', className)} style={{ height }}>
        Belum ada data
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full h-full">
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

        {series.map((s, idx) => {
          const uid = `area-${idx}-${Math.random().toString(36).slice(2, 6)}`;
          const pts = rows
            .map((r, i) => {
              const v = Number(r[s.key]);
              return Number.isFinite(v) ? `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(v)}` : null;
            })
            .filter(Boolean)
            .join(' ');
          const areaPath =
            area && idx === 0 && rows.length > 1
              ? `${pts} L${xFor(rows.length - 1)},${yFor(min)} L${xFor(0)},${yFor(min)} Z`
              : null;
          return (
            <g key={String(s.key)}>
              {areaPath && (
                <>
                  <defs>
                    <linearGradient id={uid} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor={s.color} stopOpacity={0.22} />
                      <stop offset="1" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill={`url(#${uid})`} />
                </>
              )}
              <path d={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {rows.map((row, i) => {
          const every = Math.max(1, Math.ceil(rows.length / Math.min(rows.length, 8)));
          if ((rows.length - 1 - i) % every !== 0) return null;
          const label = xFormat ? xFormat(row[xKey]) : String(row[xKey] ?? '');
          return (
            <text
              key={`x-${i}`}
              x={xFor(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted"
              style={{ fontSize: 11 }}
            >
              {label}
            </text>
          );
        })}

        {hoverI !== null && (
          <>
            <line
              x1={xFor(hoverI)}
              x2={xFor(hoverI)}
              y1={MT}
              y2={MT + innerH}
              stroke="rgb(var(--line))"
              strokeDasharray="2 3"
            />
            {series.map((s) => {
              const v = Number(rows[hoverI]?.[s.key]);
              return Number.isFinite(v) ? (
                <circle key={String(s.key)} cx={xFor(hoverI)} cy={yFor(v)} r={3.5} fill={s.color} stroke="rgb(var(--panel))" strokeWidth={2} />
              ) : null;
            })}
          </>
        )}

        {rows.map((_r, i) => (
          <rect
            key={`int-${i}`}
            x={xFor(i) - innerW / rows.length / 2}
            y={0}
            width={innerW / rows.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverI(i)}
            onMouseLeave={() => setHoverI(null)}
          />
        ))}
      </svg>
      {hoverI !== null && (
        <div
          className="absolute pointer-events-none bg-panel border border-line rounded-lg shadow-pop px-2.5 py-2 text-xs min-w-[150px]"
          style={{
            left: `calc(${(xFor(hoverI) / W) * 100}% + 10px)`,
            top: 8,
            transform: hoverI / Math.max(rows.length - 1, 1) > 0.6 ? 'translateX(calc(-100% - 20px))' : 'none',
          }}
        >
          <div className="text-muted font-medium mb-1">
            {xFormat ? xFormat(rows[hoverI]![xKey]) : String(rows[hoverI]?.[xKey] ?? '')}
          </div>
          {series.map((s) => (
            <div key={String(s.key)} className="flex items-center justify-between gap-2 tabular">
              <span className="flex items-center gap-1.5 text-muted">
                <i className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <b className="font-semibold">{yFmt(Number(rows[hoverI]?.[s.key]) || 0)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
