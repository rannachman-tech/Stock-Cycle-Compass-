// Place a sequence of market-buy orders for a basket on eToro.
// Body: { apiKey, userKey, env: "real"|"demo", basket: [{ ticker, instrumentId, amount }] }
//
// Verified against the working Python reference at
// https://github.com/oajm79/trading/blob/main/src/exchanges/etoro.py
//
// Critical defensive measures in this version:
//   1. cache: "no-store" on EVERY fetch — Next.js App Router caches by
//      default, which can return stale order/portfolio data on subsequent
//      polls. This is the most likely source of "phantom" position IDs.
//   2. Pre-flight available-cash check. eToro silently rejects later legs
//      if the basket total > available balance after pending orders.
//   3. Pure crypto.randomUUID() per request — eToro validates the UUID
//      hex shape and rejects malformed ones with HTTP 422.
//   4. Body uses the proven shape from the working reference:
//      { InstrumentID, IsBuy, Leverage: 1, Amount,
//        IsNoStopLoss: true, IsNoTakeProfit: true, IsTslEnabled: true }
//   5. Polling delays match the Python reference: [2s, 4s, 6s].
//   6. Position resolution checks isOpen, then cross-checks against
//      /trading/info/{env}/portfolio so the user sees the truth.
//   7. Every leg's request body and full response body are echoed back to
//      the client (via rawBody / rawRequest) so any silent failure can be
//      diagnosed by expanding the row in the UI.

export const runtime = "edge";

const API_BASE = "https://public-api.etoro.com/api/v1";
const TRADE_GAP_MS = 300;
const MIN_AMOUNT = 10;
const POSITION_POLL_DELAYS_MS = [2000, 4000, 6000];

type LegStatus = "filled" | "pending" | "queued" | "failed";

interface TradeRow {
  ticker: string;
  instrumentId: number;
  amount: number;
}

interface ResultRow {
  ticker: string;
  ok: boolean;
  status: LegStatus;
  orderId?: number;
  positionId?: number;
  isOpen?: boolean;
  rate?: number;
  units?: number;
  error?: string;
  // Full diagnostic echo of the eToro round-trip for this leg.
  rawStatus?: number;
  rawBody?: string;
  rawRequest?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function commonHeaders(apiKey: string, userKey: string): HeadersInit {
  return {
    "x-api-key": apiKey,
    "x-user-key": userKey,
    "x-request-id": crypto.randomUUID(),
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

// All fetches force fresh response — Next.js App Router default-caches GETs
// which can break per-order polling (returning a previous order's data).
const NO_CACHE: RequestInit = { cache: "no-store" };

interface PlaceOrderResult {
  status: number;
  bodyText: string;
  json: any;
  requestBody: string;
}

async function placeOrder(
  apiKey: string,
  userKey: string,
  env: "real" | "demo",
  instrumentId: number,
  amount: number,
): Promise<PlaceOrderResult> {
  const path = `/trading/execution/${env === "demo" ? "demo/" : ""}market-open-orders/by-amount`;
  const body = {
    InstrumentID: instrumentId,
    IsBuy: true,
    Leverage: 1,
    Amount: Math.round(amount * 100) / 100,
    IsNoStopLoss: true,
    IsNoTakeProfit: true,
    IsTslEnabled: true,
  };
  const requestBody = JSON.stringify(body);
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: commonHeaders(apiKey, userKey),
    body: requestBody,
    ...NO_CACHE,
  });
  const bodyText = await r.text();
  let json: any = {};
  try {
    json = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    /* keep {} */
  }
  return { status: r.status, bodyText, json, requestBody };
}

async function resolvePosition(
  apiKey: string,
  userKey: string,
  env: "real" | "demo",
  orderId: number,
): Promise<{
  positionId?: number;
  rate?: number;
  units?: number;
  isOpen?: boolean;
}> {
  const path = `/trading/info/${env === "demo" ? "demo/" : "real/"}orders/${orderId}`;
  for (const delay of POSITION_POLL_DELAYS_MS) {
    await sleep(delay);
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers: commonHeaders(apiKey, userKey),
        ...NO_CACHE,
      });
      if (r.status === 404) continue;
      if (!r.ok) continue;
      const j = (await r.json().catch(() => ({} as any))) as any;
      const positions = j?.positions ?? j?.Positions ?? [];
      if (Array.isArray(positions) && positions.length > 0) {
        const p = positions[0];
        const isOpen =
          typeof p?.isOpen === "boolean" ? p.isOpen :
          typeof p?.IsOpen === "boolean" ? p.IsOpen :
          undefined;
        return {
          positionId: p?.positionID ?? p?.PositionID ?? undefined,
          rate: p?.rate ?? p?.Rate ?? p?.openRate ?? p?.OpenRate ?? undefined,
          units: p?.units ?? p?.Units ?? undefined,
          isOpen,
        };
      }
    } catch {
      /* swallow and retry */
    }
  }
  return {};
}

interface PortfolioInfo {
  credit: number;             // available cash before any orders
  pendingTotal: number;       // sum of ordersForOpen + orders amounts
  positionIds: Set<number>;   // every positionID currently in the portfolio
  raw: any;                   // unparsed for diagnostics
}

async function fetchPortfolio(
  apiKey: string,
  userKey: string,
  env: "real" | "demo",
): Promise<PortfolioInfo> {
  const path = `/trading/info/${env === "demo" ? "demo/" : ""}portfolio`;
  try {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: commonHeaders(apiKey, userKey),
      ...NO_CACHE,
    });
    if (!r.ok) {
      return { credit: 0, pendingTotal: 0, positionIds: new Set(), raw: { status: r.status } };
    }
    const j = (await r.json().catch(() => ({}))) as any;
    const cp = j?.clientPortfolio ?? j?.ClientPortfolio ?? j ?? {};
    const credit = Number(cp?.credit ?? cp?.Credit ?? 0) || 0;
    const ordersForOpen: any[] = cp?.ordersForOpen ?? cp?.OrdersForOpen ?? [];
    const orders: any[] = cp?.orders ?? cp?.Orders ?? [];
    const pendingTotal =
      ordersForOpen.reduce((s, o) => s + (Number(o?.amount ?? o?.Amount) || 0), 0) +
      orders.reduce((s, o) => s + (Number(o?.amount ?? o?.Amount) || 0), 0);
    const positions: any[] = cp?.positions ?? cp?.Positions ?? [];
    const positionIds = new Set<number>();
    for (const p of positions) {
      const id = p?.positionID ?? p?.PositionID;
      if (typeof id === "number") positionIds.add(id);
    }
    const mirrors: any[] = cp?.mirrors ?? cp?.Mirrors ?? [];
    for (const m of mirrors) {
      const ms: any[] = m?.positions ?? m?.Positions ?? [];
      for (const p of ms) {
        const id = p?.positionID ?? p?.PositionID;
        if (typeof id === "number") positionIds.add(id);
      }
    }
    return { credit, pendingTotal, positionIds, raw: cp };
  } catch (e: any) {
    return { credit: 0, pendingTotal: 0, positionIds: new Set(), raw: { error: e?.message } };
  }
}

function extractOrderId(json: any): number | null {
  const ofo = json?.orderForOpen ?? json?.OrderForOpen ?? null;
  if (ofo) {
    const id = ofo?.orderID ?? ofo?.OrderID ?? ofo?.orderId ?? ofo?.OrderId;
    if (typeof id === "number" && id > 0) return id;
  }
  const flat = json?.orderID ?? json?.OrderID ?? json?.orderId ?? json?.OrderId;
  if (typeof flat === "number" && flat > 0) return flat;
  return null;
}

function bodyHasError(json: any): string | null {
  if (json == null) return null;
  if (json.Status === "Failed" || json.status === "Failed") {
    return json.Message ?? json.message ?? "eToro reported Status=Failed";
  }
  if (json.ErrorCode != null || json.errorCode != null) {
    return (
      json.Message ??
      json.message ??
      json.ErrorMessage ??
      `ErrorCode=${json.ErrorCode ?? json.errorCode}`
    );
  }
  if (
    typeof json.Message === "string" &&
    /error|fail|reject|denied|insufficient|exceed/i.test(json.Message)
  ) {
    return json.Message;
  }
  return null;
}

export async function POST(req: Request) {
  let body: {
    apiKey?: string;
    userKey?: string;
    env?: "real" | "demo";
    basket?: TradeRow[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request body" }, { status: 400 });
  }

  const apiKey = (body.apiKey ?? "").trim();
  const userKey = (body.userKey ?? "").trim();
  const env: "real" | "demo" = body.env === "real" ? "real" : "demo";
  const rows = Array.isArray(body.basket) ? body.basket : [];
  if (!apiKey || !userKey || rows.length === 0) {
    return Response.json({ error: "Missing keys or basket" }, { status: 400 });
  }

  // ---- PRE-FLIGHT: fetch portfolio, derive available cash --------------
  const beforePortfolio = await fetchPortfolio(apiKey, userKey, env);
  const availableCash = Math.max(0, beforePortfolio.credit - beforePortfolio.pendingTotal);
  const basketTotal = rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);

  // If we can already see the basket total exceeds available cash, return
  // a hard error before placing any orders. Better than partial fills.
  if (availableCash > 0 && basketTotal > availableCash + 0.01) {
    return Response.json({
      error: `Basket total $${basketTotal.toFixed(2)} exceeds available cash $${availableCash.toFixed(
        2,
      )}. Reduce basket amount or close pending orders first.`,
      env,
      availableCash,
      basketTotal,
    });
  }

  const results: ResultRow[] = [];

  // ---- PLACE ORDERS sequentially with a small gap ---------------------
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!Number.isFinite(row.amount) || row.amount < MIN_AMOUNT) {
      results.push({
        ticker: row.ticker,
        ok: false,
        status: "failed",
        error: `Below eToro minimum ($${row.amount.toFixed(2)} < $${MIN_AMOUNT})`,
      });
      continue;
    }

    if (i > 0) await sleep(TRADE_GAP_MS);

    try {
      const { status, bodyText, json, requestBody } = await placeOrder(
        apiKey,
        userKey,
        env,
        row.instrumentId,
        row.amount,
      );
      const orderId = extractOrderId(json);
      const errorMessage = bodyHasError(json);
      const accepted =
        status >= 200 && status < 300 &&
        typeof orderId === "number" &&
        errorMessage == null;

      const result: ResultRow = {
        ticker: row.ticker,
        ok: accepted,
        status: accepted ? "queued" : "failed",
        rawStatus: status,
        rawBody: bodyText.slice(0, 800),
        rawRequest: requestBody,
      };
      if (orderId != null) result.orderId = orderId;
      if (!accepted) {
        result.error =
          errorMessage ??
          json?.Message ?? json?.message ?? json?.ErrorMessage ?? json?.Error ??
          (status >= 200 && status < 300
            ? "eToro returned 200 with no orderID — open the row to see the body"
            : `HTTP ${status}`);
      }
      results.push(result);
    } catch (e: any) {
      results.push({
        ticker: row.ticker,
        ok: false,
        status: "failed",
        error: e?.message ?? "Network error",
      });
    }
  }

  // ---- RESOLVE per-order positions in parallel ------------------------
  const accepted = results.filter((r) => r.ok && r.orderId != null);
  if (accepted.length > 0) {
    await Promise.all(
      accepted.map(async (r) => {
        const pos = await resolvePosition(apiKey, userKey, env, r.orderId!);
        if (pos.positionId != null) r.positionId = pos.positionId;
        if (pos.rate != null) r.rate = pos.rate;
        if (pos.units != null) r.units = pos.units;
        if (pos.isOpen != null) r.isOpen = pos.isOpen;
        if (pos.positionId != null) {
          r.status = pos.isOpen === true ? "filled" : "pending";
        } else {
          r.status = "queued";
        }
      }),
    );
  }

  // ---- GROUND TRUTH: re-fetch portfolio, cross-check positions --------
  // We retry up to 3 times with growing gaps because eToro takes a
  // variable amount of time to commit a new position to the portfolio.
  // If the position never appears, the order was silently rejected
  // (most common cause: instrument not supported in the user's eToro
  // environment — e.g. Xetra-listed UCITS in demo mode).
  const VERIFY_DELAYS_MS = [3000, 4000, 5000];
  let afterPortfolio: PortfolioInfo = {
    credit: 0,
    pendingTotal: 0,
    positionIds: new Set(),
    raw: {},
  };
  const stillUnconfirmed = new Set(accepted.filter((r) => r.positionId != null).map((r) => r.positionId!));

  for (const delay of VERIFY_DELAYS_MS) {
    if (stillUnconfirmed.size === 0) break;
    await sleep(delay);
    afterPortfolio = await fetchPortfolio(apiKey, userKey, env);
    for (const id of Array.from(stillUnconfirmed)) {
      if (afterPortfolio.positionIds.has(id)) stillUnconfirmed.delete(id);
    }
  }

  for (const r of accepted) {
    if (r.positionId == null) {
      // Order accepted by eToro but no positionID ever returned.
      // This is itself a soft failure — the order didn't materialise.
      r.ok = false;
      r.status = "failed";
      r.error =
        "Order accepted by eToro but no position was created. " +
        "Most likely cause: instrument not tradeable in your eToro environment " +
        "(e.g. Xetra-listed UCITS in demo mode).";
      continue;
    }
    const inPortfolio = afterPortfolio.positionIds.has(r.positionId);
    if (inPortfolio) {
      // Confirmed in portfolio. Trust isOpen if we got it.
      if (r.isOpen === true) r.status = "filled";
      else r.status = "pending";
    } else {
      // We were given a positionID but after up to 12 s of polling it
      // never appeared in the live portfolio. eToro silently dropped it.
      r.ok = false;
      r.status = "failed";
      r.error =
        `Order placed (eToro returned position #${r.positionId}) but it never reached your portfolio. ` +
        "Most likely cause: the instrument isn't tradeable in your eToro environment " +
        "(e.g. Xetra-listed UCITS in demo mode, or instruments restricted by your regulated entity).";
    }
  }

  return Response.json({
    results,
    diagnostics: {
      env,
      availableCashBefore: availableCash,
      creditBefore: beforePortfolio.credit,
      pendingBefore: beforePortfolio.pendingTotal,
      basketTotal,
      portfolioPositionCountBefore: beforePortfolio.positionIds.size,
      portfolioPositionCountAfter: afterPortfolio.positionIds.size,
    },
  });
}
