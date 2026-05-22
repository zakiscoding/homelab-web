import { homelabConfig } from "./config";

const ALLOWED_PREFIXES = [
  "chat",
  "rag/",
  "system/",
  "health",
  "stats",
  "jobs",
] as const;

export function isAllowedHomelabPath(path: string): boolean {
  const p = path.replace(/^\/+/, "");
  if (p.startsWith("internal/")) return false;
  return ALLOWED_PREFIXES.some(
    (prefix) => p === prefix.replace(/\/$/, "") || p.startsWith(prefix),
  );
}

export async function homelabFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { baseUrl, apiKey } = homelabConfig();
  const url = `${baseUrl}/${path.replace(/^\/+/, "")}`;
  const headers = new Headers(init?.headers);
  if (apiKey) headers.set("x-api-key", apiKey);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(url, { ...init, headers, cache: "no-store" });
}

export type SystemStatus = {
  postgres?: string;
  redis?: string;
  qdrant?: string;
  gpu?: string;
  active_rag_collection?: string | null;
  [key: string]: unknown;
};

export type ChatResult = {
  model: string;
  response: string;
  duration_ms: number;
  job_id?: string | null;
};

export type RagIngestResult = {
  document_id: string;
  ingest_job_id: string;
  embed_job_id?: string | null;
  duplicate: boolean;
};

export type RagQueryResult = {
  answer: string | null;
  reason?: string | null;
  citations: Array<Record<string, unknown>>;
  model: string;
  duration_ms: number;
  job_id?: string | null;
  cached?: boolean;
};
