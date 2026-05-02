"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass, Moon, SunMedium } from "lucide-react";
import EtoroBadge from "./EtoroBadge";

interface Props {
  pro: boolean;
  onProToggle: (next: boolean) => void;
  onConnectClick: () => void;
}

export default function Header({ pro, onProToggle, onConnectClick }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem("scc:theme", next);
    } catch {}
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center ring-1 ring-accent/30">
            <Compass className="w-4 h-4 text-accent" />
          </div>
          <div className="leading-tight">
            <div className="text-[14.5px] font-medium text-fg tracking-tightish">Stock Cycle Compass</div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-fg-subtle">
              eToro · Compass family
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Plain / Pro toggle */}
          <div className="hidden sm:inline-flex rounded-md border border-border bg-surface p-0.5">
            <button
              onClick={() => onProToggle(false)}
              className={`px-2.5 py-1 rounded-[5px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
                !pro ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"
              }`}
              aria-pressed={!pro}
            >
              Plain
            </button>
            <button
              onClick={() => onProToggle(true)}
              className={`px-2.5 py-1 rounded-[5px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
                pro ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"
              }`}
              aria-pressed={pro}
            >
              Pro
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md border border-border bg-surface hover:border-border-strong transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <SunMedium className="w-4 h-4 text-fg-muted" />
            ) : (
              <Moon className="w-4 h-4 text-fg-muted" />
            )}
          </button>

          <EtoroBadge onConnectClick={onConnectClick} />
        </div>
      </div>
    </header>
  );
}
