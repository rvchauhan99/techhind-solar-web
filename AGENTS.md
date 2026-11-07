# AGENTS.md — techhind-solar-web

**TechHind Solar Web** — Next.js SaaS CRM UI for TechHind Solar.

**Workspace root:** `/Users/ravatrajsinhchauhan/Documents/Programs/techHind/techhind-solar-web`  
**PMB / graph project key:** `techHind`  
**Umbrella:** `/Users/ravatrajsinhchauhan/Documents/Programs/techHind`

**Last synced:** 2026-11-08 — AGENTS + UI-UX-Strict + HRMS GATE §4; global `pmb-shared-mandatory`.

## Sibling repos

| Surface | Path |
|---------|------|
| API | `techHind/techhind-solar-api` |
| Web (this) | `techHind/techhind-solar-web` |
| Mobile | `techHind/techhind-Solar-APP` |
| HRMS reference | `techHind/solarace-crm` |

## Mandatory skills / rules

1. `~/.cursor/skills/techhind-delivery-qa/SKILL.md` (+ `reference/web-conventions.md`, `reference/web-qa.md`)
2. `~/.cursor/skills/agent360-web-qa/SKILL.md` — Browser MCP ≤5 before Done on UI work
3. `~/.cursor/skills/playwright-frontend/SKILL.md` (pointer; Playwright not required for Done)
4. Global: `pmb-shared-mandatory`, `techhind-ui-ux-strict`, `playwright-frontend`, `build-testing-after-tasks`, `techhind-localhost-only`
5. Repo: `.cursor/rules/UI-UX-Strict.mdc`, `Development-Delivery-Standards.mdc`, `HRMS-Market-Standard-Enhancements.mdc` when HRMS

## Local

| Service | URL |
|---------|-----|
| Web | `http://localhost:3000` (or `http://localhost:<port>` if busy) |
| API | `http://localhost:5142/api` |

Never use `127.0.0.1` for host browser/curl. Credentials: delivery-qa `local-credentials.md` (tenant `acme`).

## UI kit

Clone sibling CRM screens. Prefer `@/components/common` (`ListingPageContainer`, `AddEditPageShell`, `FormField`, `PaginatedTable`, …). No one-off prototype forms.

## Hard stops

- Same `solar_registry` / local API only
- UI Done requires Browser MCP evidence line (or interactive fallback if MCP unavailable)
- Do not invent UI past TechHind skills/rules
