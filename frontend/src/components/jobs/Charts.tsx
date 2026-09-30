import { useEffect, useMemo, useRef, useState } from "react";
import { Table2, LineChart } from "lucide-react";
import { STATUS_LABEL, type ApplicationStatus } from "../../services/jobs";

/**
 * Recruitment charts, hand-rolled in SVG (no chart library in this app).
 *
 * Both are single-series, so no legend: the card title names what's plotted.
 * One brand hue (#0B7327, validated for contrast on white), 2px line, 10%
 * area wash, hairline grid, hover tooltip, and a table view for anyone who
 * can't or doesn't want to read the chart.
 */

const HUE = "#0B7327";
const GRID = "#E5E7EB";
const MUTED = "#6B7280";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(300);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v / s <= 4) ?? pow * 10;
  return Math.ceil(v / step) * step;
}

function ViewToggle({ table, onChange }: { table: boolean; onChange: (t: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!table)}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted hover:bg-mist hover:text-ink"
      aria-label={table ? "Show chart" : "Show table"}
    >
      {table ? <LineChart size={13} /> : <Table2 size={13} />} {table ? "Chart" : "Table"}
    </button>
  );
}

export function ChartCard({
  title, subtitle, children, table, onToggle,
}: { title: string; subtitle?: string; children: React.ReactNode; table?: boolean; onToggle?: (t: boolean) => void }) {
  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-[12.5px] text-muted">{subtitle}</p>}
        </div>
        {onToggle && <ViewToggle table={Boolean(table)} onChange={onToggle} />}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Applications over time — area + line with crosshair tooltip         */
/* ------------------------------------------------------------------ */

export function ApplicationsChart({ series }: { series: { date: string; applications: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const height = 200;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const total = series.reduce((a, b) => a + b.applications, 0);

  const { pts, max, x, y } = useMemo(() => {
    const max = niceMax(Math.max(1, ...series.map((s) => s.applications)));
    const iw = width - pad.l - pad.r;
    const ih = height - pad.t - pad.b;
    const x = (i: number) => pad.l + (series.length <= 1 ? iw / 2 : (i / (series.length - 1)) * iw);
    const y = (v: number) => pad.t + ih - (v / max) * ih;
    return { pts: series.map((s, i) => [x(i), y(s.applications)] as const), max, x, y };
  }, [series, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z` : "";
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(series.length / Math.max(2, Math.floor(width / 90)));
  const fmtDay = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = (e.target as SVGRectElement).getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * (width - pad.l - pad.r);
    const i = Math.round((px / (width - pad.l - pad.r)) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  }

  return (
    <ChartCard title="Applications" subtitle={`${total.toLocaleString()} in the last ${series.length - 1} days`}
               table={table} onToggle={setTable}>
      {table ? (
        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-muted"><th className="py-1 font-medium">Date</th><th className="py-1 text-right font-medium">Applications</th></tr></thead>
            <tbody>
              {[...series].reverse().map((s) => (
                <tr key={s.date} className="border-t border-hairline">
                  <td className="py-1.5 text-ink">{fmtDay(s.date)}</td>
                  <td className="py-1.5 text-right text-ink tabular">{s.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative w-full min-w-0">
          <svg width={width} height={height} className="block" role="img" aria-label={`Applications per day, ${total} total`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
                  {t.toLocaleString()}
                </text>
              </g>
            ))}
            {series.map((s, i) =>
              i % labelEvery === 0 || i === series.length - 1 ? (
                <text key={s.date} x={x(i)} y={height - 8} fontSize={11} fill={MUTED}
                      textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}>
                  {fmtDay(s.date)}
                </text>
              ) : null,
            )}
            <path d={area} fill={HUE} fillOpacity={0.1} />
            <path d={line} fill="none" stroke={HUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hover != null && pts[hover] && (
              <g>
                <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={y(0)} stroke={MUTED} strokeWidth={1} />
                <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} fill={HUE} stroke="#fff" strokeWidth={2} />
              </g>
            )}
            <rect
              x={pad.l} y={pad.t} width={width - pad.l - pad.r} height={height - pad.t - pad.b}
              fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)}
            />
          </svg>
          {hover != null && series[hover] && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-[12px] shadow-md"
              style={{ left: Math.min(Math.max(pts[hover][0], 60), width - 60), top: 0 }}
            >
              <p className="text-muted">{fmtDay(series[hover].date)}</p>
              <p className="font-semibold text-ink tabular">{series[hover].applications} applications</p>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Hiring funnel — horizontal bars, value at the tip                   */
/* ------------------------------------------------------------------ */

export function FunnelChart({ funnel }: { funnel: { status: ApplicationStatus; count: number }[] }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...funnel.map((f) => f.count));
  const top = funnel[0]?.count || 0;

  return (
    <ChartCard title="Hiring funnel" subtitle="Applications that reached each stage" table={table} onToggle={setTable}>
      {table ? (
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-muted"><th className="py-1 font-medium">Stage</th><th className="py-1 text-right font-medium">Reached</th><th className="py-1 text-right font-medium">Of applied</th></tr></thead>
          <tbody>
            {funnel.map((f) => (
              <tr key={f.status} className="border-t border-hairline">
                <td className="py-1.5 text-ink">{STATUS_LABEL[f.status]}</td>
                <td className="py-1.5 text-right text-ink tabular">{f.count}</td>
                <td className="py-1.5 text-right text-muted tabular">{top ? Math.round((100 * f.count) / top) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="space-y-2.5">
          {funnel.map((f, i) => {
            const pct = (f.count / max) * 100;
            const prev = i ? funnel[i - 1].count : null;
            return (
              <li
                key={f.status}
                className="relative grid grid-cols-[92px_1fr] items-center gap-3"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                <span className="text-[12.5px] text-muted">{STATUS_LABEL[f.status]}</span>
                <div className="flex items-center gap-2">
                  <div className="h-[18px] flex-1">
                    <div
                      className="h-full rounded-r-[4px]"
                      style={{ width: `${Math.max(pct, f.count ? 2 : 0)}%`, background: HUE,
                               opacity: hover == null || hover === i ? 1 : 0.55 }}
                    />
                  </div>
                  <span className="w-10 text-right text-[12.5px] font-semibold text-ink tabular">{f.count}</span>
                </div>
                {hover === i && prev != null && (
                  <span className="pointer-events-none absolute -top-7 left-[100px] z-10 rounded-md border border-hairline bg-paper px-2 py-1 text-[11.5px] text-ink shadow">
                    {prev ? Math.round((100 * f.count) / prev) : 0}% moved on from {STATUS_LABEL[funnel[i - 1].status]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
