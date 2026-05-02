// Place a sequence of market-buy orders for a basket on eToro.
// Body: { apiKey, userKey, env: "real"|"demo", basket: [{ ticker, instrumentId, amount }] }
// Endpoint: /trading/execution/{demo/}market-open-orders/by-amount
//
// IMPORTANT lessons learned the hard way:
//   1. x-request-id MUST be a valid UUID — eToro validates the hex shape and
//      returns 422 if any non-hex chars appear in the hex slots. Use
//      crypto.randomUUID() exactly, no salting / no hand-rolled tail bytes.
//   2. For cash-equity buys (ETFs / stocks without leverage), pass
//      IsNoStopLoss: true and IsNoTakeProfit: true. eToro's default is to
//      require a stop-loss; without one of those flags the order 422s.
//   3. Don't send Leverage on non-leveraged buys — let eToro default it.
//      Sending Leverage: 1 with no leverage product can fail validation.
//
// Body shape for a clean cash-equity buy:
//   { InstrumentID, IsBuy: true, Amount, IsNoStopLoss: true, IsNoTakeProfit: true }

export const runtime = "edge";

const API_BASE = "https://public-api.etoro.com/api/v1";
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

    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "x-user-key": userKey,
          // Pure UUID — eToro validates the hex shape. Do NOT salt this.
          "x-request-id": crypto.randomUUID(),
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          InstrumentID: row.instrumentId,
          IsBuy: true,
          // No Leverage field — let eToro default to non-leveraged for cash equity.
          Amount: Math.round(row.amount * 100) / 100,
          // Required for cash-equity buys without an explicit stop / take.
          IsNoStopLoss: true,
          IsNoTakeProfit: true,
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
            ? "eToro returned 200 but no order/position ID — open the row to see the body"
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
