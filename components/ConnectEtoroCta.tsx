"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Wallet } from "lucide-react";
import type { Zone } from "@/lib/types";
import { getSession, ETORO_CHANGE_EVENT, type EtoroSession } from "@/lib/etoro-session";

interface Props {
  zone: Zone;
  onTradeClick: () => void;
  onConnectClick: () => void;
}

const COPY: Record<Zone, { kicker: string; title: string; sub: string; cta: string }> = {
  clear: {
    kicker: "Early cycle",
    title: "Lean in — broad equity overweight",
    sub: "Open the basket: total US, dev international, EM. One click on eToro.",
    cta: "Trade the early-cycle basket",
  },
  watch: {
    kicker: "Mid cycle",
    title: "Quality and dividend growth",
    sub: "Tilt to quality compounders and dividend growers. Stay invested, get pickier.",
    cta: "Trade the mid-cycle basket",
  },
  warning: {
    kicker: "Late cycle",
    title: "Defensive lean — utilities, staples, healthcare + duration",
    sub: "Compress risk without abandoning equities. Add long Treasuries and a gold sleeve.",
    cta: "Trade the late-cycle basket",
  },
  storm: {
    kicker: "Reset",
    title: "Capital preservation — cash, gold, short Treasuries",
    sub: "Wait for the dust to settle. Liquidity over yield until valuations reset.",
    cta: "Trade the capital-preservation basket",
  },
};

export default function ConnectEtoroCta({ zone, onTradeClick, onConnectClick }: Props) {
  const c = COPY[zone];
  const [session, setSession] = useState<EtoroSession | null>(null);

  useEffect(() => {
    setSession(getSession());
    const sync = () => setSession(getSession());
    window.addEventListener(ETORO_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ETORO_CHANGE_EVENT, sync);
  }, []);

  const connected = !!session;
  const isReal = session?.env === "real";

  return (
    <div className="rounded-lg border border-border bg-surface-elev p-5">
      <div className="flex items-center gap-2">
        <Wallet className="w-3.5 h-3.5 text-accent" />
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          {c.kicker}
        </div>
      </div>
      <div className="mt-2.5 text-[15.5px] font-medium text-fg leading-snug tracking-tightish">
        {c.title}
      </div>
      <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">{c.sub}</p>

      {isReal && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-zone-storm/40 bg-zone-storm/10 px-2.5 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-zone-storm shrink-0 mt-0.5" />
          <div className="text-[11.5px] leading-snug text-fg">
            <span className="font-medium text-zone-storm">Real money mode.</span>{" "}
            Trades will use actual funds in your eToro account.
          </div>
        </div>
      )}

      <button
        onClick={connected ? onTradeClick : onConnectClick}
        className="mt-4 inline-flex w-full items-center justify-between rounded-md bg-accent text-accent-fg px-3.5 py-2.5 text-[13px] font-medium hover:opacity-90 transition-opacity"
      >
        <span>{connected ? c.cta : "Connect eToro to trade"}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
      <p className="mt-2 text-[10.5px] text-fg-subtle leading-snug">
        Funds must be available in your eToro account for orders to fill. Not financial advice.
      </p>
    </div>
  );
}
