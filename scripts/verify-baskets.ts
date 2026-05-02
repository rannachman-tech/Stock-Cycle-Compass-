// Verify every basket holding's instrumentId resolves against the live
// eToro public catalog and the SymbolFull matches.
// Run with: npm run verify:baskets

import { allHoldings } from "../lib/baskets";

const CATALOG_URL = "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments";

interface CatalogEntry {
  InstrumentID: number;
  SymbolFull: string;
  InstrumentDisplayName: string;
}

async function main() {
  console.log(`Fetching ${CATALOG_URL} …`);
  const res = await fetch(CATALOG_URL);
  if (!res.ok) {
    console.error(`Catalog fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const json = (await res.json()) as { InstrumentDisplayDatas: CatalogEntry[] };
  const cat = new Map<number, CatalogEntry>();
  for (const it of json.InstrumentDisplayDatas) {
    cat.set(it.InstrumentID, it);
  }
  console.log(`Catalog loaded: ${cat.size.toLocaleString()} instruments\n`);

  const fail: string[] = [];
  const seen = new Set<number>();
  let ok = 0;
  for (const h of allHoldings()) {
    if (seen.has(h.instrumentId) === false) seen.add(h.instrumentId);
    const e = cat.get(h.instrumentId);
    if (!e) {
      fail.push(`X ${h.ticker} id=${h.instrumentId} not in catalog`);
      continue;
    }
    if ((e.SymbolFull ?? "").toUpperCase() !== h.symbolFull.toUpperCase()) {
      fail.push(`X ${h.ticker} drift: catalog="${e.SymbolFull}" vs basket="${h.symbolFull}"`);
      continue;
    }
    ok++;
  }

  console.log(`✓ ${ok} holding rows resolved correctly (${seen.size} unique instruments).`);
  if (fail.length) {
    console.log(`\n${fail.length} failure(s):`);
    fail.forEach((f) => console.log(f));
    process.exit(1);
  }
  console.log("\nAll baskets verified against the live eToro public catalog.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
