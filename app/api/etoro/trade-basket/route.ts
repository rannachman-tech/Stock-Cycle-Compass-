// Place a sequence of market-buy orders for a basket on eToro.
// Body: { apiKey, userKey, env: "real"|"demo", basket: [{ ticker, instrumentId, amount }] }
//
// Verified against a working real-world implementation
// (https://github.com/oajm79/trading/blob/main/src/exchanges/etoro.py).
//
// Endpoint:
//   POST /trading/execution/{demo/}market-open-orders/by-amount
//
// Required body (PascalCase):
//   InstrumentID, IsBuy, Leverage, Amount
//   IsNoStopLoss, IsNoTakeProfit
//   IsTslEnabled
//
// Response shape on success:
//   { orderForOpen: { orderID: <number> } }
//   The orderID arrives immediately. The positionID is only available a
//   couple of seconds later via:
//     GET /trading/info/{env}/orders/{orderID}
//   which returns { positions: [{ positionID, rate, units, amount, ... }] }.
//
// Headers:
//   x-api-key, x-user-key, x-request-id (pure UUID, no salting),
//   Content-Type: application/json
//
// Throttle: ~300 ms gap between calls. eToro can handle bursts but a small
// gap matches the working reference and avoids edge-case rejections.

export const runtime = "edge";

const API_BASE = "https://public-api.etoro.com/api/v1";
const TRADE_GAP_MS = 300;
const MIN_AMOUNT = 10;
// How long to wait after each order before polling for position fill.
const POSITION_POLL_DELAYS_MS = [1500, 2500];

interface TradeRow {
  ticker: string;
  instrumentId: number;
  amount: number;
}

interface ResultRow {
  ticker: string;
  ok: boolean;
  orderId?: number;
  positionId?: number;
  rate?: number;
  units?: number;
  error?: string;
  // Echo of eToro's raw response for diagnostic visibility.
  rawStatus?: number;
  rawBody?: string;
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

// Place one market order. Returns the immediate order response.
async function placeOrder(
  apiKey: string,
  userKey: string,
  env: "real" | "demo",
  instrumentId: number,
  amount: number,
): Promise<{ status: number; bodyText: string; json: any }> {
  const path = `/trading/execution/${env === "demo" ? "demo/" : ""}market-open-orders/by-amount`;
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: commonHeaders(apiKey, userKey),
    body: JSON.stringify({
      InstrumentID: instrumentId,
      IsBuy: true,
      Leverage: 1,                       // Required even for cash equity.
      Amount: Math.round(amount * 100) / 100,
      IsNoStopLoss: true,                // We don't set a stop on basket buys.
      IsNoTakeProfit: true,              // Same for take-profit.
      IsTslEnabled: true,                // Trailing-stop infrastructure flag.
    }),
  });
  const bodyText = await r.text();
  let json: any = {};
  try { json = bodyText ? JSON.parse(bodyText) : {}; } catch { /* leave empty */ }
  return { status: r.status, bodyText, json };
}

// Optionally resolve positionID by polling the order detail endpoint.
// Best-effort — if it fails, we still return the orderID we already have.
async function resolvePosition(
  apiKey: string,
  userKey: string,
  env: "real" | "demo",
  orderId: number,
): Promise<{ positionId?: number; rate?: number; units?: number }> {
  const path = `/trading/info/${env === "demo" ? "demo/" : "real/"}orders/${orderId}`;
  for (const delay of POSITION_POLL_DELAYS_MS) {
    await sleep(delay);
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers: commonHeaders(apiKey, userKey),
      });
      if (!r.ok) continue;
      const j = await r.json().catch(() => ({} as any));
      const positions = j?.positions ?? j?.Positions ?? [];
      if (Array.isArray(positions) && positions.length > 0) {
        const p = positions[0];
        return {
          positionId: p?.positionID ?? p?.PositionID ?? undefined,
          rate: p?.rate ?? p?.Rate ?? undefined,
          units: p?.units ?? p?.Units ?? undefined,
        };
      }
    } catch {
      // swallow — keep retrying or fall through
    }
  }
  return {};
}

// Extract orderID from the eToro response.
// Working reference: resp.orderForOpen.orderID  (camelCase, nested)
// Defensive: handle other casings and a flat shape just in case.
function extractOrderId(json: any): number | null {
  const ofo = json?.orderForOpen ?? json?.OrderForOpen ?? null;
  if (ofo) {
    const id = ofo?.orderID ?? ofo?.OrderID ?? ofo?.orderId ?? ofo?.OrderId;
    if (typeof id === "number" && id > 0) return id;
  }
  // Fallback — flat shape
  const flat =
    json?.orderID ?? json?.OrderID ?? json?.orderId ?? json?.OrderId;
  if (typeof flat === "number" && flat > 0) return flat;
  return null;
}

// Detect explicit error in body, even on HTTP 200.
function bodyHasError(json: any): string | null {
  if (json == null) return null;
  if (json.Status === "Failed" || json.status === "Failed") {
    return json.Message ?? json.message ?? "eToro reported Status=Failed";
  }
  if (json.ErrorCode != null || json.errorCode != null) {
    return json.Message ?? json.message ?? json.ErrorMessage ?? `ErrorCode=${json.ErrorCode ?? json.errorCode}`;
  }
  if (typeof json.Message === "string" && /error|fail|reject|denied|insufficient/i.test(json.Message)) {
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

  const results: ResultRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Pre-flight
    if (!Number.isFinite(row.amount) || row.amount < MIN_AMOUNT) {
      results.push({
        ticker: row.ticker,
        ok: false,
        error: `Below eToro minimum ($${row.amount.toFixed(2)} < $${MIN_AMOUNT})`,
      });
      continue;
    }

    if (i > 0) await sleep(TRADE_GAP_MS);

    try {
      const { status, bodyText, json } = await placeOrder(
        apiKey,
        userKey,
        env,
        row.instrumentId,
        row.amount,
      );

      const orderId = extractOrderId(json);
      const errorMessage = bodyHasError(json);
      const ok =
        status >= 200 && status < 300 &&
        typeof orderId === "number" &&
        errorMessage == null;

      const result: ResultRow = {
        ticker: row.ticker,
        ok,
        rawStatus: status,
        rawBody: bodyText.slice(0, 500),
      };
      if (orderId != null) result.orderId = orderId;
      if (!ok) {
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
        error: e?.message ?? "Network error",
      });
    }
  }

  // Best-effort: resolve positionID for every successful order.
  // This is async and slow (~2s per order minimum), but it's what
  // turns the result UI from "Order #123" → "Filled #456 at $X / Y units".
  // We do it AFTER all orders are placed so the user gets the basket
  // committed first.
  const successes = results.filter((r) => r.ok && r.orderId != null);
  if (successes.length > 0) {
    await Promise.all(
      successes.map(async (r) => {
        const pos = await resolvePosition(apiKey, userKey, env, r.orderId!);
        if (pos.positionId != null) r.positionId = pos.positionId;
        if (pos.rate != null) r.rate = pos.rate;
        if (pos.units != null) r.units = pos.units;
      }),
    );
  }

  return Response.json({ results });
}
