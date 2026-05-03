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
    <div className="rounded-xl border border-border/80 bg-surface-elev p-5">
      <div className="flex items-center gap-1.5">
        <Wallet className="w-3 h-3 text-accent" />
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          {c.kicker}
        </div>
      </div>
      <div className="mt-3 text-[15px] font-medium text-fg leading-snug tracking-tightish">
        {c.title}
      </div>
      <p className="mt-2 text-[12.5px] text-fg-muted leading-relaxed">{c.sub}</p>

      {isReal && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-zone-storm/30 bg-zone-storm/5 px-2.5 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-zone-storm shrink-0 mt-0.5" />
          <div className="text-[11.5px] leading-snug text-fg">
            <span className="font-medium text-zone-storm">Real money mode.</span>{" "}
            Trades will use actual funds in your eToro account.
          </div>
        </div>
      )}

      <button
        onClick={connected ? onTradeClick : onConnectClick}
        className="group mt-4 inline-flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-[13px] font-medium text-accent-fg transition-all duration-200 hover:translate-y-[-1px] active:translate-y-0"
        style={{
          background: "linear-gradient(180deg, rgb(var(--accent)), rgb(var(--accent) / 0.92))",
          boxShadow: "0 1px 0 rgb(255 255 255 / 0.12) inset, 0 1px 2px rgb(var(--accent) / 0.25), 0 4px 12px rgb(var(--accent) / 0.18)",
        }}
      >
        <span>{connected ? c.cta : "Connect eToro to trade"}</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </button>
      <p className="mt-2.5 text-[10.5px] text-fg-subtle/85 leading-snug">
        Funds must be available in your eToro account for orders to fill. Not financial advice.
      </p>
    </div>
  );
}
