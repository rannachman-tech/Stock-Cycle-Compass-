"use client";

import type { Indicator } from "@/lib/types";

interface Props {
  indicators: Indicator[];
  pro: boolean;
}

function pctColor(p: number, higherIsExpensive: boolean) {
  // Map 0..100 percentile to a colour stop. "Expensive" end is warm.
  // If lower is expensive (e.g. ERP), invert.
  const adj = higherIsExpensive ? p : 100 - p;
  if (adj >= 80) return "rgb(var(--zone-warning))";
  if (adj >= 60) return "rgb(var(--zone-watch))";
  if (adj >= 30) return "rgb(var(--zone-clear))";
  return "rgb(var(--zone-clear))";
}

function fmtNum(n: number, unit: string) {
  if (Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 100) return `${Math.round(n)}${unit}`;
  if (Math.abs(n) >= 10) return `${n.toFixed(1)}${unit}`;
  return `${n.toFixed(2)}${unit}`;
}

export default function ValuationLensTiles({ indicators, pro }: Props) {
  // Show 7 tiles: buffett, cape, fwdPe, erp, breadth, aaii, vix
  const order = ["buffett", "cape", "fwdPe", "erp", "breadth", "aaii", "vix"];
  const ordered = order
    .map((k) => indicators.find((i) => i.key === k))
    .filter(Boolean) as Indicator[];

  return (
    <section className="mt-6 sm:mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
          Valuation lenses
        </h2>
        <p className="text-[11px] text-fg-subtle">Hover for the long-run reference</p>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
        {ordered.map((ind) => (
          <Tile key={ind.key} ind={ind} pro={pro} />
        ))}
      </div>
    </section>
  );
}

function Tile({ ind, pro }: { ind: Indicator; pro: boolean }) {
  const colour = pctColor(ind.percentile, ind.higherIsExpensive);
  const dotX = `${Math.max(2, Math.min(98, ind.percentile))}%`;

  return (
    <div
      className="group rounded-md border border-border bg-surface p-3 hover:border-border-strong transition-colors"
      title={ind.label}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle truncate">
          {ind.shortLabel}
        </div>
        {ind.stale && (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zone-warning">
            Stale
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <div className="text-[20px] font-medium tabular-nums text-fg">
          {fmtNum(ind.value, ind.unit)}
        </div>
        <div className="text-[10.5px] text-fg-subtle tabular-nums">
          {ind.percentile}
          <span className="text-[8.5px] align-top ml-0.5">th</span>
        </div>
      </div>

      {/* Percentile track */}
      <div className="relative mt-2 h-1.5 rounded-full bg-bg-soft overflow-hidden">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${ind.percentile}%`,
            background: `linear-gradient(90deg, color-mix(in srgb, ${colour} 25%, transparent), ${colour})`,
            opacity: 0.55,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-surface"
          style={{ left: dotX, background: colour }}
        />
      </div>

      {pro && (
        <div className="mt-2 pt-2 border-t border-border/70 space-y-1">
          <ProMetric label="median" value={ind.longRunMedian} unit={ind.unit} />
          <ProMetric label="mean" value={ind.longRunMean} unit={ind.unit} />
          {ind.longRunMedian != null && Math.abs(ind.longRunMedian) > 0.0001 && (
            <ProDelta current={ind.value} median={ind.longRunMedian} higherIsExpensive={ind.higherIsExpensive} />
          )}
        </div>
      )}
    </div>
  );
}

function ProMetric({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div className="flex items-baseline justify-between text-[10.5px] font-mono tabular-nums">
      <span className="text-fg-subtle uppercase tracking-[0.14em]">{label}</span>
      <span className="text-fg-muted">
        {value != null ? fmtNum(value, unit) : "—"}
      </span>
    </div>
  );
}

function ProDelta({ current, median, higherIsExpensive }: { current: number; median: number; higherIsExpensive: boolean }) {
  const rawPct = (current - median) / Math.abs(median);
  // For "lower is expensive" indicators (ERP/breadth/VIX), invert the sign so a
  // positive number always means "more expensive than median".
  const signed = higherIsExpensive ? rawPct : -rawPct;
  const label = signed >= 0 ? "+" : "";
  const colour =
    signed > 0.20 ? "rgb(var(--zone-warning))"
    : signed > 0.05 ? "rgb(var(--zone-watch))"
    : signed < -0.20 ? "rgb(var(--zone-clear))"
    : "rgb(var(--fg-muted))";
  return (
    <div className="flex items-baseline justify-between text-[10.5px] font-mono tabular-nums">
      <span className="text-fg-subtle uppercase tracking-[0.14em]">vs med</span>
      <span style={{ color: colour }} className="font-medium">
        {label}{(signed * 100).toFixed(0)}%
      </span>
    </div>
  );
}
