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

## Task Startup Protocol
1. Read `ai-context/architecture.md`, `ai-context/modules.md`, `ai-context/flows.md`, and `ai-context/rules.md`.
2. Identify impacted frontend module and route(s).
3. Open only required source files for implementation.
