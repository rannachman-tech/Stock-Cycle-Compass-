// Stock Cycle Compass — type definitions

export type Zone = "clear" | "watch" | "warning" | "storm";
export type RegionId = "us" | "eu" | "uk" | "global";

export const ZONE_LABEL: Record<Zone, string> = {
  clear: "Early cycle",
  watch: "Mid cycle",
  warning: "Late cycle",
  storm: "Reset",
};

export const ZONE_DEFINITION: Record<Zone, string> = {
  clear:
    "Valuations near or below long-run norms. Recovery dynamics. The cycle is young.",
  watch:
    "Valuations stretched but earnings still growing. Sentiment getting confident. The middle innings.",
  warning:
    "Valuations rich, breadth narrowing, sentiment bullish. The peak typically lives here.",
  storm:
    "Valuations have already broken. Sentiment capitulating. The reset, not the start of one.",
};

export const REGIONS: { id: RegionId; label: string; short: string }[] = [
  { id: "us", label: "United States", short: "US" },
  { id: "eu", label: "Europe", short: "EU" },
  { id: "uk", label: "United Kingdom", short: "UK" },
  { id: "global", label: "Global", short: "World" },
];

// ---- Indicator schema -------------------------------------------------

export type IndicatorKey =
  | "buffett"
  | "cape"
  | "fwdPe"
  | "erp"
  | "breadth"
  | "aaii"
  | "vix"
  | "yieldCurve"
  | "fedFunds";

export interface Indicator {
  key: IndicatorKey;
  label: string;
  shortLabel: string;
  value: number;            // raw current value
  unit: string;             // "%", "x", etc.
  percentile: number;       // 0..100, where this sits in long-run history
  asOf: string;             // ISO date
  source: string;
  sourceUrl: string;
  stale: boolean;           // true if last value > 240d old
  // Higher value = more expensive? (for tile interpretation)
  higherIsExpensive: boolean;
  // For Pro mode
  longRunMean?: number;
  longRunMedian?: number;
}

// ---- Region snapshot --------------------------------------------------

export interface RegionSnapshot {
  region: RegionId;
  regionLabel: string;
  // Composite valuation percentile, 0..100
  percentile: number;
  // Where we are on the cycle wheel — 0..360 degrees, drives the needle
  // 0 = top (early cycle entry), proceeds clockwise.
  wheelDegrees: number;
  zone: Zone;
  // Implied "fair value" S&P 500 level — Pro mode only
  impliedFairValue?: number;
  // Insights — title + 2-3 paragraph editorial read
  insights: {
    headline: string;
    body: string[];
    asOf: string;
  };
  indicators: Indicator[];
  generatedAt: string;
}

// ---- CAPE history (for spiral) ---------------------------------------

export interface CapePoint {
  year: number;        // can be fractional, e.g. 2024.50
  cape: number;
  // Cycle-relative position (0..1) within the local long swing.
  // Used by the spiral to colour each loop.
  cycleT: number;
  zone: Zone;
}

// ---- Bundle ----------------------------------------------------------

export interface CompassData {
  generatedAt: string;
  // Snapshot per region
  regions: Record<RegionId, RegionSnapshot>;
  // Long history for the spiral — US S&P CAPE since ~1900
  capeHistory: CapePoint[];
}

// ---- Trade basket (verbatim from skill) ------------------------------

export interface BasketHolding {
  ticker: string;
  symbolFull: string;
  instrumentId: number;
  name: string;
  weight: number;        // 0..100
  shortRationale: string;
  longRationale: string;
}

export interface Basket {
  zone: Zone;
  region: RegionId;
  title: string;
  thesis: string;
  holdings: BasketHolding[];
}
