"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Wallet } from "lucide-react";
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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(!!getSession());
    const sync = () => setConnected(!!getSession());
    window.addEventListener(ETORO_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ETORO_CHANGE_EVENT, sync);
  }, []);

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
      <button
        onClick={connected ? onTradeClick : onConnectClick}
        className="mt-4 inline-flex w-full items-center justify-between rounded-md bg-accent text-accent-fg px-3.5 py-2.5 text-[13px] font-medium hover:opacity-90 transition-opacity"
      >
        <span>{connected ? c.cta : "Connect eToro to trade"}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
      <p className="mt-2 text-[10.5px] text-fg-subtle leading-snug">
        Direct from eToro. Make sure you have the required funds available in your account. Not financial advice.
      </p>
    </div>
  );
}
