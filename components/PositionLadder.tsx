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
  // Marker position is centred over the active segment (12.5%, 37.5%, 62.5%, 87.5%).
  const markerLeft = `${activeIdx * 25 + 12.5}%`;
  const activeColor = COLOR[zone];

  return (
    <div className="mt-5 w-full max-w-[420px] mx-auto">
      {/* Continuous track with all four zone colours blended */}
      <div className="relative h-[5px] rounded-full overflow-hidden bg-bg-soft">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(to right,
              ${COLOR.clear} 0%,
              ${COLOR.clear} 22%,
              ${COLOR.watch} 33%,
              ${COLOR.watch} 47%,
              ${COLOR.warning} 58%,
              ${COLOR.warning} 72%,
              ${COLOR.storm} 83%,
              ${COLOR.storm} 100%)`,
          }}
        />
        {/* Sliding marker — sits on the active segment, slightly raised */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[14px] h-[14px] rounded-full ring-2 ring-bg shadow-sm transition-all duration-500"
          style={{
            left: markerLeft,
            background: activeColor,
            boxShadow: `0 0 0 1px ${activeColor}30, 0 1px 4px ${activeColor}40`,
          }}
        />
      </div>

      {/* Labels — quietly aligned under each segment */}
      <div className="mt-3 grid grid-cols-4 gap-1">
        {STEPS.map((s, i) => {
          const active = i === activeIdx;
          return (
            <div
              key={s}
              className="text-center font-mono text-[9px] uppercase tracking-[0.18em] transition-colors"
              style={{
                color: active ? "rgb(var(--fg))" : "rgb(var(--fg-subtle) / 0.7)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {ZONE_LABEL[s]}
            </div>
          );
        })}
      </div>

      {/* Caption — refined, lighter */}
      <div className="mt-3 text-center text-[12px] text-fg-muted leading-snug">
        <span className="font-medium text-fg">{LABEL_LONG[zone]}</span>
        <span className="mx-1.5 text-fg-subtle/60">·</span>
        <span className="text-fg-subtle">tonight's position on the wheel</span>
      </div>
    </div>
  );
}
