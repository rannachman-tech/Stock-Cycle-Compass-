"use client";

import type { RegionId } from "@/lib/types";
import { REGIONS } from "@/lib/types";

interface Props {
  active: RegionId;
  onChange: (id: RegionId) => void;
}

export default function RegionTabs({ active, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5 shadow-sm">
      {REGIONS.map((r) => {
        const isActive = r.id === active;
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={[
              "px-3 sm:px-3.5 py-1.5 rounded-[5px] font-mono text-[11px] uppercase tracking-[0.16em] transition-colors",
              isActive
                ? "bg-accent text-accent-fg"
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
