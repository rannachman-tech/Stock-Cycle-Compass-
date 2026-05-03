"use client";

import { AlertTriangle } from "lucide-react";

export default function RiskBanner() {
  return (
    <div className="border-b border-border/60 bg-bg-soft/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2 flex items-start gap-2 text-[11px] leading-snug text-fg-muted">
        <AlertTriangle className="w-3 h-3 mt-0.5 text-zone-watch/80 shrink-0" />
        <p>
          <span className="font-medium text-fg">Not financial advice.</span> Stock Cycle Compass is an
          educational tool. Trading involves risk, including the loss of capital. Past performance is not a
          guarantee of future results. Crypto and CFDs may not be suitable for all investors.
        </p>
      </div>
    </div>
  );
}
