# Architecture

## System Type
- Next.js App Router frontend for solar operations workflows.
- Single web app with route-based modules under `src/app/*`.

## Tech Stack
- Framework: Next.js 15 (App Router)
- UI: React 19
- Styling/UI libs: Tailwind CSS, MUI, Radix
- Data/API: Axios-based API calls to backend services
- Realtime: Socket.IO client for notifications

## Core Layers
- App shell and providers: `src/app/layout.js`
- Root route bootstrap/redirect: `src/app/page.js`
- Request middleware redirect logic: `src/middleware.js`
- Route modules/pages: `src/app/*`
- Shared components and context: `src/components/*`, `src/context/*`, `src/hooks/*`, `src/lib/*`

## App Runtime Flow
1. Middleware processes incoming route request and redirects `/` to auth entry.
2. Root layout mounts global providers (theme/providers/auth/notification).
3. Conditional layout wraps authenticated and non-auth pages.
4. Page modules render route-specific UI and call backend APIs.

## Cross-Cutting Concerns
- Authentication state is provided globally via auth context.
- Notification provider and floating widget are mounted globally.
- Shared layout and common components enforce consistent structure across modules.
