"use client";

import { useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { RagIngestResult, RagQueryResult } from "@/lib/homelab";
import { apiErrorDetail, parseApiResponse } from "@/lib/parse-api-response";

type Tab = "ingest" | "query";

export default function RagPage() {
  const [tab, setTab] = useState<Tab>("query");
  const [model, setModel] = useState("llama3.2:latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestText, setIngestText] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [query, setQuery] = useState("");
  const [ingestResult, setIngestResult] = useState<RagIngestResult | null>(
    null,
  );
  const [queryResult, setQueryResult] = useState<RagQueryResult | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  async function refreshStatus() {
    const res = await fetch("/api/homelab/rag/status");
    if (res.ok) setStatus((await parseApiResponse(res)) as Record<string, unknown>);
  }

  async function onIngest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIngestResult(null);
    try {
      const res = await fetch("/api/homelab/rag/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: ingestText,
          source_id: sourceId || undefined,
          auto_embed: true,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(apiErrorDetail(data, res, "Ingest failed"));
      setIngestResult(data as RagIngestResult);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  }

  async function onQuery(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setQueryResult(null);
    try {
      const res = await fetch("/api/homelab/rag/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, model, top_k: 5 }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(apiErrorDetail(data, res, "Query failed"));
      setQueryResult(data as RagQueryResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell
      title="RAG"
      subtitle="Ingest text → worker embeds → query with citations"
    >
      <div className="mb-6 flex gap-2">
        {(["query", "ingest"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              tab === t
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refreshStatus()}
          className="ml-auto text-sm text-zinc-500 hover:text-zinc-300"
        >
          Refresh status
        </button>
      </div>

      {status ? (
        <Card className="mb-6">
          <pre className="overflow-x-auto text-xs text-zinc-400">
            {JSON.stringify(status, null, 2)}
          </pre>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-6 border-red-900/40 bg-red-950/20">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      ) : null}

      {tab === "ingest" ? (
        <form onSubmit={onIngest}>
          <Card>
            <Label>Source id (optional)</Label>
            <Input
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="notes/homelab"
            />
            <div className="mt-4">
              <Label>Text</Label>
              <Textarea
                rows={8}
                value={ingestText}
                onChange={(e) => setIngestText(e.target.value)}
                required
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Wait ~30–90s after ingest before querying so the iMac worker can
              embed.
            </p>
            <div className="mt-4">
              <Button type="submit" disabled={loading || !ingestText.trim()}>
                {loading ? "Submitting…" : "Ingest"}
              </Button>
            </div>
          </Card>
        </form>
      ) : (
        <form onSubmit={onQuery}>
          <Card>
            <Label>Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
            <div className="mt-4">
              <Label>Question</Label>
              <Textarea
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? "Searching…" : "Query"}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {ingestResult ? (
        <Card className="mt-6">
          <p className="text-sm text-zinc-300">
            Document{" "}
            <span className="font-mono text-emerald-400">
              {ingestResult.document_id}
            </span>
            {ingestResult.duplicate ? " (duplicate)" : ""}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            ingest job {ingestResult.ingest_job_id}
            {ingestResult.embed_job_id
              ? ` · embed ${ingestResult.embed_job_id}`
              : ""}
          </p>
        </Card>
      ) : null}

      {queryResult ? (
        <Card className="mt-6 space-y-4">
          {queryResult.reason ? (
            <p className="text-sm text-amber-300">{queryResult.reason}</p>
          ) : null}
          <div className="whitespace-pre-wrap text-sm text-zinc-100">
            {queryResult.answer ?? "No answer"}
          </div>
          {queryResult.citations?.length ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                Citations
              </p>
              <ul className="space-y-2">
                {queryResult.citations.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-zinc-950/80 p-3 font-mono text-xs text-zinc-400"
                  >
                    {JSON.stringify(c)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-zinc-600">
            {queryResult.model} · {queryResult.duration_ms} ms
            {queryResult.cached ? " · cached" : ""}
          </p>
        </Card>
      ) : null}
    </Shell>
  );
}
