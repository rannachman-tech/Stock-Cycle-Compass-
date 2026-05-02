// Comprehensive 9-section basket simulator.
// All checks run; each section reports pass/fail; non-zero exit if any fail.
// Run with: npm run simulate:baskets

import { BASKETS, basketFor, allocate, allHoldings } from "../lib/baskets";
import { phaseFor, zoneFor, wheelDegreesFor } from "../lib/score";
import type { RegionId, Zone, BasketHolding } from "../lib/types";

const REGIONS: RegionId[] = ["us", "eu", "uk", "global"];
const ZONES: Zone[] = ["clear", "watch", "warning", "storm"];

const CATALOG_URL = "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments";

let totalChecks = 0;
let totalFails = 0;

function ok(msg: string) {
  totalChecks++;
  // console.log("  ✓", msg);
}
function fail(msg: string) {
  totalChecks++;
  totalFails++;
  console.log("  ✕", msg);
}

function section(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    const before = totalFails;
    console.log(`\n— ${name}`);
    await fn();
    const f = totalFails - before;
    console.log(f === 0 ? `  PASS — ${name}` : `  FAIL — ${name} (${f} issues)`);
  })();
}

// ---------------------------------------------------------------------

async function s1_coverage() {
  for (const r of REGIONS) {
    if (!BASKETS[r]) { fail(`region ${r} missing`); continue; }
    for (const z of ZONES) {
      if (!BASKETS[r][z]) fail(`(${r}, ${z}) missing`);
      else ok(`(${r}, ${z}) present`);
    }
  }
}

async function s2_invariants() {
  for (const r of REGIONS) {
    for (const z of ZONES) {
      const b = BASKETS[r][z];
      if (!b) continue;
      const sum = b.holdings.reduce((a, h) => a + h.weight, 0);
      if (Math.round(sum) !== 100) fail(`(${r},${z}) weights sum ${sum} != 100`);
      else ok(`(${r},${z}) weights sum 100`);

      if (b.holdings.length < 3) fail(`(${r},${z}) has only ${b.holdings.length} holdings`);
      if (b.holdings.length > 10) fail(`(${r},${z}) has ${b.holdings.length} holdings (>10)`);

      const symbols = new Set<string>();
      for (const h of b.holdings) {
        if (!h.instrumentId || h.instrumentId <= 0) fail(`(${r},${z}) ${h.ticker}: bad id ${h.instrumentId}`);
        if (!h.symbolFull) fail(`(${r},${z}) ${h.ticker}: missing symbolFull`);
        if (!h.shortRationale) fail(`(${r},${z}) ${h.ticker}: missing shortRationale`);
        if (!h.longRationale) fail(`(${r},${z}) ${h.ticker}: missing longRationale`);
        if (h.weight <= 0 || h.weight > 55) fail(`(${r},${z}) ${h.ticker}: weight ${h.weight} out of bounds`);
        if (symbols.has(h.symbolFull)) fail(`(${r},${z}) duplicate symbol ${h.symbolFull}`);
        symbols.add(h.symbolFull);
      }
    }
  }
}

async function s3_field_consistency() {
  for (const r of REGIONS) {
    for (const z of ZONES) {
      const b = BASKETS[r][z];
      if (!b) continue;
      if (b.region !== r) fail(`(${r},${z}) basket.region = ${b.region}`);
      if (b.zone !== z) fail(`(${r},${z}) basket.zone = ${b.zone}`);
    }
  }
}

async function s4_phaseFor_edges() {
  const cases: Array<[number, Zone]> = [
    [-100, "storm"], [-1, "storm"],
    [0, "clear"], [0.001, "clear"], [29.999, "clear"],
    [45, "watch"], [60, "watch"], [74.999, "watch"],
    [75, "warning"], [80, "warning"], [94.999, "warning"],
    [95, "warning"], [100, "warning"], [200, "warning"],
  ];
  for (const [score, expected] of cases) {
    const got = phaseFor(score);
    if (got !== expected) fail(`phaseFor(${score}) = ${got}, expected ${expected}`);
    else ok(`phaseFor(${score}) = ${expected}`);
  }
}

async function s5_routing_matrix() {
  const scores = [-50, 0, 15, 30, 45, 60, 70, 80, 90, 100];
  for (const r of REGIONS) {
    for (const s of scores) {
      const z = phaseFor(s);
      const b = basketFor(z, r);
      if (!b) fail(`route (${r}, ${s}) → ${z} → no basket`);
      if (b.region !== r || b.zone !== z) fail(`route (${r}, ${s}) returned (${b.region}, ${b.zone})`);
    }
  }
}

async function s6_allocation_math() {
  const amounts = [1000, 1, 0.10, 100000, 333, 999.99, 50, 10000];
  for (const r of REGIONS) {
    for (const z of ZONES) {
      const b = BASKETS[r][z];
      if (!b) continue;
      for (const amt of amounts) {
        const rows = allocate(b, amt);
        const sum = rows.reduce((a, h) => a + h.dollars, 0);
        const tol = Math.max(0.05, amt * 0.005);
        if (Math.abs(sum - amt) > tol) {
          fail(`allocate(${r},${z}, $${amt}) sum $${sum} differs by >$${tol.toFixed(2)}`);
        }
        for (const h of rows) {
          if (h.dollars < 0) fail(`allocate negative for ${h.ticker}`);
        }
      }
    }
  }
}

async function s7_cross_basket_consistency() {
  const map = new Map<number, string>();   // id → symbolFull
  const inv = new Map<string, number>();   // symbolFull → id
  for (const h of allHoldings()) {
    const prev = map.get(h.instrumentId);
    if (prev != null && prev !== h.symbolFull) fail(`id ${h.instrumentId}: ${prev} ≠ ${h.symbolFull}`);
    map.set(h.instrumentId, h.symbolFull);

    const prevId = inv.get(h.symbolFull);
    if (prevId != null && prevId !== h.instrumentId) fail(`symbol ${h.symbolFull}: id ${prevId} ≠ ${h.instrumentId}`);
    inv.set(h.symbolFull, h.instrumentId);
  }
}

async function s8_live_catalog_check() {
  console.log("    fetching live catalog…");
  const res = await fetch(CATALOG_URL);
  if (!res.ok) { fail(`catalog HTTP ${res.status}`); return; }
  const json = (await res.json()) as { InstrumentDisplayDatas: any[] };
  const cat = new Map<number, any>(json.InstrumentDisplayDatas.map((it: any) => [it.InstrumentID, it]));
  for (const h of allHoldings()) {
    const e = cat.get(h.instrumentId);
    if (!e) { fail(`${h.ticker} id=${h.instrumentId} not in catalog`); continue; }
    if ((e.SymbolFull ?? "").toUpperCase() !== h.symbolFull.toUpperCase()) {
      fail(`${h.ticker} drift: ${e.SymbolFull} vs ${h.symbolFull}`);
    }
  }
}

async function s9_defensive_props() {
  // Single-position concentration ≤ 55% (already enforced in invariants),
  // and the storm baskets must contain a cash-equivalent.
  const cashSymbols = new Set(["BIL", "SHV", "IS3M.DE", "ERNS.L", "IB01.L"]);
  for (const r of REGIONS) {
    const storm = BASKETS[r].storm;
    if (!storm) continue;
    const hasCash = storm.holdings.some((h) => cashSymbols.has(h.symbolFull));
    if (!hasCash) fail(`(${r}, storm) does not include any cash-equivalent`);
    else ok(`(${r}, storm) has cash sleeve`);
  }
  // wheelDegreesFor must always be in [0, 360)
  const probes: Array<[number, Zone]> = [
    [0, "clear"], [29, "clear"], [45, "watch"], [80, "warning"], [-50, "storm"],
  ];
  for (const [s, z] of probes) {
    const d = wheelDegreesFor(s, z);
    if (d < 0 || d >= 360 || !Number.isFinite(d)) fail(`wheelDegreesFor(${s}, ${z}) = ${d}`);
    else ok(`wheelDegreesFor(${s}, ${z}) = ${d.toFixed(1)}`);
  }
  // zoneFor must be deterministic
  const z1 = zoneFor(50);
  const z2 = zoneFor(50);
  if (z1 !== z2) fail("zoneFor not deterministic");
}

// ---------------------------------------------------------------------

async function main() {
  console.log("Stock Cycle Compass — basket simulator");
  await section("1. coverage", s1_coverage);
  await section("2. invariants", s2_invariants);
  await section("3. field consistency", s3_field_consistency);
  await section("4. phaseFor edge cases", s4_phaseFor_edges);
  await section("5. routing matrix", s5_routing_matrix);
  await section("6. allocation math", s6_allocation_math);
  await section("7. cross-basket consistency", s7_cross_basket_consistency);
  await section("8. live catalog cross-check", s8_live_catalog_check);
  await section("9. defensive properties", s9_defensive_props);

  console.log(`\n— summary —`);
  console.log(`  ${totalChecks} checks, ${totalFails} failures`);
  if (totalFails > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
