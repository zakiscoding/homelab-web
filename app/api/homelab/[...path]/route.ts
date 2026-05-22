import { NextRequest, NextResponse } from "next/server";
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

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  const upstream = await homelabFetch(target, {
    method: req.method,
    body: body || undefined,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
