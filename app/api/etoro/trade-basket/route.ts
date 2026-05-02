// Place a sequence of market-buy orders for a basket on eToro.
// Body: { apiKey, userKey, env: "real"|"demo", basket: [{ ticker, instrumentId, amount }] }
// Endpoint: /trading/execution/{demo/}market-open-orders/by-amount
// Body uses PascalCase: { InstrumentID, IsBuy, Leverage, Amount }

export const runtime = "edge";

const API_BASE = "https://public-api.etoro.com/api/v1";

interface TradeRow {
  ticker: string;
  instrumentId: number;
  amount: number;
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

  const results: Array<{ ticker: string; ok: boolean; positionId?: number; error?: string }> = [];

  for (const row of rows) {
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "x-user-key": userKey,
          "x-request-id": crypto.randomUUID(),
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
      const json = (await r.json().catch(() => ({}))) as any;
      if (r.ok) {
        results.push({
          ticker: row.ticker,
          ok: true,
          positionId: json.PositionID ?? json.positionId ?? json.PositionId ?? undefined,
        });
      } else {
        results.push({
          ticker: row.ticker,
          ok: false,
          error: json?.Message ?? json?.message ?? `HTTP ${r.status}`,
        });
      }
    } catch (e: any) {
      results.push({ ticker: row.ticker, ok: false, error: e?.message ?? "Network error" });
    }
  }

  return Response.json({ results });
}
