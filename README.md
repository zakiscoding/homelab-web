# homelab-web

Next.js UI for the homelab ML platform (chat, RAG, status). Talks to the iMac FastAPI through a **server-side proxy** so your API key never ships to the browser.

## Where to host

| Environment | Where | Why |
|-------------|-------|-----|
| **Development** | **Laptop (`cashh`)** — `npm run dev` on `:3000` | Fast iteration; API at iMac via Tailscale (`100.91.113.98`). |
| **Production (recommended)** | **iMac** — Docker service on **`:3080`** | Same LAN as API/Postgres; Grafana already uses **`:3000`**. |
| **Do not host on** | GPU PC | GPU is inference/training only. |
| **Optional later** | Caddy on iMac `:80` | Single URL: UI at `/`, API unchanged (or path-based split). |

```text
  Laptop (dev)                    iMac (prod)
  localhost:3000                  :3080 homelab-web
       │                               │
       └──────── Tailscale ────────────┤
                                       ├── :80  Caddy → API
                                       ├── :3000 Grafana
                                       └── api:8000 (compose network)
```

## Quick start (laptop)

```powershell
cd C:\Users\cashh\homelab-web
copy .env.local.example .env.local
# Edit .env.local — HOMELAB_API_KEY from homelab-services/.env on iMac
npm run dev
```

Open http://localhost:3000

## iMac deploy

`homelab-web` must be a **sibling** of `homelab-services` (compose build context `../homelab-web`).

```bash
cd ~/1tb-drive/homelab-services
./scripts/ensure-homelab-web.sh
source ./scripts/docker-1tb-env.sh
docker-compose up -d --build web
```

Open http://100.91.113.98:3080 (Tailscale).

## API proxy

Browser calls `/api/homelab/*` → Next route handler → FastAPI with `x-api-key`. Only public routes are allowed (no `/internal/*`).

## Pages

- **/** — health, GPU, system/RAG status
- **/chat** — `POST /chat`
- **/rag** — ingest, query, status

Grafana stays at http://100.91.113.98:3000

## Repo

Fourth repo alongside `homelab`, `homelab-services`, `homelab-gpu`. Push to GitHub when ready:

`git init` → `zakiscoding/homelab-web`
