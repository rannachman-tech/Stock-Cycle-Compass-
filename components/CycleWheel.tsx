"use client";

import { useMemo } from "react";
import type { Zone } from "@/lib/types";
import { ZONE_LABEL } from "@/lib/types";

interface Props {
  /** 0..100 — composite valuation percentile */
  percentile: number;
  /** 0..360 — wheel angle (0 at top, clockwise) */
  degrees: number;
  /** Active zone (also derives ring colour weight) */
  zone: Zone;
  /** Optional tag shown over the centre disc */
  tag?: string;
}

const SIZE = 440;          // viewBox is square
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 200;       // outer ring radius
const R_INNER = 138;       // inner ring radius (inside text band)
const R_TICK = 215;        // tick mark outer
const R_HUB = 38;          // center hub
const R_LABEL = 168;       // ring label radius
const R_HAND = 174;        // hand tip radius

// Quadrant order matches lib/score.ts:
// 0..90 Clear, 90..180 Watch, 180..270 Warning, 270..360 Storm
const QUADS: { zone: Zone; start: number; mid: number }[] = [
  { zone: "clear",   start: 0,   mid: 45 },
  { zone: "watch",   start: 90,  mid: 135 },
  { zone: "warning", start: 180, mid: 225 },
  { zone: "storm",   start: 270, mid: 315 },
];

function deg2rad(d: number) { return ((d - 90) * Math.PI) / 180; }
// (-90 because SVG 0deg is right, but we want 0deg at top)

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number, ri?: number) {
  const a0 = deg2rad(startDeg);
  const a1 = deg2rad(endDeg);
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  if (ri == null) {
    return `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`;
  }
  const xi0 = cx + ri * Math.cos(a0);
  const yi0 = cy + ri * Math.sin(a0);
  const xi1 = cx + ri * Math.cos(a1);
  const yi1 = cy + ri * Math.sin(a1);
  return `M ${x0} ${y0}
          A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}
          L ${xi1} ${yi1}
          A ${ri} ${ri} 0 ${largeArc} 0 ${xi0} ${yi0} Z`;
}

function pointAt(cx: number, cy: number, r: number, d: number) {
  const a = deg2rad(d);
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

export default function CycleWheel({ percentile, degrees, zone, tag }: Props) {
  // Tick marks every 5deg, major every 30deg
  const ticks = useMemo(() => {
    const arr: { d: number; major: boolean }[] = [];
    for (let d = 0; d < 360; d += 5) arr.push({ d, major: d % 30 === 0 });
    return arr;
  }, []);

  // Pre-compute hand path
  const [hx, hy] = pointAt(CX, CY, R_HAND, 0);
  const handPathD = `M 0 0 L 0 -${R_HAND} L 6 -${R_HAND - 14} L 0 -${R_HAND - 4} L -6 -${R_HAND - 14} Z`;

  // Convert composite percentile to centre digit
  const pctRounded = Math.round(percentile);

  return (
    <div className="relative w-full aspect-square">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        role="img"
        aria-label={`Cycle wheel: ${pctRounded}th percentile, ${ZONE_LABEL[zone]}`}
      >
        <defs>
          <radialGradient id="hubGrad" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="rgb(var(--surface))" />
            <stop offset="60%" stopColor="rgb(var(--surface))" />
            <stop offset="100%" stopColor="rgb(var(--surface-elev))" />
          </radialGradient>
          <linearGradient id="handGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgb(var(--accent))" />
            <stop offset="60%"  stopColor="rgb(var(--accent) / 0.85)" />
            <stop offset="100%" stopColor="rgb(var(--accent) / 0.4)" />
          </linearGradient>
          <filter id="handShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="3" result="offsetblur" />
            <feComponentTransfer><feFuncA type="linear" slope="0.32" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="quadGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {/* Per-quadrant subtle radial gradient — adds depth without visual noise */}
          {QUADS.map(({ zone: zid, mid }) => {
            const fillVar =
              zid === "clear"   ? "var(--zone-clear)" :
              zid === "watch"   ? "var(--zone-watch)" :
              zid === "warning" ? "var(--zone-warning)" :
                                  "var(--zone-storm)";
            const cxFrac = 50 + 40 * Math.cos(deg2rad(mid));
            const cyFrac = 50 + 40 * Math.sin(deg2rad(mid));
            return (
              <radialGradient key={`grad-${zid}`} id={`quadGrad-${zid}`}
                cx={`${cxFrac}%`} cy={`${cyFrac}%`} r="55%">
                <stop offset="0%"   stopColor={`rgb(${fillVar} / 0.22)`} />
                <stop offset="55%"  stopColor={`rgb(${fillVar} / 0.10)`} />
                <stop offset="100%" stopColor={`rgb(${fillVar} / 0.04)`} />
              </radialGradient>
            );
          })}
        </defs>

        {/* outer ring — single, refined */}
        <circle cx={CX} cy={CY} r={R_OUTER + 10}
                fill="none"
                stroke="rgb(var(--border) / 0.55)"
                strokeWidth="0.6" />

        {/* Quadrant fills — subtle radial gradient per quadrant; active quadrant gets a soft glow halo */}
        {QUADS.map(({ zone: zid, start, mid }) => {
          const fillVar =
            zid === "clear"   ? "var(--zone-clear)" :
            zid === "watch"   ? "var(--zone-watch)" :
            zid === "warning" ? "var(--zone-warning)" :
                                "var(--zone-storm)";
          const isActive = zid === zone;
          return (
            <g key={zid}>
              {isActive && (
                <path
                  d={arcPath(CX, CY, R_OUTER + 4, start, start + 90, R_INNER - 4)}
                  fill={`rgb(${fillVar} / 0.18)`}
                  filter="url(#quadGlow)"
                  opacity="0.7"
                />
              )}
              <path
                d={arcPath(CX, CY, R_OUTER, start, start + 90, R_INNER)}
                fill={isActive ? `url(#quadGrad-${zid})` : `rgb(${fillVar} / 0.04)`}
                stroke={`rgb(${fillVar} / ${isActive ? "0.45" : "0.18"})`}
                strokeWidth={isActive ? 1 : 0.6}
              />
            </g>
          );
        })}

        {/* Quadrant labels — softer, more refined letterspacing */}
        {QUADS.map(({ zone: zid, mid }) => {
          const [lx, ly] = pointAt(CX, CY, R_LABEL, mid);
          const isActive = zid === zone;
          return (
            <text
              key={`label-${zid}`}
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
              fontSize="9.5"
              letterSpacing="2.8"
              fill={isActive ? "rgb(var(--fg))" : "rgb(var(--fg-subtle) / 0.85)"}
              fontWeight={isActive ? 600 : 400}
              style={{ textTransform: "uppercase" }}
            >
              {ZONE_LABEL[zid].toUpperCase()}
            </text>
          );
        })}

        {/* Tick marks — softer, less metallic */}
        {ticks.map((t, i) => {
          const [x1, y1] = pointAt(CX, CY, R_TICK, t.d);
          const [x2, y2] = pointAt(CX, CY, t.major ? R_TICK - 10 : R_TICK - 5, t.d);
          return (
            <line key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={t.major ? "rgb(var(--fg-subtle) / 0.85)" : "rgb(var(--border-strong) / 0.6)"}
                  strokeWidth={t.major ? 1 : 0.5}
                  strokeLinecap="round" />
          );
        })}

        {/* Major tick numbers — quartile marks 0/25/50/75 */}
        {[0, 90, 180, 270].map((d, i) => {
          const [tx, ty] = pointAt(CX, CY, R_TICK + 13, d);
          return (
            <text key={`q-${i}`}
                  x={tx} y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fontSize="8.5"
                  fill="rgb(var(--fg-subtle) / 0.75)"
                  letterSpacing="0.4">
              {i * 25}
            </text>
          );
        })}

        {/* Inner decorative ring — single fine line, no dashes */}
        <circle cx={CX} cy={CY} r={R_INNER - 10}
                fill="none"
                stroke="rgb(var(--border) / 0.4)"
                strokeWidth="0.5" />

        {/* Center hub — flatter, more refined: no chunky border */}
        <circle cx={CX} cy={CY} r={R_HUB + 6}
                fill="rgb(var(--bg))"
                stroke="rgb(var(--border) / 0.6)"
                strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={R_HUB}
                fill="url(#hubGrad)"
                stroke="rgb(var(--border) / 0.4)"
                strokeWidth="0.5" />

        {/* Hand — slimmer profile, refined counter-balance */}
        <g
          className="cycle-needle"
          transform={`translate(${CX} ${CY}) rotate(${degrees})`}
          style={{ ["--needle-angle" as any]: `${degrees}deg` }}
          filter="url(#handShadow)"
        >
          {/* Counter-balance — thinner, with smaller weight */}
          <line x1="0" y1="0" x2="0" y2="38"
                stroke="rgb(var(--fg-muted) / 0.8)"
                strokeWidth="1.6"
                strokeLinecap="round" />
          <circle cx="0" cy="42" r="3.5"
                  fill="rgb(var(--surface-elev))"
                  stroke="rgb(var(--border-strong) / 0.7)"
                  strokeWidth="0.6" />
          {/* Main pointer — finer, with refined fill */}
          <path d={handPathD} fill="url(#handGrad)" stroke="rgb(var(--accent) / 0.8)" strokeWidth="0.4" strokeLinejoin="round" />
          {/* Hub cap — smaller, jewel-like */}
          <circle cx="0" cy="0" r="4.5" fill="rgb(var(--accent))" />
          <circle cx="0" cy="0" r="1.5" fill="rgb(var(--accent-fg) / 0.85)" />
        </g>

        {/* Center text — the percentile.
            Big number + accent "%" mark + small "ile" superscript so it
            reads unambiguously as "percentile" not "percent". */}
        <text x={CX} y={CY - 3}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              fontSize="36"
              fontWeight="450"
              letterSpacing="-1.2"
              fill="rgb(var(--fg))">
          {pctRounded}
          <tspan
            fontSize="16"
            dx="1.2"
            dy="-1.5"
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            fontWeight="500"
            fill="rgb(var(--accent))">
            %
          </tspan>
          <tspan
            fontSize="8.5"
            dx="0.4"
            dy="-9"
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            fill="rgb(var(--fg-subtle) / 0.85)"
            letterSpacing="0.3">
            ile
          </tspan>
        </text>
        <text x={CX} y={CY + 19}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
              fontSize="8"
              fill="rgb(var(--fg-subtle) / 0.7)"
              letterSpacing="2.4"
              style={{ textTransform: "uppercase" }}>
          {tag ?? "Percentile"}
        </text>

        {/* North marker — refined: tiny inverted V instead of solid triangle */}
        <path
          d={`M ${CX - 3.5} ${CY - R_OUTER - 14} L ${CX} ${CY - R_OUTER - 8} L ${CX + 3.5} ${CY - R_OUTER - 14}`}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
