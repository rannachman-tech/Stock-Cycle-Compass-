// Zone colours expressed as CSS variable references and as alpha-modulated
// rgb() helpers. Using string concatenation like `"rgb(var(--zone-clear))" +
// "30"` produces invalid CSS — we must build proper `rgb(... / alpha)` strings.

import type { Zone } from "./types";

const ZONE_VAR: Record<Zone, string> = {
  clear: "--zone-clear",
  watch: "--zone-watch",
  warning: "--zone-warning",
  storm: "--zone-storm",
};

/** rgb(var(--zone-X)) — fully opaque */
export function zoneColour(zone: Zone): string {
  return `rgb(var(${ZONE_VAR[zone]}))`;
}

/** rgb(var(--zone-X) / alpha) where alpha is 0..1 */
export function zoneColourAlpha(zone: Zone, alpha: number): string {
  return `rgb(var(${ZONE_VAR[zone]}) / ${alpha})`;
}
