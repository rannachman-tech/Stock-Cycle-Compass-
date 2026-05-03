"use client";

import type { RegionId } from "@/lib/types";
import { REGIONS } from "@/lib/types";

interface Props {
  active: RegionId;
  onChange: (id: RegionId) => void;
}

export default function RegionTabs({ active, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-border/70 bg-surface p-0.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      {REGIONS.map((r) => {
        const isActive = r.id === active;
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={[
              "px-3 sm:px-3.5 py-1.5 rounded-[6px] font-mono text-[10.5px] uppercase tracking-[0.18em] transition-all duration-150",
              isActive
                ? "bg-accent text-accent-fg shadow-[0_1px_2px_rgb(var(--accent)/0.25)]"
                : "text-fg-muted hover:text-fg",
            ].join(" ")}
            aria-pressed={isActive}
          >
            {r.short}
          </button>
        );
      })}
    </div>
  );
}
