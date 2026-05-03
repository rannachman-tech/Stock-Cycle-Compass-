"use client";

import { useMemo, useState } from "react";
import type { CompassData, RegionId } from "@/lib/types";
import { basketFor } from "@/lib/baskets";
import RegionTabs from "./RegionTabs";
import LiveSourcesRow from "./LiveSourcesRow";
import CycleWheel from "./CycleWheel";
import PositionLadder from "./PositionLadder";
import InsightsCard from "./InsightsCard";
import ConnectEtoroCta from "./ConnectEtoroCta";
import ValuationLensTiles from "./ValuationLensTiles";
import CapeSpiral from "./CapeSpiral";
import TradeBasketModal from "./TradeBasketModal";
import ProDetails from "./ProDetails";

interface Props {
  data: CompassData;
  pro: boolean;
  onConnectClick: () => void;
}

export default function RegionView({ data, pro, onConnectClick }: Props) {
  const [region, setRegion] = useState<RegionId>("us");
  const [tradeOpen, setTradeOpen] = useState(false);

  const snap = data.regions[region];
  const basket = useMemo(() => basketFor(snap.zone, region), [snap.zone, region]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <RegionTabs active={region} onChange={setRegion} />
        <LiveSourcesRow generatedAt={snap.generatedAt} />
      </div>

      {/* 55/45 hero — left column reserves vertical space for the Pro panel
          so toggling Pro/Plain doesn't ripple-resize the right column. */}
      <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4 lg:gap-6 items-stretch">
        <div className="rounded-xl border border-border/80 bg-surface p-5 sm:p-6 flex flex-col items-center lg:min-h-[640px]">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-subtle/80">
            {snap.regionLabel}
          </div>
          <div className="mt-2 sm:mt-3 w-full max-w-[440px]">
            <CycleWheel
              percentile={snap.percentile}
              degrees={snap.wheelDegrees}
              zone={snap.zone}
              tag={snap.percentile >= 80 ? "Historically rich" : snap.percentile <= 30 ? "Cheap vs history" : "Stretched"}
            />
          </div>
          <PositionLadder zone={snap.zone} />
          {/* ProDetails fades in/out instead of mounting/unmounting — avoids
              the right column resizing every Pro/Plain toggle. */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out w-full max-w-[440px] ${
              pro ? "max-h-[600px] opacity-100 mt-0" : "max-h-0 opacity-0 mt-0 pointer-events-none"
            }`}
            aria-hidden={!pro}
          >
            <ProDetails snap={snap} region={region} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <InsightsCard insights={snap.insights} className="flex-1" />
          <ConnectEtoroCta
            zone={snap.zone}
            onTradeClick={() => setTradeOpen(true)}
            onConnectClick={onConnectClick}
          />
        </div>
      </section>

      <ValuationLensTiles indicators={snap.indicators} pro={pro} />

      {/* CAPE spiral */}
      <section className="mt-6 sm:mt-8 rounded-xl border border-border/80 bg-surface p-5 sm:p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-subtle/80">
              History — CAPE since 1900
            </h2>
            <p className="mt-1.5 text-[12.5px] text-fg-muted">
              Each loop is roughly one full cycle. Hover to inspect a year.
            </p>
          </div>
          <p className="font-mono text-[10px] text-fg-subtle/70 uppercase tracking-[0.18em]">
            Source: Shiller / Yale
          </p>
        </div>
        <div className="mt-3">
          <CapeSpiral history={data.capeHistory} />
        </div>
      </section>

      <TradeBasketModal
        open={tradeOpen}
        basket={tradeOpen ? basket : null}
        onClose={() => setTradeOpen(false)}
      />
    </div>
  );
}
