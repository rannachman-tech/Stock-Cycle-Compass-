// Validate a manual eToro API key + private key pair.
// 1. /me with x-api-key + x-user-key + x-request-id
// 2. Read realCid (NOT gcid)
// 3. /user-info/people?cidList={realCid} — handle shape variations
// 4. Probe /trading/info/portfolio to detect demo vs real (200=real, 401/403=demo)

export const runtime = "edge";

const API_BASE = "https://public-api.etoro.com/api/v1";

function reqId() {
  // 1.0.0 ISO request id — eToro requires unique per call
  return crypto.randomUUID();
}

async function call(path: string, apiKey: string, userKey: string) {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: {
      "x-api-key": apiKey,
      "x-user-key": userKey,
      "x-request-id": reqId(),
      accept: "application/json",
    },
  });
  return r;
}

export async function POST(req: Request) {
  let body: { apiKey?: string; userKey?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Bad request body" }, { status: 400 });
  }
  const apiKey = (body.apiKey ?? "").trim();
  const userKey = (body.userKey ?? "").trim();
  if (!apiKey || !userKey) {
    return Response.json({ ok: false, error: "Missing keys" }, { status: 400 });
  }

  try {
    // /me
    const meRes = await call("/me", apiKey, userKey);
    if (!meRes.ok) {
      return Response.json(
        { ok: false, error: `eToro /me returned ${meRes.status}. Double-check both keys.` },
        { status: 200 },
      );
    }
    const me = await meRes.json() as any;
    const realCid: number | undefined = me?.realCid ?? me?.realCID ?? me?.realcid;
    if (!realCid) {
      return Response.json({ ok: false, error: "Could not read realCid from /me" }, { status: 200 });
    }

    // /user-info/people?cidList=...
    const pplRes = await call(`/user-info/people?cidList=${realCid}`, apiKey, userKey);
    if (!pplRes.ok) {
      return Response.json(
        { ok: false, error: `eToro /user-info/people returned ${pplRes.status}` },
        { status: 200 },
      );
    }
    const ppl = await pplRes.json() as any;
    const profile =
      (Array.isArray(ppl) ? ppl[0] : null) ??
      ppl?.users?.[0] ??
      ppl?.people?.[0] ??
      ppl?.data?.[0] ??
      ppl?.ppl?.[0] ??
      null;

    const username: string | undefined =
      profile?.username ?? profile?.userName ?? profile?.UserName ?? profile?.name;
    if (!username) {
      return Response.json({ ok: false, error: "Could not derive username from profile" }, { status: 200 });
    }

    // Probe portfolio to determine env
    const portfolioRes = await call("/trading/info/portfolio", apiKey, userKey);
    const detectedEnv: "real" | "demo" =
      portfolioRes.status === 200 ? "real" : "demo";

    return Response.json({
      ok: true,
      detectedEnv,
      profile: { username, cid: realCid },
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message ?? "Network error talking to eToro" },
      { status: 500 },
    );
  }
}
