import { Shell } from "@/components/shell";
import { Badge, Card } from "@/components/ui";
import { homelabFetch } from "@/lib/homelab";

async function loadStatus() {
  try {
    const [health, gpu, system] = await Promise.all([
      homelabFetch("health"),
      homelabFetch("health/gpu"),
      homelabFetch("system/status"),
    ]);
    return {
      health: health.ok ? await health.json() : null,
      gpu: gpu.ok ? await gpu.json() : null,
      system: system.ok ? await system.json() : null,
      error: null,
    };
  } catch (e) {
    return {
      health: null,
      gpu: null,
      system: null,
      error: e instanceof Error ? e.message : "Failed to reach API",
    };
  }
}

function StatusRow({ label, value }: { label: string; value: string }) {
  const ok =
    value === "ok" ||
    value === "healthy" ||
    value === "up" ||
    value === "reachable";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <Badge tone={ok ? "ok" : value === "unknown" ? "neutral" : "warn"}>
        {value}
      </Badge>
    </div>
  );
}

export default async function OverviewPage() {
  const { health, gpu, system, error } = await loadStatus();
  const sys = (system ?? {}) as Record<string, string | null | undefined>;

  return (
    <Shell
      title="Platform overview"
      subtitle="iMac API · GPU inference · RAG on Qdrant"
    >
      {error ? (
        <Card className="mb-6 border-amber-900/50 bg-amber-950/30">
          <p className="text-sm text-amber-200">
            Could not reach the homelab API. Check{" "}
            <code className="rounded bg-zinc-900 px-1">HOMELAB_API_URL</code> in{" "}
            <code className="rounded bg-zinc-900 px-1">.env.local</code> and that
            Tailscale is up.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-300/80">{error}</p>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">Services</h2>
          <StatusRow label="API" value={health?.status ?? "unknown"} />
          <StatusRow
            label="GPU (Ollama)"
            value={String((gpu as { gpu?: string })?.gpu ?? "unknown")}
          />
          <StatusRow label="Postgres" value={String(sys.postgres ?? "—")} />
          <StatusRow label="Redis" value={String(sys.redis ?? "—")} />
          <StatusRow label="Qdrant" value={String(sys.qdrant ?? "—")} />
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">RAG</h2>
          <p className="text-sm text-zinc-400">Active collection</p>
          <p className="mt-1 font-mono text-sm text-emerald-300/90">
            {sys.active_rag_collection ?? "—"}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/chat"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Open chat →
            </a>
            <a
              href="/rag"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Ingest & query →
            </a>
            <a
              href="http://100.91.113.98:3000"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-zinc-400 hover:text-zinc-300"
            >
              Grafana ↗
            </a>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
