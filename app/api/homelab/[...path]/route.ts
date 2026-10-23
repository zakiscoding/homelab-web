import { NextRequest, NextResponse } from "next/server";
import { homelabConfig } from "@/lib/config";
import { homelabFetch, isAllowedHomelabPath } from "@/lib/homelab";

type Params = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, { params }: Params) {
  const { path } = await params;
  const joined = path.join("/");
  if (!isAllowedHomelabPath(joined)) {
    return NextResponse.json({ detail: "Path not allowed" }, { status: 403 });
  }

  const url = new URL(req.url);
  const query = url.search;
  const target = query ? `${joined}?${query.slice(1)}` : joined;

  const { apiKey } = homelabConfig();
  if (!apiKey) {
    return NextResponse.json(
      {
        detail:
          "HOMELAB_API_KEY is not set on the web container. Set API_KEY in homelab-services/.env and restart web.",
      },
      { status: 503 },
    );
  }

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const upstream = await homelabFetch(target, {
      method: req.method,
      body: body || undefined,
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") ?? "";
    if (!ct.includes("json") && text.trim()) {
      return NextResponse.json(
        { detail: text.slice(0, 500) || `Upstream HTTP ${upstream.status}` },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      );
    }
    return new NextResponse(text || "{}", {
      status: upstream.status,
      headers: {
        "content-type": ct.includes("json") ? ct : "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        detail: `Cannot reach homelab API (${target}): ${msg}`,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
