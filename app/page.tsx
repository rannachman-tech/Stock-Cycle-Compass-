"use client";

import { useEffect, useMemo, useState } from "react";
import data from "@/data/stock-cycle.json";
import { CAPE_HISTORY } from "@/lib/cape-history";
import type { CompassData } from "@/lib/types";
import Header from "@/components/Header";
import RiskBanner from "@/components/RiskBanner";
import RegionView from "@/components/RegionView";
import Footer from "@/components/Footer";
import ConnectEtoroModal from "@/components/ConnectEtoroModal";

export default function Page() {
  const [pro, setPro] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  // Restore Pro toggle preference
  useEffect(() => {
    try {
      setPro(localStorage.getItem("scc:pro") === "1");
    } catch {}
  }, []);
  function setProAndPersist(next: boolean) {
    setPro(next);
    try {
      localStorage.setItem("scc:pro", next ? "1" : "0");
    } catch {}
  }

  // Compose runtime data — base file plus the locally-bundled CAPE history
  const compass = useMemo<CompassData>(() => {
    return {
      ...(data as unknown as CompassData),
      capeHistory: CAPE_HISTORY,
    };
  }, []);

  return (
    <>
      <Header pro={pro} onProToggle={setProAndPersist} onConnectClick={() => setConnectOpen(true)} />
      <RiskBanner />
      <main className="pb-12">
        <RegionView data={compass} pro={pro} onConnectClick={() => setConnectOpen(true)} />
      </main>
      <Footer />
      <ConnectEtoroModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
