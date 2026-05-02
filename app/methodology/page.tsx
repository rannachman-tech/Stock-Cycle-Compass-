import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Methodology — Stock Cycle Compass" };

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to compass
      </Link>

      <h1 className="mt-6 text-[28px] font-medium tracking-tightish text-fg">Methodology</h1>
      <p className="mt-2 text-[14.5px] text-fg-muted leading-relaxed">
        Stock Cycle Compass blends a small set of well-established equity-market indicators into a single
        composite percentile, then maps that percentile onto a four-zone cycle wheel. Every input is
        publicly sourced; every formula is below.
      </p>

      <Section title="What does percentile mean?">
        <p>
          For each indicator we compute its long-run distribution — typically going back to 1900 (CAPE),
          1950 (Buffett ratio), or whatever earliest history we have. The current value's <em>percentile</em>{" "}
          is the share of historical observations that were lower.
        </p>
        <p>
          A percentile of 87 doesn't mean the market is going down. It means that on 87% of historical days,
          this metric was lower than today — and on the other 13%, the same readings were eventually
          followed by a wide range of outcomes, including new highs in the short term.
        </p>
      </Section>

      <Section title="Composite score">
        <p>
          The composite valuation percentile per region is an{" "}
          <span className="font-mono text-[12.5px]">equal-weighted average</span> of the percentiles of:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Buffett ratio (total market cap / GDP)</li>
          <li>Shiller CAPE</li>
          <li>Forward P/E</li>
          <li>Equity-risk premium (inverted — high ERP = cheap)</li>
          <li>200-day breadth (inverted — high breadth = healthy)</li>
          <li>AAII bull–bear spread (sentiment)</li>
          <li>VIX 1-year percentile (inverted — high vol = stress)</li>
        </ul>
        <p>
          The wheel hand parks within the active quadrant (Clear, Watch, Warning, Storm). Quadrant
          boundaries: ≤30, 30–60, 60–80, ≥80.
        </p>
      </Section>

      <Section title="Buffett ratio">
        <Formula>
          Buffett ratio = (Wilshire 5000 total market value) / (US GDP, nominal) × 100
        </Formula>
        <p>
          Long-run mean ≈ 86%. Above ~150% has historically marked extended periods of low forward
          returns. Source: FRED + Wilshire.
        </p>
      </Section>

      <Section title="Shiller CAPE">
        <Formula>
          CAPE = Real S&P 500 price / 10-year average of real S&P 500 earnings
        </Formula>
        <p>
          Originally proposed by Robert Shiller. Smoothing earnings over a decade strips out cyclical
          noise. Long-run median ≈ 16. Useful for 10-year forecasts; weak as a near-term timing tool.
        </p>
      </Section>

      <Section title="Forward P/E">
        <Formula>
          Forward P/E = S&P 500 price / IBES consensus EPS (next 12m)
        </Formula>
        <p>
          A market-aware reset of CAPE — analyst forecasts already reflect the current cycle. Tends to
          look more reasonable than CAPE during expansions, harsher during downturns.
        </p>
      </Section>

      <Section title="Equity risk premium">
        <Formula>ERP ≈ (Earnings yield, S&P 500) − (10-year Treasury yield)</Formula>
        <p>
          Damodaran-style proxy. The reward you're paid for holding stocks instead of risk-free
          government debt. Long-run mean ≈ 4.2%. Below 1% is rare and historically punishing.
        </p>
      </Section>

      <Section title="Breadth">
        <p>
          Share of S&P 500 (or local index) constituents trading above their 200-day moving average.
          Late-cycle markets often see this fall while the index keeps rising — a textbook narrowing.
        </p>
      </Section>

      <Section title="Sentiment">
        <Formula>AAII spread = % bullish − % bearish (4-week smoothed)</Formula>
        <p>
          Surveys retail investor sentiment. Extreme readings on either side tend to be contrary
          indicators — though the speed of mean-reversion is unreliable.
        </p>
      </Section>

      <Section title="VIX percentile">
        <p>
          Where the current VIX sits within the trailing 12 months. We use the inverted form: a low VIX
          with stretched valuations is more concerning than a high VIX after a drawdown.
        </p>
      </Section>

      <Section title="Implied fair value">
        <Formula>Fair = Price × (CAPE long-run median / current CAPE)</Formula>
        <p>
          Naive but useful. We surface this only in Pro mode because mean-reversion to CAPE median over
          short horizons is statistically weak — the level should be read as a marker, not a target.
        </p>
      </Section>

      <Section title="Staleness guard">
        <p>
          Any indicator whose latest reading is older than 240 days is automatically flagged{" "}
          <span className="font-mono uppercase text-[10.5px] text-zone-warning">Stale</span> and given a
          neutral percentile (50). This prevents abandoned data series from silently distorting the
          composite — a real risk when sources change publication schedules.
        </p>
      </Section>

      <Section title="Refresh schedule">
        <p>
          A scheduled job runs every 24h, pulls fresh data from FRED, the Shiller CSV, AAII and a Yahoo
          Finance unofficial mirror, recomputes percentiles, and commits a static JSON file to the
          repository. There is no live API in front of the page — refreshing reads from the static blob.
        </p>
      </Section>

      <Section title="What this is not">
        <p>
          This is not a model that predicts the next move. It is a current-state read on where the cycle
          is, drawn from indicators that have historically clustered around expansions and resets. Use it
          to inform the question "how should I be positioned?", not "is the top in?"
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-[18px] font-medium text-fg tracking-tightish">{title}</h2>
      <div className="mt-2 space-y-3 text-[14px] text-fg-muted leading-relaxed">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-soft px-3 py-2 font-mono text-[12.5px] text-fg">
      {children}
    </div>
  );
}
