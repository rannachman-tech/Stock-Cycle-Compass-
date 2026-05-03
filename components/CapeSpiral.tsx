"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CapePoint } from "@/lib/types";

interface Props {
  history: CapePoint[];
}

const W = 880;
const H = 540;
const CX = W / 2;
const CY = H / 2;
const R0 = 26;
const R1 = 230;     // outer radius

// Convert year → spiral angle/radius. We rotate slowly outward and the
// spiral does ~2 turns over the full history length.
function polar(year: number, years: number[], minY: number, maxY: number) {
  const span = maxY - minY;
  const t = (year - minY) / span; // 0..1
  // 2.4 turns from oldest (centre) to newest (outer)
  const turns = 2.4;
  const angle = -Math.PI / 2 + t * turns * 2 * Math.PI;
  // Logarithmic radius for legibility — recent years get more space
  const r = R0 + Math.pow(t, 0.85) * (R1 - R0);
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), r, angle, t };
}

// Map CAPE level → cape-band colour for stroke
function strokeFor(cape: number) {
  if (cape >= 30) return "rgb(var(--zone-warning))";
  if (cape >= 22) return "rgb(var(--zone-watch))";
  if (cape >= 14) return "rgb(var(--zone-clear))";
  return "rgb(var(--zone-clear))";
}

export default function CapeSpiral({ history }: Props) {
  const [hover, setHover] = useState<CapePoint | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const { points, years, minY, maxY } = useMemo(() => {
    const ys = history.map((h) => h.year);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const points = history.map((p) => ({ ...p, ...polar(p.year, ys, minY, maxY) }));
    return { points, years: ys, minY, maxY };
  }, [history]);

  // Path string for the spiral (smooth)
  const pathD = useMemo(() => {
    if (points.length < 2) return "";
    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  }, [points]);

  // Era markers
  const eras = useMemo(
    () => [
      { year: 1929, label: "1929 peak" },
      { year: 1966, label: "1966 peak" },
      { year: 1982, label: "1982 trough" },
      { year: 2000, label: "2000 peak" },
      { year: 2009, label: "2009 trough" },
      { year: 2021, label: "2021 peak" },
    ],
    [],
  );

  // Hovering / touching: snap to nearest year. Works on desktop hover and
  // mobile touch (touchstart + touchmove).
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const findNearest = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const mx = ((clientX - rect.left) / rect.width) * W;
      const my = ((clientY - rect.top) / rect.height) * H;
      let best: CapePoint | null = null;
      let bestDist = 36; // slightly larger tolerance for touch
      for (const p of points) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestDist) { bestDist = d; best = p; }
      }
      return best;
    };
    const onMouseMove = (e: MouseEvent) => setHover(findNearest(e.clientX, e.clientY));
    const onLeave = () => setHover(null);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      setHover(findNearest(t.clientX, t.clientY));
    };
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onTouch, { passive: true });
    el.addEventListener("touchmove", onTouch, { passive: true });
    el.addEventListener("touchend", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("touchmove", onTouch);
      el.removeEventListener("touchend", onLeave);
    };
  }, [points]);

  return (
    <div className="relative w-full">
      {/* On mobile we let the spiral fill the parent (which has its own
          padding) and don't enable horizontal scroll — the SVG scales down
          via its viewBox and stays readable. */}
      <div className="w-full">
        <div className="w-full">
          <svg
            ref={ref}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="S&P 500 CAPE — 1900 to today, drawn as a spiral"
          >
            <defs>
              <radialGradient id="spiralBg" cx="50%" cy="50%" r="60%">
                <stop offset="0%"  stopColor="rgb(var(--surface-elev))" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(var(--surface))"      stopOpacity="0" />
              </radialGradient>
              <filter id="spiralGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* Background disc */}
            <circle cx={CX} cy={CY} r={R1 + 28} fill="url(#spiralBg)" />

            {/* Concentric guide rings — every 25 years */}
            {[1925, 1950, 1975, 2000, 2025].map((y) => {
              const { r } = polar(y, years, minY, maxY);
              return (
                <g key={y}>
                  <circle cx={CX} cy={CY} r={r}
                          fill="none"
                          stroke="rgb(var(--border) / 0.5)"
                          strokeWidth="0.6"
                          strokeDasharray="2 4" />
                  <text x={CX + r + 4} y={CY - 2}
                        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                        fontSize="9"
                        fill="rgb(var(--fg-subtle))">
                    {y}
                  </text>
                </g>
              );
            })}

            {/* Main spiral — drawn as line segments coloured by CAPE level */}
            {points.slice(1).map((p, i) => {
              const prev = points[i];
              return (
                <line
                  key={i}
                  x1={prev.x} y1={prev.y}
                  x2={p.x}    y2={p.y}
                  stroke={strokeFor(p.cape)}
                  strokeWidth={1.6 + p.t * 1.2}
                  strokeLinecap="round"
                  opacity={0.78}
                />
              );
            })}

            {/* Era markers */}
            {eras.map((e) => {
              const pt = points.find((p) => Math.round(p.year) === e.year);
              if (!pt) return null;
              return (
                <g key={e.year}>
                  <circle cx={pt.x} cy={pt.y} r={3.2}
                          fill="rgb(var(--bg))"
                          stroke="rgb(var(--fg))"
                          strokeWidth="1.2" />
                  <text x={pt.x + 7} y={pt.y - 6}
                        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
                        fontSize="10.5"
                        fill="rgb(var(--fg-muted))"
                        fontWeight={500}>
                    {e.label}
                  </text>
                </g>
              );
            })}

            {/* Current point — pulse. Label flips to the left of the dot
                when the dot is in the right half of the viewBox so it
                doesn't run off-screen. */}
            {points.length > 0 && (() => {
              const last = points[points.length - 1];
              const flip = last.x > W * 0.65;
              return (
                <g className="spiral-current">
                  <circle cx={last.x} cy={last.y} r={10}
                          fill="rgb(var(--accent) / 0.18)"
                          filter="url(#spiralGlow)" />
                  <circle cx={last.x} cy={last.y} r={5}
                          fill="rgb(var(--accent))"
                          stroke="rgb(var(--bg))"
                          strokeWidth="2" />
                  <text x={flip ? last.x - 12 : last.x + 12}
                        y={last.y + 3}
                        textAnchor={flip ? "end" : "start"}
                        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
                        fontSize="11.5"
                        fill="rgb(var(--fg))"
                        fontWeight={600}>
                    Today · CAPE {last.cape.toFixed(1)}
                  </text>
                </g>
              );
            })()}

            {/* Hover marker */}
            {hover && (() => {
              const p = points.find((pp) => pp.year === hover.year);
              if (!p) return null;
              return (
                <g>
                  <circle cx={p.x} cy={p.y} r={6}
                          fill="rgb(var(--bg))"
                          stroke="rgb(var(--accent))"
                          strokeWidth="2" />
                </g>
              );
            })()}

            {/* Legend in bottom-left */}
            <g transform={`translate(20 ${H - 64})`}>
              <text x="0" y="0"
                    fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                    fontSize="9"
                    letterSpacing="2"
                    fill="rgb(var(--fg-subtle))"
                    style={{ textTransform: "uppercase" }}>
                CAPE band
              </text>
              {[
                { c: "rgb(var(--zone-clear))",   l: "<22 — cheap/normal" },
                { c: "rgb(var(--zone-watch))",   l: "22–30 — stretched" },
                { c: "rgb(var(--zone-warning))", l: "30+ — bubble territory" },
              ].map((row, i) => (
                <g key={i} transform={`translate(0 ${14 + i * 14})`}>
                  <rect x="0" y="-6" width="14" height="3" fill={row.c} rx="1.5" />
                  <text x="20" y="-3"
                        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
                        fontSize="11"
                        fill="rgb(var(--fg-muted))">
                    {row.l}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* Hover tooltip */}
      {hover && (
        <div className="absolute top-3 right-3 rounded-md border border-border bg-surface px-3 py-2 shadow-sm pointer-events-none">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">{Math.round(hover.year)}</div>
          <div className="text-sm font-medium text-fg">CAPE {hover.cape.toFixed(1)}x</div>
        </div>
      )}
    </div>
  );
}
