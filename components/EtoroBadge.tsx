"use client";

import { useEffect, useState } from "react";
import { LinkIcon, X } from "lucide-react";
import { getSession, clearSession, ETORO_CHANGE_EVENT, type EtoroSession } from "@/lib/etoro-session";

interface Props {
  onConnectClick: () => void;
}

export default function EtoroBadge({ onConnectClick }: Props) {
  const [session, setSession] = useState<EtoroSession | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSession(getSession());
    const sync = () => setSession(getSession());
    window.addEventListener(ETORO_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ETORO_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!session) {
    return (
      <button
        onClick={onConnectClick}
        className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent text-accent-fg px-2.5 py-1.5 text-[12px] font-medium hover:opacity-90 transition-opacity"
      >
        <LinkIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Connect eToro</span>
        <span className="sm:hidden">Connect</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px]"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-zone-clear opacity-50 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-zone-clear" />
        </span>
        <span className="font-medium text-fg">@{session.username}</span>
        {session.env === "demo" && (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] rounded-sm bg-zone-watch/15 text-zone-watch px-1 py-0.5">
            Virtual
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1.5 w-56 rounded-md border border-border bg-surface shadow-lg p-2"
          role="menu"
        >
          <div className="px-2 py-1.5 text-[11px] text-fg-subtle">
            Connected as <span className="text-fg font-medium">@{session.username}</span>
          </div>
          <button
            onClick={() => {
              clearSession();
              setOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] text-fg-muted hover:bg-bg-soft"
          >
            <X className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
