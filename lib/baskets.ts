// Stock Cycle Compass — trade baskets
// 4 zones × 4 regions = 16 baskets. All instrumentIds pre-resolved against
// https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments
// Run `npm run verify:baskets` after any change.

import type { Basket, BasketHolding, RegionId, Zone } from "./types";

// ---- Helper: build a basket from rows ---------------------------------

function holding(
  ticker: string,
  symbolFull: string,
  instrumentId: number,
  name: string,
  weight: number,
  shortRationale: string,
  longRationale: string,
): BasketHolding {
  return { ticker, symbolFull, instrumentId, name, weight, shortRationale, longRationale };
}

// =====================================================================
// US — Clear (early cycle): broad equity overweight
// =====================================================================
const US_CLEAR: Basket = {
  zone: "clear",
  region: "us",
  title: "Lean in — broad US equity",
  thesis:
    "Early cycle is when you want maximum exposure to the up-move. Skew toward total-market and growth, with a developed-international tilt and a sliver of EM for the rebound trade.",
  holdings: [
    holding("VTI", "VTI", 4237, "Vanguard Total Stock Market ETF", 40,
      "Total US market core",
      "VTI gives you 4,000+ US listings in one trade. Cap-weighted, ultra-low cost. The cleanest expression of \"I want US equity exposure\"."),
    holding("QQQ", "QQQ", 3006, "Invesco QQQ Trust", 25,
      "Growth tilt",
      "Nasdaq-100 — heavily concentrated in megacap tech. Outperforms VTI in early-cycle expansions when the discount rate is falling."),
    holding("VEA", "VEA", 4248, "Vanguard FTSE Developed Markets ETF", 20,
      "Developed international",
      "Europe + Japan + UK at a meaningful valuation discount to the US. Diversifies away from US-only risk while staying in developed markets."),
    holding("VWO", "VWO", 4252, "Vanguard FTSE Emerging Markets ETF", 15,
      "Emerging markets",
      "EM tends to lead developed coming out of resets. Volatile, but the asymmetry favours owning some when valuations are reasonable."),
  ],
};

// =====================================================================
// US — Watch (mid cycle): quality + dividend tilt
// =====================================================================
const US_WATCH: Basket = {
  zone: "watch",
  region: "us",
  title: "Quality and dividend growth",
  thesis:
    "Mid-cycle is for owning what compounds reliably. Tilt away from the most expensive growth toward dividend-growers and quality, while keeping core market exposure.",
  holdings: [
    holding("VTI", "VTI", 4237, "Vanguard Total Stock Market ETF", 30,
      "Core US equity",
      "Keep a base in the broad market — mid-cycle still rewards beta, just less than early cycle."),
    holding("SCHD", "SCHD", 3217, "Schwab US Dividend Equity ETF", 30,
      "High-quality dividend yield",
      "100 high-yielding US stocks screened on financial strength and dividend consistency. The best low-cost dividend ETF on eToro."),
    holding("DGRO", "DGRO", 3149, "iShares Core Dividend Growth ETF", 25,
      "Dividend growers",
      "Stocks raising dividends for 5+ years — biased toward staples, healthcare and industrials. Outperforms the market in the late part of the mid-cycle."),
    holding("VEA", "VEA", 4248, "Vanguard FTSE Developed Markets ETF", 15,
      "International ballast",
      "Cheaper developed-market exposure provides ballast as US valuations stretch."),
  ],
};

// =====================================================================
// US — Warning (late cycle): defensive sectors + bonds
// =====================================================================
const US_WARNING: Basket = {
  zone: "warning",
  region: "us",
  title: "Defensive lean — utilities, staples, healthcare + duration",
  thesis:
    "Late cycle is for compressing risk without abandoning equities. Rotate from cyclicals to defensive sectors (XLU/XLP/XLV) and add duration via long Treasuries. Gold as a structural hedge.",
  holdings: [
    holding("XLU", "XLU", 3013, "Utilities Select Sector SPDR", 20,
      "Bond-proxy sector",
      "Regulated utilities — boring, dividend-heavy, low beta. The textbook late-cycle tilt."),
    holding("XLP", "XLP", 3022, "Consumer Staples Select Sector SPDR", 20,
      "Defensive consumer",
      "Procter, Coca-Cola, Walmart. People keep buying necessities through downturns. Outperforms in -10%+ S&P drawdowns."),
    holding("XLV", "XLV", 3017, "Health Care Select Sector SPDR", 15,
      "Defensive growth",
      "Healthcare combines defensive cash flows with secular growth. Pharma + insurers + devices — a diversified slice."),
    holding("TLT", "TLT", 3020, "iShares 20+ Year Treasury Bond ETF", 25,
      "Long duration",
      "When the cycle turns, the Fed cuts and long bonds rally hardest. The hedge that moves first."),
    holding("GLD", "GLD", 3025, "SPDR Gold Shares", 20,
      "Real-asset hedge",
      "Gold doesn't pay a coupon but it doesn't default either. Hedges both inflation and policy-uncertainty risk."),
  ],
};

// =====================================================================
// US — Storm (reset): capital preservation
// =====================================================================
const US_STORM: Basket = {
  zone: "storm",
  region: "us",
  title: "Capital preservation — cash, gold and short bonds",
  thesis:
    "When valuations have already broken and sentiment is capitulating, you want to be liquid. Treasury bills, short Treasuries and a meaningful gold sleeve. Wait for the dust to settle before redeploying.",
  holdings: [
    holding("BIL", "BIL", 4407, "SPDR Bloomberg 1-3 Month T-Bill ETF", 35,
      "Cash-equivalent",
      "1-3 month T-bills — the best risk-free yield on eToro. Optionality to redeploy when the cycle resets."),
    holding("SHV", "SHV", 4321, "iShares 0-1 Year Treasury Bond ETF", 25,
      "Short Treasuries",
      "Slightly more duration than BIL, slightly more yield. Still effectively cash."),
    holding("GLD", "GLD", 3025, "SPDR Gold Shares", 25,
      "Hedge against currency debasement",
      "When central banks panic, gold typically benefits. Earnings risk is now a concern; gold has no earnings."),
    holding("TLT", "TLT", 3020, "iShares 20+ Year Treasury Bond ETF", 15,
      "Crisis duration",
      "Long Treasuries rally hardest when the Fed cuts in earnest. A small allocation captures upside without bond-volatility risk."),
  ],
};

// =====================================================================
// EU — Clear: broad EU equity overweight
// =====================================================================
const EU_CLEAR: Basket = {
  zone: "clear",
  region: "eu",
  title: "Lean in — STOXX 600 + DAX",
  thesis:
    "Early cycle Europe means tilting to broad indices and cyclicals. Add German cyclical exposure and EM for the rebound.",
  holdings: [
    holding("MEUS.L", "MEUS.L", 13548, "Amundi Core Stoxx Europe 600 UCITS ETF", 40,
      "Broad European equity",
      "STOXX 600 — the canonical Europe benchmark. 600 large- and mid-caps across 17 countries. Amundi's LSE-listed version trades as cash equity (no CFD)."),
    holding("CG1.PA", "CG1.PA", 15301, "Amundi DAX UCITS ETF DR", 30,
      "German cyclicals",
      "DAX is heavy in autos, industrials and chemicals — the levered cyclical bet on a European expansion. Amundi's Paris-listed version is a real cash-equity ETF."),
    holding("VWCG.L", "VWCG.L", 13558, "Vanguard FTSE Developed Europe UCITS ETF", 15,
      "Developed Europe diversifier",
      "Vanguard's developed-Europe exposure on LSE — adds country diversification beyond the German cyclical tilt."),
    holding("EIMI.L", "EIMI.L", 15435, "iShares Core MSCI EM IMI UCITS ETF", 15,
      "Emerging markets",
      "EM has historically led developed markets out of resets. LSE-listed cash equity."),
  ],
};

// =====================================================================
// EU — Watch: quality + dividend
// =====================================================================
const EU_WATCH: Basket = {
  zone: "watch",
  region: "eu",
  title: "Quality and dividend growth — Europe",
  thesis:
    "Mid-cycle Europe rewards core compounders and dividend yields. Keep a STOXX 600 base, add a Eurozone dividend tilt and a global bond hedge.",
  holdings: [
    holding("MEUS.L", "MEUS.L", 13548, "Amundi Core Stoxx Europe 600 UCITS ETF", 40,
      "Broad European equity core",
      "STOXX 600 broad core — 600 large- and mid-caps across 17 countries. Amundi's LSE-listed version trades as cash equity."),
    holding("IDVY.L", "IDVY.L", 15443, "iShares Euro Dividend UCITS ETF EUR Dist", 25,
      "Eurozone high-dividend",
      "30 highest-yielding Eurozone stocks — defensive sector tilt by construction (financials, utilities, staples)."),
    holding("VWCG.L", "VWCG.L", 13558, "Vanguard FTSE Developed Europe UCITS ETF", 20,
      "Developed Europe diversifier",
      "Vanguard's developed-Europe exposure on LSE — diversifies the Eurozone-only IDVY tilt."),
    holding("AGGU.L", "AGGU.L", 13553, "iShares Core Global Aggregate Bond UCITS ETF (USD)", 15,
      "Global bond ballast",
      "Global aggregate bonds — investment-grade, multi-region. Reduces equity volatility without taking duration risk."),
  ],
};

// =====================================================================
// EU — Warning: defensive sectors + bonds
// =====================================================================
const EU_WARNING: Basket = {
  zone: "warning",
  region: "eu",
  title: "Defensive sectors — Europe",
  thesis:
    "Late cycle in Europe rotates to staples, healthcare and utilities. Add long Treasuries and gold as the safe-haven complex.",
  holdings: [
    holding("UTI.PA", "UTI.PA", 15320, "Amundi STOXX Europe 600 Utilities UCITS ETF Acc", 25,
      "European utilities",
      "Bond-proxy regulated utilities across Europe. Low beta, high dividend. Paris-listed cash equity."),
    holding("FOO.PA", "FOO.PA", 15316, "Amundi STOXX Europe 600 Consumer Staples UCITS ETF Acc", 25,
      "Defensive consumer",
      "Nestle, L'Oreal, Unilever, AB InBev — defensive cash flows that hold up through downturns. Paris-listed cash equity."),
    holding("HLT.PA", "HLT.PA", 15312, "Amundi STOXX Europe 600 Healthcare UCITS ETF Acc", 20,
      "European healthcare",
      "Novo, Roche, Novartis, AstraZeneca — defensive growth, secular tailwinds. Paris-listed cash equity."),
    holding("DTLA.L", "DTLA.L", 13564, "iShares USD Treasury Bond 20+yr UCITS ETF", 15,
      "USD long Treasuries",
      "Long US Treasuries on LSE — the deepest safe-haven duration market. Captures the rate-cut rally directly."),
    holding("IGLN.L", "IGLN.L", 15440, "iShares Physical Gold ETC", 15,
      "Real-asset hedge",
      "Physical gold — hedge against policy uncertainty and currency debasement."),
  ],
};

// =====================================================================
// EU — Storm: capital preservation
// =====================================================================
const EU_STORM: Basket = {
  zone: "storm",
  region: "eu",
  title: "Capital preservation",
  thesis:
    "Reset mode: short USD Treasuries, gold and global aggregate bonds. EUR-denominated UCITS ultrashorts are only available on Xetra (CFD-only on most eToro accounts), so this basket uses USD/GBP cash equivalents instead.",
  holdings: [
    holding("IB01.L", "IB01.L", 1442, "iShares $ Treasury Bond 0-1yr UCITS ETF", 40,
      "USD cash-equivalent",
      "0-1yr USD T-bills (UCITS, LSE-listed) — the deepest cash-equivalent market in the world."),
    holding("IGLN.L", "IGLN.L", 15440, "iShares Physical Gold ETC", 30,
      "Currency-debasement hedge",
      "Gold is the universal panic hedge. Particularly useful when the ECB is being forced to ease."),
    holding("AGGU.L", "AGGU.L", 13553, "iShares Core Global Aggregate Bond UCITS ETF (USD)", 20,
      "Diversified high-grade bonds",
      "Investment-grade global bonds across multiple currencies. Captures duration rally."),
    holding("ERNS.L", "ERNS.L", 14495, "iShares GBP Ultrashort Bond UCITS ETF", 10,
      "GBP currency diversifier",
      "Sterling ultrashort bonds — diversifies USD-only exposure with another G7 hard currency."),
  ],
};

// =====================================================================
// UK — Clear: broad UK equity
// =====================================================================
const UK_CLEAR: Basket = {
  zone: "clear",
  region: "uk",
  title: "Lean in — FTSE 100 + 250",
  thesis:
    "Early cycle in the UK means broad large-cap + a meaningful 250 sleeve (mid-caps lead) plus a global growth hedge.",
  holdings: [
    holding("ISF.L", "ISF.L", 3052, "iShares Core FTSE 100 UCITS ETF (Dist)", 35,
      "Broad UK large-cap",
      "FTSE 100 — heavy in energy, miners, banks, pharma. A value tilt by construction."),
    holding("MIDD.L", "MIDD.L", 6466, "iShares FTSE 250 UCITS ETF", 25,
      "UK mid-caps",
      "FTSE 250 — more domestic, more cyclical, more growth than the FTSE 100. The classic recovery trade."),
    holding("VWRP.L", "VWRP.L", 14462, "Vanguard FTSE All-World UCITS ETF (USD Dis)", 25,
      "Global hedge",
      "All-world exposure — counterweights the UK domestic-economy bet with global growth."),
    holding("CNDX.L", "CNDX.L", 8015, "iShares NASDAQ 100 UCITS ETF", 15,
      "Growth tilt",
      "Nasdaq-100 (UCITS, GBP-traded). Gives the basket some megacap-tech beta when rates are falling."),
  ],
};

// =====================================================================
// UK — Watch: quality + dividend
// =====================================================================
const UK_WATCH: Basket = {
  zone: "watch",
  region: "uk",
  title: "Quality and yield — UK",
  thesis:
    "Mid-cycle UK leans into the FTSE 100's yield character — already defensive vs the global mid-cycle. Add Eurozone dividend, global core and a global bond sleeve. (UK Gilt UCITS only exists on Xetra — replaced with global aggregate bonds.)",
  holdings: [
    holding("ISF.L", "ISF.L", 3052, "iShares Core FTSE 100 UCITS ETF (Dist)", 35,
      "Core UK yield",
      "FTSE 100 already yields ~3.9% — the natural UK mid-cycle position."),
    holding("IDVY.L", "IDVY.L", 15443, "iShares Euro Dividend UCITS ETF EUR Dist", 25,
      "Eurozone high-dividend",
      "30 highest-yielding Eurozone stocks — diversifies the UK-only dividend bet across the channel."),
    holding("VWRP.L", "VWRP.L", 14462, "Vanguard FTSE All-World UCITS ETF (USD Dis)", 25,
      "Broad global core",
      "Global beta — necessary because the FTSE alone is too narrow."),
    holding("AGGU.L", "AGGU.L", 13553, "iShares Core Global Aggregate Bond UCITS ETF (USD)", 15,
      "Global bond ballast",
      "Investment-grade global bonds — smooths the equity ride. Substitute for UK gilts (which aren't available as cash-equity UCITS)."),
  ],
};

// =====================================================================
// UK — Warning: defensive sectors + bonds
// =====================================================================
const UK_WARNING: Basket = {
  zone: "warning",
  region: "uk",
  title: "Defensive lean — UK",
  thesis:
    "Late cycle: UK staples + global defensive sectors + Treasury duration + gold. Tilt the basket toward survival-of-the-cycle, not capture-of-it.",
  holdings: [
    holding("ISF.L", "ISF.L", 3052, "iShares Core FTSE 100 UCITS ETF (Dist)", 20,
      "FTSE 100 (defensive bent)",
      "FTSE 100 is structurally defensive — staples, energy, pharma weights are higher than other developed indices."),
    holding("FOO.PA", "FOO.PA", 15316, "Amundi STOXX Europe 600 Consumer Staples UCITS ETF Acc", 15,
      "Defensive consumer",
      "Pan-European staples — Unilever, Diageo, Reckitt also live here. Paris-listed cash equity."),
    holding("HLT.PA", "HLT.PA", 15312, "Amundi STOXX Europe 600 Healthcare UCITS ETF Acc", 15,
      "Healthcare",
      "Pan-European healthcare — AstraZeneca, GSK alongside Roche/Novartis. Paris-listed cash equity."),
    holding("DTLA.L", "DTLA.L", 13564, "iShares USD Treasury Bond 20+yr UCITS ETF", 25,
      "USD long Treasuries",
      "Long US Treasuries are the global safe-haven. Captures the cycle-reset rally directly."),
    holding("IGLN.L", "IGLN.L", 15440, "iShares Physical Gold ETC", 25,
      "Real-asset hedge",
      "Gold — the structural hedge against any one country's policy mistakes."),
  ],
};

// =====================================================================
// UK — Storm: capital preservation (GBP)
// =====================================================================
const UK_STORM: Basket = {
  zone: "storm",
  region: "uk",
  title: "Capital preservation — GBP",
  thesis:
    "Reset mode in GBP: ultrashort GBP bonds, short USD Treasuries, gold. Liquidity over yield.",
  holdings: [
    holding("ERNS.L", "ERNS.L", 14495, "iShares GBP Ultrashort Bond UCITS ETF", 35,
      "GBP cash-equivalent",
      "Sterling ultrashort bonds — the closest thing to a money-market fund on eToro for GBP investors."),
    holding("IB01.L", "IB01.L", 1442, "iShares $ Treasury Bond 0-1yr UCITS ETF", 25,
      "Short USD Treasuries",
      "0-1yr USD T-bills (UCITS). Adds USD exposure as a haven."),
    holding("IGLN.L", "IGLN.L", 15440, "iShares Physical Gold ETC", 25,
      "Currency-debasement hedge",
      "Physical gold — sterling investors particularly need this in policy-stress episodes."),
    holding("DTLA.L", "DTLA.L", 13564, "iShares USD Treasury Bond 20+yr UCITS ETF", 15,
      "Crisis duration",
      "Long US Treasuries — the deepest safe-haven market in the world."),
  ],
};

// =====================================================================
// Global — Clear: broad global equity
// =====================================================================
const GLOBAL_CLEAR: Basket = {
  zone: "clear",
  region: "global",
  title: "Lean in — global all-world",
  thesis:
    "Global early-cycle is straightforward: own the world. All-world core, an EM sleeve for the rebound, and a sliver of growth via Nasdaq.",
  holdings: [
    holding("VWRP.L", "VWRP.L", 14462, "Vanguard FTSE All-World UCITS ETF (USD Dis)", 55,
      "Global core",
      "All-world — 4,000+ stocks across developed + EM. The cleanest single-trade global exposure."),
    holding("CNDX.L", "CNDX.L", 8015, "iShares NASDAQ 100 UCITS ETF", 25,
      "Growth tilt",
      "Megacap tech beta — participates in early-cycle rallies more than the broader market."),
    holding("EIMI.L", "EIMI.L", 15435, "iShares Core MSCI EM IMI UCITS ETF", 20,
      "Emerging markets",
      "EM tends to lead developed coming out of resets. A meaningful sleeve for the recovery trade."),
  ],
};

// =====================================================================
// Global — Watch: quality + dividend (global)
// =====================================================================
const GLOBAL_WATCH: Basket = {
  zone: "watch",
  region: "global",
  title: "Global quality and yield",
  thesis:
    "Mid-cycle global means owning compounders and dividends, with a bond sleeve for ballast. Two best-of-breed US dividend ETFs stand in for the global high-yield wrapper, which is only available on Xetra.",
  holdings: [
    holding("VWRP.L", "VWRP.L", 14462, "Vanguard FTSE All-World UCITS ETF (USD Dis)", 40,
      "Global core",
      "Keep a base in the broad global market."),
    holding("DGRO", "DGRO", 3149, "iShares Core Dividend Growth ETF", 25,
      "US dividend growers",
      "US-listed dividend growers — best-in-class quality screen."),
    holding("SCHD", "SCHD", 3217, "Schwab US Dividend Equity ETF", 20,
      "US high-dividend",
      "100 high-yielding US stocks screened on financial strength and dividend consistency. Substitutes for the global high-yield exposure that's only available as a Xetra-listed UCITS."),
    holding("AGGU.L", "AGGU.L", 13553, "iShares Core Global Aggregate Bond UCITS ETF (USD)", 15,
      "Global bond ballast",
      "Global aggregate bonds — investment-grade, multi-region, USD-hedged."),
  ],
};

// =====================================================================
// Global — Warning: defensive global + bonds
// =====================================================================
const GLOBAL_WARNING: Basket = {
  zone: "warning",
  region: "global",
  title: "Global defensive lean",
  thesis:
    "Late-cycle global mixes US defensives with European staples, layered with long Treasuries and gold.",
  holdings: [
    holding("XLU", "XLU", 3013, "Utilities Select Sector SPDR", 15,
      "US utilities",
      "Bond-proxy US utilities — the textbook late-cycle position."),
    holding("XLP", "XLP", 3022, "Consumer Staples Select Sector SPDR", 15,
      "US staples",
      "US consumer staples — defensive, dividend-heavy."),
    holding("FOO.PA", "FOO.PA", 15316, "Amundi STOXX Europe 600 Consumer Staples UCITS ETF Acc", 10,
      "European staples",
      "European staples diversify away from US-only exposure."),
    holding("DTLA.L", "DTLA.L", 13564, "iShares USD Treasury Bond 20+yr UCITS ETF", 25,
      "Long Treasuries",
      "20+ year US Treasuries — the deepest safe-haven duration market."),
    holding("AGGU.L", "AGGU.L", 13553, "iShares Core Global Aggregate Bond UCITS ETF (USD)", 15,
      "Global bonds",
      "Investment-grade global aggregate — diversified bond ballast."),
    holding("IGLN.L", "IGLN.L", 15440, "iShares Physical Gold ETC", 20,
      "Real-asset hedge",
      "Gold — the universal hedge against policy and currency risk."),
  ],
};

// =====================================================================
// Global — Storm: capital preservation (global)
// =====================================================================
const GLOBAL_STORM: Basket = {
  zone: "storm",
  region: "global",
  title: "Global capital preservation",
  thesis:
    "Reset mode globally: short USD Treasuries, gold, GBP ultrashort for currency diversification, and a long-duration Treasury sleeve. (EUR ultrashort UCITS only exists on Xetra — replaced with extra USD short exposure.)",
  holdings: [
    holding("IB01.L", "IB01.L", 1442, "iShares $ Treasury Bond 0-1yr UCITS ETF", 40,
      "Short USD Treasuries",
      "0-1yr USD T-bills (UCITS, LSE-listed) — the deepest cash-equivalent market in the world."),
    holding("ERNS.L", "ERNS.L", 14495, "iShares GBP Ultrashort Bond UCITS ETF", 20,
      "GBP ultrashort",
      "GBP cash-equivalent — sterling sleeve for currency diversification."),
    holding("IGLN.L", "IGLN.L", 15440, "iShares Physical Gold ETC", 25,
      "Currency-debasement hedge",
      "Physical gold — universal panic hedge."),
    holding("DTLA.L", "DTLA.L", 13564, "iShares USD Treasury Bond 20+yr UCITS ETF", 15,
      "Crisis duration",
      "Long Treasuries — captures rate-cut rally if reset is deflationary."),
  ],
};

// =====================================================================
// BASKETS map + helpers
// =====================================================================

export const BASKETS: Record<RegionId, Record<Zone, Basket>> = {
  us:     { clear: US_CLEAR,     watch: US_WATCH,     warning: US_WARNING,     storm: US_STORM },
  eu:     { clear: EU_CLEAR,     watch: EU_WATCH,     warning: EU_WARNING,     storm: EU_STORM },
  uk:     { clear: UK_CLEAR,     watch: UK_WATCH,     warning: UK_WARNING,     storm: UK_STORM },
  global: { clear: GLOBAL_CLEAR, watch: GLOBAL_WATCH, warning: GLOBAL_WARNING, storm: GLOBAL_STORM },
};

export function basketFor(zone: Zone, region: RegionId = "us"): Basket {
  return BASKETS[region][zone];
}

export function allHoldings(): BasketHolding[] {
  const out: BasketHolding[] = [];
  for (const region of Object.keys(BASKETS) as RegionId[]) {
    for (const zone of Object.keys(BASKETS[region]) as Zone[]) {
      out.push(...BASKETS[region][zone].holdings);
    }
  }
  return out;
}

export function allocate(basket: Basket, amount: number) {
  return basket.holdings.map((h) => ({
    ...h,
    dollars: Math.round((h.weight / 100) * amount * 100) / 100,
  }));
}
