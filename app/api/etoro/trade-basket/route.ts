// Place a sequence of market-buy orders for a basket on eToro.
// Body: { apiKey, userKey, env: "real"|"demo", basket: [{ ticker, instrumentId, amount }] }
//
// Verified against the working Python reference at
// https://github.com/oajm79/trading/blob/main/src/exchanges/etoro.py
//
// Success rule: if eToro returns an orderID, the order is in eToro's system.
// We don't do post-placement portfolio cross-checks — they have too many
// false negatives (positions can take a long time to appear, especially for
// UCITS / non-US listings or after-hours).
//
// Body shape (PascalCase):
//   { InstrumentID, IsBuy: true, Leverage: 1, Amount,
//     IsNoStopLoss: true, IsNoTakeProfit: true, IsTslEnabled: true }

export const runtime = "edge";

const API_BASE = "https://public-api.etoro.com/api/v1";
const TRADE_GAP_MS = 300;
const MIN_AMOUNT = 10;

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
  error?: string;
  // Raw eToro round-trip echoed back so failed rows can be inspected.
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

  const results: ResultRow[] = [];

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
        // eToro accepted the order — that's success. We keep "queued" as
        // the sole non-failed status to convey "in eToro's system, will
        // settle on its own clock". The UI just renders a green check.
        status: accepted ? "queued" : "failed",
        rawStatus: status,
        rawBody: bodyText.slice(0, 500),
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

  return Response.json({ results });
}
