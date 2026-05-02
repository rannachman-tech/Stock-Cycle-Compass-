// Place a sequence of market-buy orders for a basket on eToro.
// Body: { apiKey, userKey, env: "real"|"demo", basket: [{ ticker, instrumentId, amount }] }
// Endpoint: /trading/execution/{demo/}market-open-orders/by-amount
// Body uses PascalCase: { InstrumentID, IsBuy, Leverage, Amount }
//
// IMPORTANT: eToro's trade endpoint enforces:
//   1. A per-account rate limit on trade execution (~1 req/s in practice).
//      Sending 4 trades in a tight loop within ~50 ms causes the 2nd-4th
//      to be silently 200'd with no OrderID. Fix: 1100 ms gap between calls.
//   2. The x-request-id header is used server-side for IDEMPOTENCY. Sending
//      the same ID twice → eToro returns the cached response of the first
//      request (no new order is placed). We must guarantee a fresh UUID per
//      call. crypto.randomUUID() is correct, but we also use Date.now() +
//      a counter as belt-and-braces against any runtime hoisting/caching.

export const runtime = "edge";

const API_BASE = "https://public-api.etoro.com/api/v1";
// Conservative gap between sequential trades. Empirically ~1 req/s is the
// throttling threshold on the trading endpoints. 1100 ms gives us margin.
const TRADE_GAP_MS = 1100;
// eToro per-instrument minimum order size — empirical, not documented.
const MIN_AMOUNT = 10;

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
  error?: string;
  // Echo of eToro's raw response for diagnostic visibility.
  // Kept compact — first 400 chars of the body.
  rawStatus?: number;
  rawBody?: string;
}

function freshRequestId(seq: number): string {
  // crypto.randomUUID() is the primary source. We salt it with seq + time
  // as belt-and-braces in case a runtime ever hoists/caches it.
  const u = crypto.randomUUID();
  const t = Date.now().toString(36);
  // Replace last 8 chars of UUID with seq + time to guarantee uniqueness
  // across the loop without breaking the UUID v4 shape.
  const tail = `${seq.toString(36).padStart(2, "0")}${t}`.slice(-8);
  return `${u.slice(0, -8)}${tail}`;
}

async function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
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
  const env = body.env === "real" ? "real" : "demo";
  const rows = Array.isArray(body.basket) ? body.basket : [];
  if (!apiKey || !userKey || rows.length === 0) {
    return Response.json({ error: "Missing keys or basket" }, { status: 400 });
  }

  const path = `/trading/execution/${env === "demo" ? "demo/" : ""}market-open-orders/by-amount`;

  const results: ResultRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Pre-flight: minimum amount
    if (!Number.isFinite(row.amount) || row.amount < MIN_AMOUNT) {
      results.push({
        ticker: row.ticker,
        ok: false,
        error: `Below eToro minimum ($${row.amount.toFixed(2)} < $${MIN_AMOUNT})`,
      });
      continue;
    }

    // Throttle gap — required to avoid eToro's silent rate limit on trades.
    // Skip the gap before the first request.
    if (i > 0) await sleep(TRADE_GAP_MS);

    const reqId = freshRequestId(i);
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "x-user-key": userKey,
          "x-request-id": reqId,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          InstrumentID: row.instrumentId,
          IsBuy: true,
          Leverage: 1,
          Amount: row.amount,
        }),
      });
      // Read body as text first so we can keep a diagnostic copy AND parse JSON.
      const bodyText = await r.text();
      let json: any = {};
      try { json = bodyText ? JSON.parse(bodyText) : {}; } catch { /* keep {} */ }

      // Per skill: execution responses return orderId; positionId comes later.
      // Both casings appear in the wild — handle all.
      const orderId =
        json?.OrderID ?? json?.orderId ?? json?.OrderId ?? json?.RequestID ?? json?.requestId ?? null;
      const positionId =
        json?.PositionID ?? json?.positionId ?? json?.PositionId ?? null;

      const erroredOnBody =
        json?.Status === "Failed" ||
        json?.status === "Failed" ||
        json?.Code != null ||
        json?.ErrorCode != null ||
        (typeof json?.Message === "string" &&
          /error|fail|reject|denied|not allowed|insufficient|min|exceed|throttl/i.test(json.Message));

      const haveAnyId =
        (typeof orderId === "number" && orderId > 0) ||
        (typeof positionId === "number" && positionId > 0);

      const ok = r.ok && haveAnyId && !erroredOnBody;

      const result: ResultRow = {
        ticker: row.ticker,
        ok,
        rawStatus: r.status,
        rawBody: bodyText.slice(0, 400),
      };
      if (typeof orderId === "number") result.orderId = orderId;
      if (typeof positionId === "number") result.positionId = positionId;
      if (!ok) {
        result.error =
          (json?.Message ?? json?.message ?? json?.ErrorMessage ?? json?.Error) ||
          (r.ok
            ? "eToro returned 200 but no order/position ID — likely throttled or duplicate request-id"
            : `HTTP ${r.status}`);
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

  return Response.json({ results });
}
