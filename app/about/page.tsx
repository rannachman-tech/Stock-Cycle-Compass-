import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "About — Stock Cycle Compass" };

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to compass
      </Link>

      <h1 className="mt-6 text-[28px] font-medium tracking-tightish text-fg">About</h1>

      <p className="mt-4 text-[15px] text-fg-muted leading-relaxed">
        Stock Cycle Compass answers one question — <em>where are we in the equity cycle?</em> — by
        rolling a small set of well-known valuation, sentiment and breadth indicators into a single
        percentile, and parking a hand on a four-quadrant wheel.
      </p>
      <p className="mt-3 text-[15px] text-fg-muted leading-relaxed">
        It is part of the eToro Compass family — a series of small, single-question dashboards that take
        one piece of macro data, present it beautifully, and let you act on it via the eToro public API.
      </p>

      <h2 className="mt-9 text-[18px] font-medium text-fg tracking-tightish">Connect eToro</h2>
      <p className="mt-2 text-[14px] text-fg-muted leading-relaxed">
        Trades go directly to your eToro account via your manual API keys. Keys live only in your
        browser's local storage — we never see them on a server beyond the initial validation request.
        We auto-detect whether your keys belong to a real or virtual (paper-trading) account.
      </p>

      <h2 className="mt-9 text-[18px] font-medium text-fg tracking-tightish">Honesty notes</h2>
      <ul className="mt-2 list-disc pl-5 space-y-1.5 text-[14px] text-fg-muted leading-relaxed">
        <li>This isn't a prediction. It's a read on the current state.</li>
        <li>The implied fair value is naive — useful as a marker, not a target.</li>
        <li>Late-cycle is where many of the biggest annual returns happen — and where the biggest drawdowns begin.</li>
        <li>Diversification across regions matters more in dispersed cycles like this one.</li>
      </ul>

      <h2 className="mt-9 text-[18px] font-medium text-fg tracking-tightish">Data sources</h2>
      <ul className="mt-2 list-disc pl-5 space-y-1.5 text-[14px] text-fg-muted leading-relaxed">
        <li>FRED (St Louis Fed) — Buffett ratio inputs, VIX, yield curve, fed funds.</li>
        <li>Shiller / Yale — CAPE history (1871-).</li>
        <li>Yahoo Finance unofficial — sector / breadth.</li>
        <li>AAII — weekly investor sentiment survey.</li>
        <li>BoE / ECB / ONS / Eurostat — region-specific macro.</li>
        <li>eToro public instrument catalog — basket constituent verification.</li>
      </ul>

      <p className="mt-9 text-[12.5px] text-fg-subtle leading-relaxed">
        Stock Cycle Compass is provided for educational purposes. It is not investment advice and does
        not take into account any individual's circumstances. Trading involves risk.
      </p>
    </main>
  );
}
