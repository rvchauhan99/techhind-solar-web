import { NextResponse } from "next/server";

/**
 * Behind Caddy/nginx, request.url can be https://localhost:3000/...
 * Prefer X-Forwarded-* / public site URL so redirects never send users to loopback.
 */
function getPublicOrigin(request) {
  const forwardedHost = (request.headers.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const hostHeader = (request.headers.get("host") || "").split(",")[0].trim();
  const host = forwardedHost || hostHeader;
  const isLoopback =
    !host ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");

  if (isLoopback) {
    const fallback = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      ""
    ).trim().replace(/\/$/, "");
    if (fallback) return fallback;
  }

  const proto = (
    request.headers.get("x-forwarded-proto") ||
    request.nextUrl.protocol.replace(":", "") ||
    "https"
  )
    .split(",")[0]
    .trim();

  return `${proto}://${host}`;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/auth");
  const isVerifyRoute = pathname.startsWith("/verify");

  if (isAuthRoute || isVerifyRoute) return NextResponse.next();

  if (pathname === "/") {
    return NextResponse.redirect(`${getPublicOrigin(request)}/auth/login`);
  }

  return NextResponse.next();
}
