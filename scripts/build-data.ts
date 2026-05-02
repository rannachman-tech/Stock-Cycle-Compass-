// Cron-driven data builder. Runs in GitHub Actions every 24h, commits a fresh
// data/stock-cycle.json to the repo. No API keys required — all data comes from
// public, unauthenticated endpoints.
//
// Sources:
//   FRED  — public CSV / JSON via fredgraph.csv?id=<series>
//   Shiller — http://www.econ.yale.edu/~shiller/data/ie_data.xls (CSV mirror used)
//   AAII  — https://www.aaii.com/files/surveys/sentiment.xls (CSV mirror)
//   Yahoo unofficial — query1.finance.yahoo.com (used for breadth aggregates)
//
// We only persist a TINY composite per region — this script does not pretend
// to be a full data pipeline. The goal is to keep the static JSON fresh.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ---- helpers ----------------------------------------------------------

async function fredCsv(id: string): Promise<Array<[string, number]>> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FRED ${id}: HTTP ${r.status}`);
  const text = await r.text();
  return text
    .split("\n")
    .slice(1)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [d, v] = row.split(",");
      const n = Number(v);
      return [d, Number.isFinite(n) ? n : NaN] as [string, number];
    })
    .filter(([, v]) => Number.isFinite(v));
}

function percentileOf(arr: number[], v: number) {
  if (!arr.length) return 50;
  const sorted = [...arr].sort((a, b) => a - b);
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / sorted.length) * 100);
}

function ageDays(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((Date.now() - t) / 86_400_000);
}

// ---- one indicator ----------------------------------------------------

interface IndicatorRow {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  unit: string;
  percentile: number;
  asOf: string;
  source: string;
  sourceUrl: string;
  stale: boolean;
  higherIsExpensive: boolean;
  longRunMean?: number;
  longRunMedian?: number;
}

async function fredIndicator(opts: {
  id: string;
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  source: string;
  higherIsExpensive: boolean;
  asPct?: boolean;
}): Promise<IndicatorRow> {
  const series = await fredCsv(opts.id);
  const last = series[series.length - 1];
  const allValues = series.map(([, v]) => v);
  const sum = allValues.reduce((a, b) => a + b, 0);
  const mean = sum / allValues.length;
  const sorted = [...allValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const stale = ageDays(last[0]) > 240;
  const value = last[1];
  const percentile = stale ? 50 : percentileOf(allValues, value);
  return {
    key: opts.key,
    label: opts.label,
    shortLabel: opts.shortLabel,
    value: opts.asPct ? Math.round(value * 100) : value,
    unit: opts.unit,
    percentile,
    asOf: last[0],
    source: opts.source,
    sourceUrl: `https://fred.stlouisfed.org/series/${opts.id}`,
    stale,
    higherIsExpensive: opts.higherIsExpensive,
    longRunMean: Math.round(mean * 100) / 100,
    longRunMedian: Math.round(median * 100) / 100,
  };
}

// ---- main -------------------------------------------------------------

async function main() {
  console.log("Pulling fresh inputs…");
  const [vix, t10y2y, fedFunds] = await Promise.all([
    fredIndicator({
      id: "VIXCLS",
      key: "vix",
      label: "VIX (1-yr percentile)",
      shortLabel: "VIX",
      unit: "",
      source: "FRED VIXCLS",
      higherIsExpensive: false,
    }),
    fredIndicator({
      id: "T10Y2Y",
      key: "yieldCurve",
      label: "10y - 2y spread",
      shortLabel: "Curve",
      unit: "pp",
      source: "FRED T10Y2Y",
      higherIsExpensive: false,
    }),
    fredIndicator({
      id: "FEDFUNDS",
      key: "fedFunds",
      label: "Fed funds rate",
      shortLabel: "Fed funds",
      unit: "%",
      source: "FRED FEDFUNDS",
      higherIsExpensive: true,
    }),
  ]);

  // The remaining indicators (Buffett, CAPE, fwdPe, ERP, breadth, AAII)
  // require either Shiller CSV parsing or scraping — implementations stubbed
  // here. The static seed in data/stock-cycle.json is preserved if the script
  // can't refresh them. In practice, you'd add these one by one — a future
  // commit can extend this script. For now we patch only what FRED gives us.

  // Read existing JSON as base, patch in fresh values
  const path = resolve(process.cwd(), "data/stock-cycle.json");
  const fs = await import("node:fs/promises");
  let base: any;
  try {
    base = JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    console.error("Could not read existing data/stock-cycle.json — bailing out.");
    process.exit(1);
  }

  // Patch only the US region for now — this skill ships with 4 regions,
  // we pull only one set of FRED-driven series.
  for (const region of Object.keys(base.regions)) {
    const inds = base.regions[region].indicators;
    for (const ind of inds) {
      if (ind.key === "vix" && region === "us") Object.assign(ind, vix);
      if (ind.key === "yieldCurve" && region === "us") Object.assign(ind, t10y2y);
      if (ind.key === "fedFunds" && region === "us") Object.assign(ind, fedFunds);
    }
  }
  base.generatedAt = new Date().toISOString();

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(base, null, 2) + "\n", "utf8");
  console.log("Wrote", path);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
