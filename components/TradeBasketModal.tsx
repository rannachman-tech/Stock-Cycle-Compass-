"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Loader2, X } from "lucide-react";
import type { Basket } from "@/lib/types";
import { allocate } from "@/lib/baskets";
import { getSession, ETORO_CHANGE_EVENT } from "@/lib/etoro-session";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface Props {
  open: boolean;
  basket: Basket | null;
  onClose: () => void;
}

type Step = "review" | "confirm" | "executing" | "result";
type LegStatus = "filled" | "pending" | "queued" | "failed";
type Result = {
  ticker: string;
  ok: boolean;
  status: LegStatus;
  orderId?: number;
  positionId?: number;
  isOpen?: boolean;
  rate?: number;
  units?: number;
  error?: string;
  rawStatus?: number;
  rawBody?: string;
  rawRequest?: string;
};

const QUICK_AMOUNTS = [200, 500, 1000, 2500];

export default function TradeBasketModal({ open, basket, onClose }: Props) {
  const [step, setStep] = useState<Step>("review");
  const [amount, setAmount] = useState<number>(1000);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // Track session env so the modal can render a real-money warning.
  const [sessionEnv, setSessionEnv] = useState<"real" | "demo" | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const sync = () => setSessionEnv(getSession()?.env ?? null);
    sync();
    window.addEventListener(ETORO_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ETORO_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("review");
    setResults([]);
    setTopLevelError(null);
    setExpanded(null);
  }, [open, basket?.zone, basket?.region]);

  // Lock body scroll WITH scrollbar-width compensation so the page doesn't
  // jump when the modal opens.
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && step !== "executing" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, step]);

  const allocations = useMemo(() => {
    if (!basket) return [];
    return allocate(basket, amount);
  }, [basket, amount]);

  if (!mounted || !open || !basket) return null;

  async function execute() {
    const session = getSession();
    if (!session) return;
    setStep("executing");
    try {
      const r = await fetch("/api/etoro/trade-basket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: session.apiKey,
          userKey: session.userKey,
          env: session.env,
          basket: allocations.map((h) => ({
            ticker: h.ticker,
            instrumentId: h.instrumentId,
            amount: h.dollars,
          })),
        }),
      });
      const json = (await r.json()) as { results?: Result[]; error?: string };
      if (json.error && !json.results) {
        setTopLevelError(json.error);
        setResults(
          allocations.map((h) => ({
            ticker: h.ticker,
            ok: false,
            status: "failed" as LegStatus,
            error: "Not attempted",
          })),
        );
      } else {
        setResults(
          json.results ??
            allocations.map((h) => ({
              ticker: h.ticker,
              ok: false,
              status: "failed" as LegStatus,
              error: json.error || `HTTP ${r.status}`,
            })),
        );
      }
    } catch (e: any) {
      setResults(
        allocations.map((h) => ({
          ticker: h.ticker,
          ok: false,
          status: "failed" as LegStatus,
          error: e?.message || "Network error",
        })),
      );
    }
    setStep("result");
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={step !== "executing" ? onClose : undefined}
      />

      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              {basket.region.toUpperCase()} · {basket.zone.toUpperCase()}
            </div>
            <h2 className="mt-1 text-lg font-medium text-fg">{basket.title}</h2>
          </div>
          {step !== "executing" && (
            <button
              onClick={onClose}
              aria-label="Close trade dialog"
              className="p-1 text-fg-subtle hover:text-fg rounded-md focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
        {step === "review" && (
          <div className="p-5 space-y-4">
            {sessionEnv === "real" && <RealMoneyBanner />}
            <p className="text-[13px] text-fg-muted leading-relaxed">{basket.thesis}</p>

            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle">Total amount</div>
              <div className="mt-1.5 flex items-stretch gap-2">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value || 0)))}
                  className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-[14px] text-fg focus:outline-none focus:border-accent tabular-nums"
                />
                <div className="inline-flex rounded-md border border-border overflow-hidden">
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(q)}
                      className={`px-2.5 text-[11.5px] font-mono ${
                        amount === q ? "bg-accent text-accent-fg" : "text-fg-muted hover:bg-bg-soft"
                      }`}
                    >
                      ${q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <AllocationTable rows={allocations} expanded={expanded} setExpanded={setExpanded} />

            <button
              onClick={() => setStep("confirm")}
              className="w-full rounded-md bg-accent text-accent-fg px-4 py-2.5 text-[13px] font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="p-5 space-y-4">
            {sessionEnv === "real" && <RealMoneyBanner />}
            <h3 className="text-[14px] font-medium text-fg">Confirm trades</h3>
            <table className="w-full text-[12.5px] tabular-nums border border-border rounded-md overflow-hidden">
              <thead className="bg-bg-soft text-fg-subtle">
                <tr>
                  <th className="text-left px-3 py-2 font-mono uppercase tracking-[0.14em] text-[10px]">Ticker</th>
                  <th className="text-right px-3 py-2 font-mono uppercase tracking-[0.14em] text-[10px]">Weight</th>
                  <th className="text-right px-3 py-2 font-mono uppercase tracking-[0.14em] text-[10px]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((h) => (
                  <tr key={h.ticker} className="border-t border-border">
                    <td className="px-3 py-2 text-fg">{h.ticker}</td>
                    <td className="px-3 py-2 text-right text-fg-muted">{h.weight}%</td>
                    <td className="px-3 py-2 text-right text-fg">${h.dollars.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-bg-soft">
                  <td className="px-3 py-2 text-fg font-medium">Total</td>
                  <td />
                  <td className="px-3 py-2 text-right text-fg font-medium">${amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-[11.5px] text-fg-muted leading-relaxed">
              Make sure you have the required funds available in your account. Orders execute as market orders at eToro.
            </p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => setStep("review")}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-fg-muted hover:text-fg"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                onClick={execute}
                className="rounded-md bg-accent text-accent-fg px-4 py-2 text-[13px] font-medium"
              >
                Execute trades
              </button>
            </div>
          </div>
        )}

        {step === "executing" && (
          <div className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
            <div className="text-[13px] text-fg-muted">
              Submitting orders…
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="p-5 space-y-4">
            <ResultSummary results={results} />
            {topLevelError && (
              <div className="rounded-md border border-zone-storm/40 bg-zone-storm/10 px-3 py-2 text-[12.5px] text-zone-storm">
                {topLevelError}
              </div>
            )}
            <div className="rounded-md border border-border divide-y divide-border">
              {results.map((r) => (
                <ResultRow key={r.ticker} r={r} />
              ))}
            </div>
            <p className="text-[11.5px] text-fg-subtle leading-relaxed">
              Funds must be available in your eToro account for these orders to fill. If your balance is insufficient,
              eToro will reject the trades.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-accent text-accent-fg px-4 py-2.5 text-[13px] font-medium"
            >
              Done
            </button>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AllocationTable({
  rows,
  expanded,
  setExpanded,
}: {
  rows: ReturnType<typeof allocate>;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
}) {
  return (
    <div className="rounded-md border border-border divide-y divide-border">
      {rows.map((h) => (
        <div key={h.ticker}>
          <button
            onClick={() => setExpanded(expanded === h.ticker ? null : h.ticker)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-bg-soft text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="font-mono text-[11.5px] text-fg w-12 shrink-0">{h.ticker}</div>
              <div className="text-[12.5px] text-fg-muted truncate">{h.shortRationale}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="font-mono text-[11px] text-fg-subtle">{h.weight}%</div>
              <div className="text-[12.5px] text-fg tabular-nums">${h.dollars.toLocaleString()}</div>
              <ChevronDown className={`w-3.5 h-3.5 text-fg-subtle transition-transform ${expanded === h.ticker ? "rotate-180" : ""}`} />
            </div>
          </button>
          {expanded === h.ticker && (
            <div className="px-3 pb-3 -mt-1 text-[12.5px] text-fg-muted leading-relaxed">
              <div className="text-fg font-medium mb-1">{h.name}</div>
              {h.longRationale}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RealMoneyBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-zone-storm/40 bg-zone-storm/10 px-3 py-2.5">
      <AlertTriangle className="w-4 h-4 text-zone-storm shrink-0 mt-0.5" />
      <div className="text-[12px] leading-relaxed text-fg">
        <span className="font-medium text-zone-storm">Real money mode.</span>{" "}
        These trades will use actual funds in your eToro account. Orders execute as market orders and cannot be
        undone from this app.
      </div>
    </div>
  );
}

function ResultSummary({ results }: { results: Result[] }) {
  const total = results.length;
  const placed = results.filter((r) => r.ok).length;
  const failed = total - placed;

  const headline =
    placed === total
      ? `${total} of ${total} orders placed`
      : failed === total
      ? `All ${total} orders failed — see rows for details`
      : `${placed} of ${total} orders placed · ${failed} failed`;

  return (
    <div>
      <h3 className="text-[14px] font-medium text-fg">Execution result</h3>
      <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">{headline}</p>
    </div>
  );
}

function ResultRow({ r }: { r: Result }) {
  const [open, setOpen] = useState(false);
  // We only let users expand a row when something failed and there's
  // diagnostic info to show. Successful rows stay quiet.
  const hasDiagnostic =
    !r.ok && (r.rawBody != null || r.rawStatus != null || r.rawRequest != null);

  return (
    <div>
      <button
        onClick={() => hasDiagnostic && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left ${
          hasDiagnostic ? "hover:bg-bg-soft cursor-pointer" : "cursor-default"
        }`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {r.ok ? (
            <Check className="w-3.5 h-3.5 text-zone-clear shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-zone-storm shrink-0" />
          )}
          <div className="font-mono text-[11.5px] text-fg w-14 shrink-0">{r.ticker}</div>
          {!r.ok && (
            <div className="text-[12.5px] text-zone-storm truncate">{r.error ?? "Rejected"}</div>
          )}
        </div>
        {hasDiagnostic && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-fg-subtle transition-transform shrink-0 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {open && hasDiagnostic && (
        <div className="px-3 pb-3 -mt-1 text-[11.5px] space-y-2">
          {r.rawStatus != null && (
            <div className="font-mono text-fg-subtle">HTTP {r.rawStatus}</div>
          )}
          {r.rawRequest && (
            <div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fg-subtle mb-1">
                Request body
              </div>
              <pre className="rounded border border-border bg-bg-soft p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-snug text-fg-muted font-mono">
                {r.rawRequest}
              </pre>
            </div>
          )}
          {r.rawBody && (
            <div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fg-subtle mb-1">
                Response body
              </div>
              <pre className="rounded border border-border bg-bg-soft p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-snug text-fg-muted font-mono">
                {r.rawBody}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
