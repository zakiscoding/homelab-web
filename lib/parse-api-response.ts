/** Parse BFF / homelab responses; avoid SyntaxError when upstream returns HTML or plain text. */
export async function parseApiResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return {};
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    throw new Error(text.slice(0, 300) || `HTTP ${res.status}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(text.slice(0, 300) || `HTTP ${res.status}`);
  }
}

export function apiErrorDetail(
  data: unknown,
  res: Response,
  fallback: string,
): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (d != null) return JSON.stringify(d);
  }
  return fallback || res.statusText || `HTTP ${res.status}`;
}
