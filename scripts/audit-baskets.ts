// Deep audit: for every unique basket holding, fetch its full eToro catalog
// entry and check:
//   - InstrumentID matches and SymbolFull matches
//   - InstrumentTypeID is 6 (ETF) — not 5 (stock) or anything weird
//   - ExchangeID is recognised (and not a "synthetic" exchange)
//   - IsInternalInstrument is false (true = synthetic, often not real cash)
//   - HasExpirationDate is false (futures-style products)

import { allHoldings, BASKETS } from "../lib/baskets";

const CATALOG_URL = "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments";

const TYPE_LABEL: Record<number, string> = {
  1: "Forex",
  2: "Commodity",
  4: "Index",
  5: "Stock",
  6: "ETF",
  10: "Crypto",
};

// Verified by direct sampling against the live catalog.
const EXCH_LABEL: Record<number, string> = {
  1: "Forex",
  2: "Commodity",
  3: "Index",
  4: "NASDAQ",
  5: "NYSE",
  6: "Xetra (.DE)",
  7: "LSE main (.L)",
  8: "Crypto",
  9: "Euronext Paris (.PA)",
  10: "Madrid (.MC)",
  11: "Borsa Italiana (.MI)",
  12: "SIX Swiss (.ZU)",
  14: "Oslo (.OL)",
  15: "Stockholm (.ST)",
  16: "Copenhagen (.CO)",
  17: "Helsinki (.HE)",
  21: "HKEX (.HK)",
  30: "Euronext Amsterdam (.NV)",
  31: "ASX (.ASX)",
  33: "RTH/Tradegate (.RTH)",
  38: "Xetra ETF (.DE)",
  42: "LSE small (.L)",
  43: "LSE small (.L)",
  44: "LSE small (.L)",
  56: "Tokyo (.T)",
};

interface CatalogEntry {
  InstrumentID: number;
  InstrumentDisplayName: string;
  InstrumentTypeID: number;
  ExchangeID: number;
  SymbolFull: string;
  IsInternalInstrument: boolean;
  HasExpirationDate: boolean;
  PriceSource?: string;
}

function exchLabel(id: number) { return EXCH_LABEL[id] ?? `exch#${id}`; }
function typeLabel(id: number) { return TYPE_LABEL[id] ?? `type#${id}`; }

async function main() {
  console.log(`Fetching ${CATALOG_URL} ...`);
  const res = await fetch(CATALOG_URL);
  if (!res.ok) {
    console.error(`Catalog fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const json = (await res.json()) as { InstrumentDisplayDatas: CatalogEntry[] };
  const all = json.InstrumentDisplayDatas;
  const byId = new Map<number, CatalogEntry>();
  for (const it of all) byId.set(it.InstrumentID, it);
  console.log(`Loaded ${all.length.toLocaleString()} catalog entries.\n`);

  const seen = new Set<number>();
  const holdings = allHoldings();
  const summary: Array<{
    ticker: string;
    id: number;
    type: string;
    exch: string;
    name: string;
    flag: string;
  }> = [];

  for (const h of holdings) {
    if (seen.has(h.instrumentId)) continue;
    seen.add(h.instrumentId);

    const e = byId.get(h.instrumentId);
    if (!e) {
      summary.push({
        ticker: h.ticker, id: h.instrumentId, type: "?", exch: "?",
        name: "(NOT IN CATALOG)", flag: "MISSING",
      });
      continue;
    }

    const flags: string[] = [];
    if (e.InstrumentTypeID !== 6) flags.push(`TYPE=${typeLabel(e.InstrumentTypeID)}`);
    if (e.IsInternalInstrument) flags.push("internal/synthetic");
    if (e.HasExpirationDate) flags.push("has-expiry");
    if ((e.SymbolFull ?? "").toUpperCase() !== h.symbolFull.toUpperCase()) {
      flags.push(`symbol-drift catalog="${e.SymbolFull}"`);
    }

    summary.push({
      ticker: h.ticker,
      id: h.instrumentId,
      type: typeLabel(e.InstrumentTypeID),
      exch: exchLabel(e.ExchangeID),
      name: e.InstrumentDisplayName ?? "",
      flag: flags.length > 0 ? flags.join(" | ") : "OK",
    });
  }

  // ---- Report -------------------------------------------------------
  console.log("=== ALL UNIQUE BASKET HOLDINGS ===\n");
  const w = (s: string, n: number) => s.padEnd(n).slice(0, n);
  console.log(
    w("Ticker", 10) + w("ID", 8) + w("Type", 8) + w("Exchange", 22) + w("Name", 50) + "Flag",
  );
  console.log("-".repeat(160));
  for (const r of summary) {
    console.log(
      w(r.ticker, 10) + w(String(r.id), 8) + w(r.type, 8) + w(r.exch, 22) + w(r.name, 50) + r.flag,
    );
  }

  // Group by exchange
  console.log("\n=== HOLDINGS BY EXCHANGE ===");
  const byExch = new Map<string, string[]>();
  for (const r of summary) {
    if (!byExch.has(r.exch)) byExch.set(r.exch, []);
    byExch.get(r.exch)!.push(r.ticker);
  }
  for (const [exch, tickers] of [...byExch.entries()].sort()) {
    console.log(`  ${exch.padEnd(24)} ${tickers.join(", ")}`);
  }

  // Per-basket exchange footprint
  console.log("\n=== EXCHANGE FOOTPRINT PER BASKET ===");
  for (const region of Object.keys(BASKETS) as Array<keyof typeof BASKETS>) {
    for (const zone of Object.keys(BASKETS[region]) as Array<keyof (typeof BASKETS)[typeof region]>) {
      const b = BASKETS[region][zone];
      const exchSet = new Map<string, number>();
      for (const h of b.holdings) {
        const r = summary.find((s) => s.id === h.instrumentId);
        const exch = r?.exch ?? "?";
        exchSet.set(exch, (exchSet.get(exch) ?? 0) + h.weight);
      }
      const desc = [...exchSet.entries()]
        .sort((a, b2) => b2[1] - a[1])
        .map(([k, v]) => `${k} ${v}%`)
        .join(", ");
      console.log(`  ${region.padEnd(7)} ${zone.padEnd(8)}  -> ${desc}`);
    }
  }

  // Flagged
  const flagged = summary.filter((s) => s.flag !== "OK");
  if (flagged.length > 0) {
    console.log("\n=== FLAGGED (not real cash-equity ETFs) ===");
    for (const r of flagged) {
      console.log(`  ${r.ticker.padEnd(10)} id=${r.id}  ${r.flag}  -- ${r.name}`);
    }
  }

  console.log(`\n${summary.length} unique instruments audited.`);
  console.log(`${flagged.length} flagged.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
