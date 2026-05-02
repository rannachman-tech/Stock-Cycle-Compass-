// Lightweight wrapper around the eToro session in localStorage.
// Versioned key so we can break the schema later without surprising users.

export const KEY = "scc-etoro:v1";
export const ETORO_CHANGE_EVENT = "scc-etoro-changed";

export interface EtoroSession {
  apiKey: string;
  userKey: string;
  env: "real" | "demo";
  username: string;
  cid: number;
  connectedAt: string;
}

export function getSession(): EtoroSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.apiKey !== "string" || typeof parsed.userKey !== "string") return null;
    return parsed as EtoroSession;
  } catch {
    return null;
  }
}

export function saveSession(s: EtoroSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event(ETORO_CHANGE_EVENT));
  } catch {}
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(ETORO_CHANGE_EVENT));
  } catch {}
}
