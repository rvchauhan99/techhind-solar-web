# TechHind Solar Web — VPS deploy (HRMS)

**Scope:** Next.js on AIC Cloud VPS `178.92.120.191`, PM2 process `techhind-solar-web` → `127.0.0.1:3000`.

Public host: `https://solar.178.92.120.191.sslip.io/` (Caddy already configured).

App path: `/opt/techhind-solar/web/`

## Env on the VPS (create once, never commit)

`/opt/techhind-solar/web/.env.production` (and optional `.env.local`):

```bash
NEXT_PUBLIC_API_BASE_URL=https://api-solar.178.92.120.191.sslip.io/api
NEXT_PUBLIC_SITE_URL=https://solar.178.92.120.191.sslip.io
```

`npm run build` runs **on the VPS** so these values are baked into the client bundle.

## Deploy (local)

```bash
chmod +x deploy/vps/deploy.sh
SKIP_ENV_SYNC=1 ./deploy/vps/deploy.sh root@178.92.120.191
```

CI always sets `SKIP_ENV_SYNC=1` so remote `.env*` is never overwritten.

## CI/CD (GitHub Actions)

Workflow: [`.github/workflows/deploy-hrms.yml`](../../.github/workflows/deploy-hrms.yml)

**Triggers:** push to **`HRMS`** when web/deploy paths change; also **workflow_dispatch**.

### One-time: SSH deploy key

Same key as the API repo (or a dedicated Solar key). Public half on `root@178.92.120.191` `authorized_keys`.

### GitHub repo secrets / variables

Repo → **Settings → Secrets and variables → Actions** (`rvchauhan99/techhind-solar-web`)

| Name | Type | Notes |
|------|------|--------|
| `VULTR_SSH_PRIVATE_KEY` | **Secret** (required) | Private half authorized for `root@178.92.120.191` |
| `VULTR_HOST` | Variable (optional) | Defaults to `178.92.120.191` |
| `VULTR_USER` | Variable (optional) | Defaults to `root` |
| `VULTR_HEALTH_URL` | Variable (optional) | Defaults to `https://solar.178.92.120.191.sslip.io/auth/login` |

Do **not** put `NEXT_PUBLIC_*` in Actions — they stay on the VPS.

### Verify

```bash
curl -sSI https://solar.178.92.120.191.sslip.io/
# Location: https://solar.178.92.120.191.sslip.io/auth/login  (not localhost)

curl -sSI https://solar.178.92.120.191.sslip.io/auth/login
# HTTP/2 200
```

## Safety

- Rsync excludes all `.env*` and local `.next/`
- Does not touch Caddy or the API process
