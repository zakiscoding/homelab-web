"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { ChatResult } from "@/lib/homelab";

const CHAT_TIMEOUT_MS = 120_000;

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("llama3.2:latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResult | null>(null);
  const [gpuOk, setGpuOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/homelab/health/gpu")
      .then(async (res) => {
        if (!res.ok) throw new Error("gpu down");
        const data = await res.json();
        setGpuOk(data.gpu === "ok");
      })
      .catch(() => setGpuOk(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/homelab/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, model }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail ?? res.statusText);
        if (res.status === 503 && detail.includes("gpu_busy")) {
          throw new Error("GPU is busy (training job). Stop training or wait, then retry.");
        }
        if (res.status === 502) {
          throw new Error(
            "GPU Ollama unreachable. On zak_pc run: homelab-gpu/scripts/start-ollama.ps1",
          );
        }
        throw new Error(detail);
      }
      setResult(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(
          "Timed out after 2 minutes. Is Ollama running on the GPU PC (port 11434)?",
        );
      } else {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  return (
    <Shell title="Chat" subtitle="Plain Ollama via homelab API (not RAG)">
      {gpuOk === false ? (
        <Card className="mb-6 border-amber-900/50 bg-amber-950/30">
          <p className="text-sm text-amber-200">
            GPU Ollama is not reachable. On the GPU PC run{" "}
            <code className="rounded bg-zinc-900 px-1">
              .\scripts\start-ollama.ps1
            </code>{" "}
            then refresh this page.
          </p>
        </Card>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <Label>Model</Label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="llama3.2:latest"
          />
          <div className="mt-4">
            <Label>Prompt</Label>
            <Textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything…"
              required
            />
          </div>
          <div className="mt-4">
            <Button type="submit" disabled={loading || !prompt.trim()}>
              {loading ? "Thinking…" : "Send"}
            </Button>
          </div>
        </Card>
      </form>

      {error ? (
        <Card className="mt-6 border-red-900/40 bg-red-950/20">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      ) : null}

      {result ? (
        <Card className="mt-6">
          <p className="text-xs text-zinc-500">
            {result.model} · {result.duration_ms} ms
            {result.job_id ? ` · job ${result.job_id}` : ""}
          </p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
            {result.response}
          </div>
        </Card>
      ) : null}
    </Shell>
  );
}
