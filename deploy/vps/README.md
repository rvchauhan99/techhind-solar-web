# TechHind Solar Web — VPS deploy (HRMS)

**Scope:** Next.js on Proxmox LXC `135.125.222.22` (SSH port **20130**), PM2 process `techhind-solar-web` → `127.0.0.1:3000`.

Public host: `https://hrms.ladat.in/` (Caddy on LXC `:80`, TLS on Proxmox host).

App path: `/opt/techhind-solar/web/`

## Env on the VPS (create once, never commit)

`/opt/techhind-solar/web/.env.production` (and optional `.env.local`):

```bash
NEXT_PUBLIC_API_BASE_URL=https://hrms.ladat.in/api
NEXT_PUBLIC_SITE_URL=https://hrms.ladat.in
```

`npm run build` runs **on the VPS** so these values are baked into the client bundle.

## Deploy (local)

```bash
chmod +x deploy/vps/deploy.sh
SKIP_ENV_SYNC=1 VULTR_SSH_PORT=20130 ./deploy/vps/deploy.sh root@135.125.222.22
```

CI always sets `SKIP_ENV_SYNC=1` so remote `.env*` is never overwritten.

## CI/CD (GitHub Actions)

Workflow: [`.github/workflows/deploy-hrms.yml`](../../.github/workflows/deploy-hrms.yml)

**Triggers:** push to **`HRMS`** when web/deploy paths change; also **workflow_dispatch**.

### One-time: SSH deploy key

Same key as the API repo. Public half on `root@135.125.222.22:20130` `authorized_keys`.

### GitHub repo secrets / variables

Repo → **Settings → Secrets and variables → Actions** (`rvchauhan99/techhind-solar-web`)

| Name | Type | Notes |
|------|------|--------|
| `VULTR_SSH_PRIVATE_KEY` | **Secret** (required) | Private half authorized for `root@135.125.222.22:20130` |
| `VULTR_HOST` | Variable (optional) | Defaults to `135.125.222.22` |
| `VULTR_SSH_PORT` | Variable (optional) | Defaults to `20130` |
| `VULTR_USER` | Variable (optional) | Defaults to `root` |
| `VULTR_HEALTH_URL` | Variable (optional) | Defaults to `https://hrms.ladat.in/auth/login` |

Do **not** put `NEXT_PUBLIC_*` in Actions — they stay on the VPS.

### Verify

```bash
ssh -p 20130 root@135.125.222.22 'curl -sSI http://127.0.0.1:3000/'
curl -sSI https://hrms.ladat.in/auth/login
```

## Safety

- Rsync excludes all `.env*` and local `.next/`
- Does not touch Caddy or the API process
