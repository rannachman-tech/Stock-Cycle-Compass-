"use client";

import type { Indicator, RegionId, RegionSnapshot } from "@/lib/types";

interface Props {
  snap: RegionSnapshot;
  region: RegionId;
}

const INDEX_LABEL: Record<RegionId, string> = {
  us: "S&P 500",
  eu: "STOXX 600",
  uk: "FTSE 100",
  global: "MSCI ACWI",
};

// Shiller's empirical formula: high CAPE → low forward 10y returns.
// Approximation: forward 10y annualised real return ≈ 0.18 - 0.10 * ln(CAPE).
// Calibrated so CAPE ~16 gives ~5%/yr, CAPE ~30 gives ~1%/yr, CAPE ~40 gives ~-1%/yr.
function forwardReturn10y(cape: number): number {
  if (!Number.isFinite(cape) || cape <= 0) return NaN;
  return 0.18 - 0.10 * Math.log(cape);
}

function fmtPct(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return "—";
  const sign = x >= 0 ? "+" : "";
  return `${sign}${(x * 100).toFixed(digits)}%`;
}

// Distance of indicator from its long-run median, in % terms (or absolute units
// for unitless indicators like ratios).
function distanceFromMedian(ind: Indicator): { pct: number | null; abs: number } {
  const m = ind.longRunMedian;
  if (m == null || !Number.isFinite(m) || m === 0) {
    return { pct: null, abs: ind.value - (m ?? 0) };
  }
  const abs = ind.value - m;
  const pct = abs / Math.abs(m);
  return { pct, abs };
}

export default function ProDetails({ snap, region }: Props) {
  const indexLabel = INDEX_LABEL[region];
  const cape = snap.indicators.find((i) => i.key === "cape");
  const fwd = cape ? forwardReturn10y(cape.value) : NaN;

  // Top 3 most-stretched indicators by signed distance from median
  const signedDeviation = snap.indicators
    .map((ind) => {
      const { pct } = distanceFromMedian(ind);
      // For "higher is expensive", positive deviation → expensive
      // For "lower is expensive" (ERP, breadth, VIX), invert sign.
      const signed = pct != null ? (ind.higherIsExpensive ? pct : -pct) : 0;
      return { ind, signed };
    })
    .sort((a, b) => b.signed - a.signed);

  const mostExpensive = signedDeviation.slice(0, 3);

  return (
    <div className="mt-4 w-full max-w-[440px] mx-auto rounded-lg border border-accent/30 bg-accent/[0.04] dark:bg-accent/[0.08] p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Pro · raw view
        </div>
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-fg-subtle">
          {indexLabel}
        </div>
      </div>

      {/* Implied fair value */}
      {snap.impliedFairValue != null && (
        <ProRow
          label="Implied fair value"
          value={`${indexLabel} ${snap.impliedFairValue.toLocaleString()}`}
          hint="CAPE-median mean-reversion"
        />
      )}

      {/* 10-year forward return estimate */}
      <ProRow
        label="10y forward return"
        value={fmtPct(fwd)}
        hint="Shiller CAPE regression, real, annualised"
      />

      {/* Composite breakdown — top 3 most-stretched */}
      <div className="mt-2.5 pt-2.5 border-t border-accent/20">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fg-subtle mb-1.5">
          Most stretched lenses
        </div>
        <div className="space-y-1">
          {mostExpensive.map(({ ind, signed }) => (
            <div key={ind.key} className="flex items-baseline justify-between gap-2 text-[12px]">
              <div className="text-fg-muted truncate">{ind.shortLabel}</div>
              <div className="font-mono tabular-nums shrink-0">
                <span className="text-fg">{ind.value.toFixed(ind.value >= 100 ? 0 : 1)}{ind.unit}</span>
                <span className="ml-1.5 text-fg-subtle">·</span>
                <span
                  className="ml-1.5"
                  style={{
                    color: signed > 0.15 ? "rgb(var(--zone-warning))"
                         : signed > 0.05 ? "rgb(var(--zone-watch))"
                         : signed < -0.15 ? "rgb(var(--zone-clear))"
                         : "rgb(var(--fg-muted))",
                  }}
                >
                  {fmtPct(signed)} vs median
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="mt-2 flex items-baseline justify-between gap-2">
      <div>
        <div className="text-[12.5px] text-fg">{label}</div>
        <div className="text-[10.5px] text-fg-subtle leading-snug">{hint}</div>
      </div>
      <div className="font-mono text-[14px] tabular-nums text-fg shrink-0">{value}</div>
    </div>
  );
}
