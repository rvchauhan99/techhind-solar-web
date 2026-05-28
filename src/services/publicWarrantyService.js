function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configured || typeof configured !== "string" || configured.trim() === "") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  let base = configured.trim().replace(/\/$/, "");

  // When opened from a phone on LAN (e.g. 192.168.x.x), localhost points at the phone — use dev machine IP.
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

/**
 * Public warranty card verification (no auth).
 * @param {string} token - Signed token from QR URL query param
 * @returns {Promise<{ status: boolean, message: string, result?: object }>}
 */
export async function verifyWarrantyCard(token) {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({ token: String(token || "").trim() });
  const res = await fetch(`${base}/public/warranty-card/verify?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Verification failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
