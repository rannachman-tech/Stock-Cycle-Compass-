"use client";

import type { Zone } from "@/lib/types";
import { ZONE_LABEL } from "@/lib/types";

interface Props {
  zone: Zone;
}

const STEPS: Zone[] = ["clear", "watch", "warning", "storm"];

const COLOR: Record<Zone, string> = {
  clear:   "rgb(var(--zone-clear))",
  watch:   "rgb(var(--zone-watch))",
  warning: "rgb(var(--zone-warning))",
  storm:   "rgb(var(--zone-storm))",
};

const LABEL_LONG: Record<Zone, string> = {
  clear:   "Early — recovery",
  watch:   "Mid — expansion",
  warning: "Late — peak",
  storm:   "Reset — drawdown",
};

export default function PositionLadder({ zone }: Props) {
  const activeIdx = STEPS.indexOf(zone);
  return (
    <div className="mt-4 w-full max-w-[420px] mx-auto">
      <div className="grid grid-cols-4 gap-1.5">
        {STEPS.map((s, i) => {
          const active = i === activeIdx;
          const passed = i < activeIdx;
          return (
            <div key={s} className="flex flex-col items-center gap-1.5">
              <div
                className="w-full h-1.5 rounded-full"
                style={{
                  background: active
                    ? COLOR[s]
                    : passed
                    ? `color-mix(in srgb, ${COLOR[s]} 55%, rgb(var(--border)))`
                    : "rgb(var(--border))",
                }}
              />
              <div
                className="font-mono text-[9.5px] uppercase tracking-[0.18em]"
                style={{
                  color: active
                    ? "rgb(var(--fg))"
                    : "rgb(var(--fg-subtle))",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {ZONE_LABEL[s]}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center text-xs text-fg-muted leading-snug">
        <span className="font-medium text-fg">{LABEL_LONG[zone]}</span>
        <span className="mx-1.5 text-fg-subtle">·</span>
        <span>tonight's position on the wheel</span>
      </div>
    </div>
  );
}
