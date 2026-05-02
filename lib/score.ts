// Score → zone → wheel-degrees mapping.
// Score = composite valuation percentile (0..100). Higher = more expensive.
//
// Wheel quadrants (clockwise from 0deg = top):
//    0..90deg   → Clear (early cycle, recovery → expansion)
//   90..180deg  → Watch (mid-cycle expansion)
//  180..270deg  → Warning (late-cycle, peak forming)
//  270..360deg  → Storm (drawdown, capitulation, reset)

import type { Zone } from "./types";

export function zoneFor(percentile: number): Zone {
  if (percentile >= 80) return "warning";
  if (percentile >= 60) return "watch";
  if (percentile >= 30) return "watch";
  return "clear";
}

// More nuanced — uses both percentile AND directional signal (delta).
// We use this server-side when building data, where we have momentum context.
export function phaseFor(percentile: number, delta?: number): Zone {
  // Storm: we're already in the reset (high vix + falling valuations)
  // For static input, signal storm with negative percentile values reserved for that.
  if (percentile < 0) return "storm";
  if (percentile >= 95) return "warning";
  if (percentile >= 75) return "warning";
  if (percentile >= 45) return "watch";
  return "clear";
}

// Map a composite percentile + an explicit zone classification to a wheel angle.
// We don't simply do `pct * 3.6` because the wheel quadrants are equal-sized
// but valuation regimes are not. Lay the score onto the quadrant arc.
export function wheelDegreesFor(percentile: number, zone: Zone): number {
  // Each quadrant occupies 90deg.
  // We map the within-zone position to a 75deg arc (centred — keeps needle off
  // the quadrant boundary which would visually feel "between" zones).
  const quadrantStart: Record<Zone, number> = {
    clear: 0,
    watch: 90,
    warning: 180,
    storm: 270,
  };
  const start = quadrantStart[zone];
  const span = 90;
  const margin = 7.5; // keep needle 7.5deg inside the quadrant edge
  const innerSpan = span - margin * 2;

  let t = 0.5;
  if (zone === "clear") t = clamp(percentile / 30, 0, 1);
  else if (zone === "watch") t = clamp((percentile - 30) / 30, 0, 1);
  else if (zone === "warning") t = clamp((percentile - 60) / 35, 0, 1);
  else t = 0.5; // storm — needle parks centre of quadrant when triggered

  return start + margin + t * innerSpan;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

// Implied "fair value" S&P level given current price and CAPE percentile.
// Naive but useful as a Pro-mode hint. fair = price * (median_cape / current_cape)
export function impliedFairValue(currentPrice: number, capeNow: number, capeMedian: number): number {
  if (capeNow <= 0 || capeMedian <= 0) return currentPrice;
  return Math.round(currentPrice * (capeMedian / capeNow));
}
