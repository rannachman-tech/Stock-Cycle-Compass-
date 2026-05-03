"use client";

import { Activity } from "lucide-react";

interface Props {
  generatedAt: string;
}

function relativeUtc(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    const mon = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
    const day = d.getUTCDate();
    return `${day} ${mon} ${yyyy} · ${hh}:${mm} UTC`;
  } catch {
    return iso;
  }
}

export default function LiveSourcesRow({ generatedAt }: Props) {
  return (
    <div className="flex items-center gap-2 text-fg-subtle/85">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-zone-clear opacity-40 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-zone-clear" />
      </span>
      <Activity className="w-3 h-3" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
        Live · refreshed {relativeUtc(generatedAt)}
      </span>
    </div>
  );
}
