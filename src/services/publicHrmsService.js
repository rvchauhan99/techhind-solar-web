import { getEffectiveTenantKey } from "@/utils/tenantKey";

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configured || typeof configured !== "string" || configured.trim() === "") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  let base = configured.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const pageHost = window.location.hostname;
    const isPageLocal =
      pageHost === "localhost" || pageHost === "127.0.0.1" || pageHost === "[::1]";
    if (!isPageLocal) {
      try {
        const apiUrl = new URL(base);
        const isApiLocal =
          apiUrl.hostname === "localhost" ||
          apiUrl.hostname === "127.0.0.1" ||
          apiUrl.hostname === "[::1]";
        if (isApiLocal) {
          apiUrl.hostname = pageHost;
          base = apiUrl.toString().replace(/\/$/, "");
        }
      } catch {
        // keep configured base
      }
    }
  }

  return base;
}

function tenantHeaders({ json = false } = {}) {
  const key = getEffectiveTenantKey() || "acme";
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    "x-tenant-key": key,
  };
}

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function listPublicPositions() {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/public/hrms/positions`, {
    method: "GET",
    headers: tenantHeaders(),
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function submitPublicApplication(payload) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/public/hrms/apply`, {
    method: "POST",
    headers: tenantHeaders({ json: true }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function getPublicInterviewForm(token) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/public/hrms/interview-form/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: tenantHeaders(),
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function submitPublicInterviewForm(token, payload) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/public/hrms/interview-form/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: tenantHeaders({ json: true }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResponse(res);
}
