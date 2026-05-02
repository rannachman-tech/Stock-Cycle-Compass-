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

      {/* 55/45 hero */}
      <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4 lg:gap-6 items-stretch">
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5 flex flex-col items-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
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
          {pro && <ProDetails snap={snap} region={region} />}
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
      <section className="mt-6 sm:mt-8 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
              History — CAPE since 1900
            </h2>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              Each loop is roughly one full cycle. Hover to inspect a year.
            </p>
          </div>
          <p className="font-mono text-[10.5px] text-fg-subtle uppercase tracking-[0.14em]">
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
