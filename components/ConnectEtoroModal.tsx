"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, X } from "lucide-react";
import { saveSession } from "@/lib/etoro-session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; env: "real" | "demo"; username: string; cid: number }
  | { kind: "error"; message: string };

export default function ConnectEtoroModal({ open, onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [userKey, setUserKey] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && status.kind !== "testing" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, status.kind]);

  if (!mounted || !open) return null;

  async function test() {
    setStatus({ kind: "testing" });
    try {
      const r = await fetch("/api/etoro/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), userKey: userKey.trim() }),
      });
      const json = (await r.json()) as any;
      if (!r.ok || !json.ok) {
        setStatus({ kind: "error", message: json.error || `HTTP ${r.status}` });
        return;
      }
      setStatus({
        kind: "ok",
        env: json.detectedEnv,
        username: json.profile?.username ?? "user",
        cid: json.profile?.cid ?? 0,
      });
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message || "Network error" });
    }
  }

  function saveAndClose() {
    if (status.kind !== "ok") return;
    saveSession({
      apiKey: apiKey.trim(),
      userKey: userKey.trim(),
      env: status.env,
      username: status.username,
      cid: status.cid,
      connectedAt: new Date().toISOString(),
    });
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={status.kind !== "testing" ? onClose : undefined}
      />
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              eToro · API connect
            </div>
            <h2 className="mt-1 text-lg font-medium text-fg">Connect your eToro account</h2>
          </div>
          <button
            onClick={status.kind !== "testing" ? onClose : undefined}
            aria-label="Close connect dialog"
            className="p-1 text-fg-subtle hover:text-fg rounded-md focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field
            label="Public API Key"
            value={apiKey}
            onChange={setApiKey}
            placeholder="Begins with a UUID-looking string"
          />
          <Field
            label="Private Key"
            value={userKey}
            onChange={setUserKey}
            placeholder="The secret key shown next to it"
            secret
          />

          <button
            onClick={() => setShowHelp((v) => !v)}
            className="w-full flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle hover:text-fg"
          >
            <span>Where do I get these?</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} />
          </button>
          {showHelp && (
            <ol className="text-[12.5px] text-fg-muted leading-relaxed space-y-2 list-decimal pl-4">
              <li>
                Sign in to{" "}
                <a className="text-accent underline-offset-2 hover:underline" href="https://www.etoro.com/" target="_blank" rel="noreferrer">
                  etoro.com
                </a>{" "}
                in another tab.
              </li>
              <li>Open Account &rarr; API access.</li>
              <li>Click <em>Generate</em>. Copy the Public API Key and the Private Key.</li>
              <li>Paste them above. We auto-detect whether the keys belong to a real or virtual account.</li>
            </ol>
          )}

          {status.kind === "error" && (
            <div className="rounded-md border border-zone-storm/30 bg-zone-storm/10 px-3 py-2 text-[12.5px] text-zone-storm">
              {status.message}
            </div>
          )}
          {status.kind === "ok" && (
            <div className="rounded-md border border-zone-clear/30 bg-zone-clear/10 px-3 py-2 text-[12.5px] text-zone-clear">
              Connected as <strong>@{status.username}</strong>{" "}
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] ml-1">
                {status.env === "demo" ? "Virtual account" : "Real account"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          {status.kind === "ok" ? (
            <button
              onClick={saveAndClose}
              className="rounded-md bg-accent text-accent-fg px-4 py-2 text-[13px] font-medium"
            >
              Save & close
            </button>
          ) : (
            <button
              onClick={test}
              disabled={!apiKey.trim() || !userKey.trim() || status.kind === "testing"}
              className="rounded-md bg-accent text-accent-fg px-4 py-2 text-[13px] font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              {status.kind === "testing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {status.kind === "testing" ? "Testing…" : "Test connection"}
            </button>
          )}
        </div>

        <p className="px-5 pb-5 text-[10.5px] text-fg-subtle leading-snug">
          Keys are stored only in this browser's local storage. You can disconnect at any time. We never see your keys on a
          server beyond the initial validation request.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  return (
    <label className="block">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle">{label}</div>
      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="mt-1.5 block w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent"
      />
    </label>
  );
}
