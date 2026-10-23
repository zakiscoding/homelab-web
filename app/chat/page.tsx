"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { ChatResult } from "@/lib/homelab";
import { apiErrorDetail, parseApiResponse } from "@/lib/parse-api-response";

const CHAT_TIMEOUT_MS = 120_000;

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("llama3.2:latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResult | null>(null);
  const [gpuOk, setGpuOk] = useState<boolean | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>(["llama3.2:latest"]);

  useEffect(() => {
    fetch("/api/homelab/health/gpu")
      .then(async (res) => {
        const data = (await parseApiResponse(res)) as { gpu?: string };
        setGpuOk(res.ok && data.gpu === "ok");
      })
      .catch(() => setGpuOk(false));

    fetch("/api/homelab/models")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await parseApiResponse(res)) as {
          models?: string[];
          homelab_models?: string[];
          default_chat_model?: string;
        };
        const names = data.models?.length ? data.models : ["llama3.2:latest"];
        setModelOptions(names);
        if (data.default_chat_model) setModel(data.default_chat_model);
      })
      .catch(() => {});
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
      const data = (await parseApiResponse(res)) as Record<string, unknown>;
      if (!res.ok) {
        const detail = apiErrorDetail(data, res, res.statusText);
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
      setResult(data as unknown as ChatResult);
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
            list="ollama-models"
          />
          <datalist id="ollama-models">
            {modelOptions.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {model.startsWith("homelab-") ? (
            <p className="mt-1 text-xs text-emerald-400/90">Using published LoRA model</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              Base Ollama model. After training, publish with{" "}
              <code className="rounded bg-zinc-900 px-1">publish-lora-to-ollama.ps1</code>{" "}
              then pick a <code className="rounded bg-zinc-900 px-1">homelab-*</code> tag.
            </p>
          )}
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
