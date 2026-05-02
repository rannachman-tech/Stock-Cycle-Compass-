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
          <radialGradient id="hubGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgb(var(--surface))" />
            <stop offset="100%" stopColor="rgb(var(--surface-elev))" />
          </radialGradient>
          <linearGradient id="handGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgb(var(--accent))" />
            <stop offset="100%" stopColor="rgb(var(--accent) / 0.5)" />
          </linearGradient>
          <filter id="handShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
            <feOffset dx="0" dy="2.5" result="offsetblur" />
            <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="brassFill" width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="rgb(var(--surface-elev))" />
            <circle cx="1.5" cy="1.5" r="0.4" fill="rgb(var(--border) / 0.7)" />
          </pattern>
        </defs>

        {/* outer ring (decorative brass band) */}
        <circle cx={CX} cy={CY} r={R_OUTER + 12}
                fill="none"
                stroke="rgb(var(--border-strong))"
                strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_OUTER + 8}
                fill="none"
                stroke="rgb(var(--border) / 0.5)"
                strokeWidth="1" />

        {/* Quadrant fills */}
        {QUADS.map(({ zone: zid, start }) => {
          const fillVar =
            zid === "clear"   ? "var(--zone-clear)" :
            zid === "watch"   ? "var(--zone-watch)" :
            zid === "warning" ? "var(--zone-warning)" :
                                "var(--zone-storm)";
          const isActive = zid === zone;
          return (
            <g key={zid}>
              <path
                d={arcPath(CX, CY, R_OUTER, start, start + 90, R_INNER)}
                fill={`rgb(${fillVar} / ${isActive ? "0.18" : "0.07"})`}
                stroke={`rgb(${fillVar} / ${isActive ? "0.55" : "0.25"})`}
                strokeWidth={isActive ? 1.4 : 0.8}
              />
            </g>
          );
        })}

        {/* Quadrant labels */}
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
              fontSize="10"
              letterSpacing="2.4"
              fill={`rgb(var(--fg${isActive ? "" : "-subtle"}))`}
              fontWeight={isActive ? 600 : 500}
              style={{ textTransform: "uppercase" }}
            >
              {ZONE_LABEL[zid].toUpperCase()}
            </text>
          );
        })}

        {/* Tick marks */}
        {ticks.map((t, i) => {
          const [x1, y1] = pointAt(CX, CY, R_TICK, t.d);
          const [x2, y2] = pointAt(CX, CY, t.major ? R_TICK - 12 : R_TICK - 6, t.d);
          return (
            <line key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={t.major ? "rgb(var(--fg-muted))" : "rgb(var(--border-strong))"}
                  strokeWidth={t.major ? 1.4 : 0.8}
                  strokeLinecap="round" />
          );
        })}

        {/* Major tick numbers — quartile marks 0/25/50/75 */}
        {[0, 90, 180, 270].map((d, i) => {
          const [tx, ty] = pointAt(CX, CY, R_TICK + 14, d);
          return (
            <text key={`q-${i}`}
                  x={tx} y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fontSize="9"
                  fill="rgb(var(--fg-subtle))">
              {i * 25}
            </text>
          );
        })}

        {/* Inner decorative ring */}
        <circle cx={CX} cy={CY} r={R_INNER - 8}
                fill="none"
                stroke="rgb(var(--border))"
                strokeWidth="0.6" />
        <circle cx={CX} cy={CY} r={R_INNER - 18}
                fill="none"
                stroke="rgb(var(--border) / 0.6)"
                strokeWidth="0.4" strokeDasharray="2 4" />

        {/* Center hub */}
        <circle cx={CX} cy={CY} r={R_HUB + 4}
                fill="rgb(var(--bg))"
                stroke="rgb(var(--border-strong))"
                strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_HUB}
                fill="url(#hubGrad)"
                stroke="rgb(var(--border))"
                strokeWidth="0.8" />

        {/* Hand */}
        <g
          className="cycle-needle"
          transform={`translate(${CX} ${CY}) rotate(${degrees})`}
          style={{ ["--needle-angle" as any]: `${degrees}deg` }}
          filter="url(#handShadow)"
        >
          {/* Counter-balance back */}
          <line x1="0" y1="0" x2="0" y2="42"
                stroke="rgb(var(--fg-muted))"
                strokeWidth="2.4"
                strokeLinecap="round" />
          <circle cx="0" cy="48" r="5"
                  fill="rgb(var(--surface-elev))"
                  stroke="rgb(var(--border-strong))"
                  strokeWidth="0.8" />
          {/* Main pointer */}
          <path d={handPathD} fill="url(#handGrad)" stroke="rgb(var(--accent))" strokeWidth="0.6" strokeLinejoin="round" />
          {/* Hub cap */}
          <circle cx="0" cy="0" r="6" fill="rgb(var(--accent))" />
          <circle cx="0" cy="0" r="2" fill="rgb(var(--accent-fg))" />
        </g>

        {/* Center text — the percentile.
            Big number + accent "%" mark + small "ile" superscript so it
            reads unambiguously as "percentile" not "percent". */}
        <text x={CX} y={CY - 5}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              fontSize="46"
              fontWeight="500"
              letterSpacing="-1.4"
              fill="rgb(var(--fg))">
          {pctRounded}
          <tspan
            fontSize="22"
            dx="2"
            dy="-2"
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            fontWeight="500"
            fill="rgb(var(--accent))">
            %
          </tspan>
          <tspan
            fontSize="11"
            dx="0.5"
            dy="-12"
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            fill="rgb(var(--fg-subtle))"
            letterSpacing="0.4">
            ile
          </tspan>
        </text>
        <text x={CX} y={CY + 22}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
              fontSize="9"
              fill="rgb(var(--fg-subtle))"
              letterSpacing="2"
              style={{ textTransform: "uppercase" }}>
          {tag ?? "Percentile"}
        </text>

        {/* North marker — small triangle */}
        <polygon
          points={`${CX - 4},${CY - R_OUTER - 16} ${CX + 4},${CY - R_OUTER - 16} ${CX},${CY - R_OUTER - 6}`}
          fill="rgb(var(--accent))"
        />
      </svg>
    </div>
  );
}
