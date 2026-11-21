# Rules

## Frontend Change Constraints
- Keep changes module-scoped to impacted routes/components whenever possible.
- Reuse existing patterns from nearby pages/components before introducing new abstractions.
- Avoid unrelated refactors while delivering a feature or bug fix.
- Respect existing provider tree and shared layout behavior in `src/app/layout.js`.

## Routing And UX Constraints
- Follow route conventions under `src/app/*` (page-based App Router structure).
- Preserve auth entry behavior across `src/middleware.js`, root page, and auth routes.
- Keep list/form density aligned with the existing data-heavy UI style.

## API Integration Constraints
- Use existing API utilities and calling patterns in the relevant module.
- Keep request/response handling consistent with existing error/loading UX.
- Do not change API contracts on frontend-only tasks without coordinated backend updates.

## Frontend Context Maintenance Policy (Mandatory)
- Any frontend enhancement, new route/feature, or behavior change must update `ai-context` in the same change set.
- Update mapping:
  - New page/section/route -> update `modules.md` and `entry-points.md`.
  - Changed user journey/UX behavior -> update `flows.md`.
  - Global provider/layout/middleware behavior change -> update `architecture.md`.
  - New standards or constraints -> update this `rules.md`.
- Keep context edits concise and section-scoped.

## Changes Summary Policy (Mandatory)
- After completing every change, enhancement, bug fix, or issue, record it in a date-wise file: `docs/changes/YYYY-MM-DD.md` (create/append) and link that date in the index `docs/CHANGES_SUMMARY.md`.
- Keep one short line per entry: **title** — what changed + why/impact + affected file(s); newest dates first in the index; append-only (never rewrite past date files).
- Keep it short and sweet. See `.cursor/rules/Changes-Summary.mdc`.
- Cross-repo work: log in the repo where the file changed and reference the other repo's date file.

## Task Startup Protocol
1. Read `ai-context/architecture.md`, `ai-context/modules.md`, `ai-context/flows.md`, and `ai-context/rules.md`.
2. Identify impacted frontend module and route(s).
3. Open only required source files for implementation.
