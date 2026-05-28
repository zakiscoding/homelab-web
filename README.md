# homelab-web

Next.js UI for the homelab ML platform (chat, RAG, reactions, status). Talks to the iMac FastAPI through a **server-side proxy** so your API key never ships to the browser.

| | |
|--|--|
| **GitHub** | [github.com/zakiscoding/homelab-web](https://github.com/zakiscoding/homelab-web) (private) |
| **Docs** | [homelab/docs/services/web-ui.md](https://github.com/zakiscoding/homelab/blob/main/docs/services/web-ui.md) |

## Where to host

| Environment | Where | URL |
|-------------|-------|-----|
| **Development** | Laptop (`cashh`) | http://localhost:3000 |
| **Production** | iMac Docker | http://100.91.113.98:3081 or http://100.91.113.98/ |
| **Do not host on** | GPU PC | Inference/training only |

```text
  Browser ──► homelab-web (iMac :3081 or Caddy :80)
                  │
                  │  /api/homelab/*  (BFF + API_KEY server-side)
                  ▼
             iMac FastAPI (internal)
                  ├── Ollama :11434 (chat/RAG)
                  └── Reaction serve :8100 (vision)
```

Grafana stays on **http://100.91.113.98:3000** (separate port).

## Quick start (laptop)

```powershell
git clone https://github.com/zakiscoding/homelab-web.git C:\Users\cashh\homelab-web
cd C:\Users\cashh\homelab-web
copy .env.local.example .env.local
# HOMELAB_API_KEY = API_KEY from iMac homelab-services/.env
npm install
npm run dev
```

## iMac deploy

`homelab-web` must be a **sibling** of `homelab-services`:

```text
~/1tb-drive/
  homelab-services/
  homelab-web/
```

```bash
cd ~/1tb-drive/homelab-services
git pull
./scripts/ensure-homelab-web.sh
source ./scripts/docker-1tb-env.sh
./scripts/render-caddyfile.sh
docker-compose up -d --build web caddy
```

## API proxy

Browser → `/api/homelab/*` → Next route handler → FastAPI with `x-api-key`. Internal worker routes are blocked.

## Pages

| Path | Backend |
|------|---------|
| `/` | Health, GPU, system status |
| `/chat` | `POST /chat` |
| `/rag` | Ingest, query, status |
| `/reactions` | `GET /vision/status`, `POST /vision/reaction` |

## GPU prerequisites

**Chat / RAG** — Ollama on the GPU PC:

```powershell
curl.exe http://100.88.71.33:11434/api/tags
schtasks /Run /TN HomelabOllamaServe   # on zak_pc
```

**Reactions** — reaction serve on `:8100` (see [homelab vision-reactions](https://github.com/zakiscoding/homelab/blob/main/docs/services/vision-reactions.md)).

## Chat UX

- GPU health banner on `/chat`
- 2-minute client timeout
- Clearer 502 when Ollama is unreachable

## Related repos

- [homelab-services](https://github.com/zakiscoding/homelab-services) — API, compose `web` service
- [homelab](https://github.com/zakiscoding/homelab) — architecture and runbooks
- [homelab-gpu](https://github.com/zakiscoding/homelab-gpu) — training + Ollama scripts
