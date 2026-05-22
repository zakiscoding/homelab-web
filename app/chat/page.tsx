"use client";

import { useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { ChatResult } from "@/lib/homelab";

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("llama3.2:latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/homelab/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? res.statusText);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="Chat" subtitle="Plain Ollama via homelab API (not RAG)">
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
