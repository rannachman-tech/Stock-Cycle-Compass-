"use client";

import { useEffect, useRef, useState } from "react";
import type { Indicator, IndicatorKey } from "@/lib/types";

interface Props {
  indicators: Indicator[];
  pro: boolean;
}

// ---- Per-indicator explainers --------------------------------------------
// Keyed by IndicatorKey so the same explainer applies across regions
// (US AAII, EU Sentix, UK GfK, Global BAML all share key "aaii").

interface Explainer {
  what: string;          // What this metric measures
  formula?: string;      // How it's computed (one line, mono)
  high: string;          // What "high" means
  low: string;           // What "low" means
}

const EXPLAINERS: Record<IndicatorKey, Explainer> = {
  buffett: {
    what:
      "Total stock market cap divided by GDP. Warren Buffett's preferred valuation gauge — a quick read on whether the market is rich vs the underlying economy.",
    formula: "Σ market cap / GDP × 100",
    high: "≥150% has historically marked extended periods of low forward returns",
    low: "≤80% has historically been near long-run averages",
  },
  cape: {
    what:
      "Shiller's cyclically-adjusted P/E. Smooths out cyclical earnings noise by averaging real earnings over 10 years. The most reliable long-horizon valuation gauge.",
    formula: "real S&P price / 10-yr avg real earnings",
    high: "≥30 has historically preceded weak 10-year returns",
    low: "≤14 has historically preceded strong 10-year returns",
  },
  fwdPe: {
    what:
      "Index price divided by consensus next-12-month earnings. Less smoothed than CAPE — reflects the cycle the market is currently pricing.",
    formula: "price / forward 12m EPS",
    high: "≥20 is a stretched cycle peak signal",
    low: "≤13 has often marked good entry points",
  },
  erp: {
    what:
      "Equity risk premium — the reward for holding stocks instead of risk-free Treasuries. The lower it is, the less you're being paid to take stock risk.",
    formula: "earnings yield − 10y Treasury yield",
    high: "≥6% historically signals stocks are cheap vs bonds",
    low: "≤1% is rare and historically punishing for forward returns",
  },
  breadth: {
    what:
      "Share of index constituents trading above their 200-day moving average. A health check on participation — late-cycle markets often see breadth narrow while the index keeps rising.",
    high: "≥70% means the rally is broadly supported",
    low: "≤40% means narrow leadership; often a warning before tops",
  },
  aaii: {
    what:
      "Investor sentiment surveys (AAII bull-bear in US, Sentix in EU, GfK in UK, BofA Bull-Bear globally). Surveys retail or institutional positioning. Extreme readings tend to be contrarian.",
    high: "Extreme bullishness is often a contrarian top signal",
    low: "Extreme bearishness is often a contrarian buy signal",
  },
  vix: {
    what:
      "Implied volatility expressed as a 1-year percentile (VIX in US, VSTOXX in EU, FTSE IVI in UK). A low reading combined with stretched valuations is the classic complacency setup.",
    high: "High VIX usually accompanies drawdowns — fear, not opportunity by itself",
    low: "Low VIX with rich valuations is a complacency warning",
  },
  yieldCurve: {
    what:
      "Spread between the 10-year and 2-year government bond yields. Inversions (negative spread) have historically preceded recessions by 6–18 months.",
    formula: "10y yield − 2y yield",
    high: "Steep curve usually means early-cycle recovery",
    low: "Negative spread (inversion) is a recession-warning signal",
  },
  fedFunds: {
    what:
      "The central bank's policy rate (Fed funds in the US, BoE base rate in the UK, ECB deposit rate in the EU). Sets the cost of money. Rising = restrictive, falling = stimulative.",
    high: "Tight policy compresses valuations and slows the economy",
    low: "Loose policy supports valuations and growth",
  },
};

function pctColor(p: number, higherIsExpensive: boolean) {
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
        <p className="text-[11px] text-fg-subtle">Hover any tile for the explanation</p>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
        {ordered.map((ind, i) => (
          <Tile
            key={ind.key}
            ind={ind}
            pro={pro}
            // First few tiles open tooltip aligned to their left edge,
            // last few align to their right edge so tooltips don't clip.
            tooltipAlign={i < 3 ? "left" : i >= ordered.length - 2 ? "right" : "center"}
          />
        ))}
      </div>
    </section>
  );
}

type TooltipAlign = "left" | "center" | "right";

function Tile({
  ind,
  pro,
  tooltipAlign,
}: {
  ind: Indicator;
  pro: boolean;
  tooltipAlign: TooltipAlign;
}) {
  const [hover, setHover] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!touchOpen) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (tileRef.current && !tileRef.current.contains(e.target as Node)) {
        setTouchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [touchOpen]);

  const open = hover || touchOpen;
  const colour = pctColor(ind.percentile, ind.higherIsExpensive);
  const dotX = `${Math.max(2, Math.min(98, ind.percentile))}%`;

  return (
    <div
      ref={tileRef}
      className="relative rounded-md border border-border bg-surface p-3 hover:border-border-strong transition-colors cursor-help"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => setTouchOpen((v) => !v)}
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
            <ProDelta
              current={ind.value}
              median={ind.longRunMedian}
              higherIsExpensive={ind.higherIsExpensive}
            />
          )}
        </div>
      )}

      {open && <Tooltip ind={ind} align={tooltipAlign} />}
    </div>
  );
}

function Tooltip({ ind, align }: { ind: Indicator; align: TooltipAlign }) {
  const exp = EXPLAINERS[ind.key];
  if (!exp) return null;

  const alignClass =
    align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <div
      className={`absolute z-30 ${alignClass} bottom-[calc(100%+8px)] w-[280px] sm:w-[320px] rounded-md border border-border-strong bg-surface-elev shadow-lg p-3.5 pointer-events-none`}
      role="tooltip"
    >
      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-accent">
        {ind.shortLabel}
      </div>
      <h4 className="mt-1 text-[13px] font-medium text-fg leading-snug">{ind.label}</h4>
      <p className="mt-2 text-[12px] text-fg-muted leading-relaxed">{exp.what}</p>
      {exp.formula && (
        <div className="mt-2 rounded-sm bg-bg-soft border border-border px-2 py-1.5 font-mono text-[11px] text-fg">
          {exp.formula}
        </div>
      )}
      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] leading-snug">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-zone-warning">High</div>
          <div className="mt-0.5 text-fg-muted">{exp.high}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-zone-clear">Low</div>
          <div className="mt-0.5 text-fg-muted">{exp.low}</div>
        </div>
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-border flex items-baseline justify-between text-[10.5px] font-mono">
        <span className="text-fg-subtle">long-run median</span>
        <span className="text-fg-muted tabular-nums">
          {ind.longRunMedian != null ? fmtNum(ind.longRunMedian, ind.unit) : "—"}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between text-[10.5px] font-mono">
        <span className="text-fg-subtle">today</span>
        <span className="text-fg tabular-nums">{fmtNum(ind.value, ind.unit)}</span>
      </div>

      {/* Arrow pointing down to the tile */}
      <div
        className="absolute top-full -mt-px w-2.5 h-2.5 rotate-45 border-r border-b border-border-strong bg-surface-elev"
        style={{
          left: align === "left" ? "16px" : align === "right" ? undefined : "50%",
          right: align === "right" ? "16px" : undefined,
          transform: align === "center" ? "translateX(-50%) rotate(45deg)" : "rotate(45deg)",
        }}
      />
    </div>
  );
}

function ProMetric({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div className="flex items-baseline justify-between text-[10.5px] font-mono tabular-nums">
      <span className="text-fg-subtle uppercase tracking-[0.14em]">{label}</span>
      <span className="text-fg-muted">{value != null ? fmtNum(value, unit) : "—"}</span>
    </div>
  );
}

function ProDelta({
  current,
  median,
  higherIsExpensive,
}: {
  current: number;
  median: number;
  higherIsExpensive: boolean;
}) {
  const rawPct = (current - median) / Math.abs(median);
  const signed = higherIsExpensive ? rawPct : -rawPct;
  const label = signed >= 0 ? "+" : "";
  const colour =
    signed > 0.2
      ? "rgb(var(--zone-warning))"
      : signed > 0.05
      ? "rgb(var(--zone-watch))"
      : signed < -0.2
      ? "rgb(var(--zone-clear))"
      : "rgb(var(--fg-muted))";
  return (
    <div className="flex items-baseline justify-between text-[10.5px] font-mono tabular-nums">
      <span className="text-fg-subtle uppercase tracking-[0.14em]">vs med</span>
      <span style={{ color: colour }} className="font-medium">
        {label}
        {(signed * 100).toFixed(0)}%
      </span>
    </div>
  );
}
