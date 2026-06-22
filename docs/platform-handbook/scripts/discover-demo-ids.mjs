#!/usr/bin/env node
/**
 * Discover record IDs via demo API (captured from network traffic).
 */
import { chromium } from "playwright";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDS_PATH = join(__dirname, "demo-ids.json");
const STORAGE_STATE_PATH = join(__dirname, "storageState.json");
const MANIFEST_PATH = join(__dirname, "screenshot-manifest.json");
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const baseUrl = process.env.DEMO_BASE_URL || manifest.baseUrl;

function getTenantKeyFromBaseUrl(url) {
  try {
    const host = new URL(url).hostname;
    const parts = host.split(".");
    if (parts.length >= 3 && parts[0] !== "www") return parts[0];
  } catch { /* ignore */ }
  return process.env.DEMO_TENANT_KEY || "";
}

async function ensureLogin(page, context, base) {
  if (existsSync(STORAGE_STATE_PATH)) {
    await page.goto(`${base}/home`, { waitUntil: "networkidle" });
    if (!page.url().includes("/auth/login")) return;
  }
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD");
  await page.goto(`${base}/auth/login`, { waitUntil: "networkidle" });
  const tenantKey = getTenantKeyFromBaseUrl(base);
  if (tenantKey) {
    const t = page.locator("#tenant_key");
    if (await t.count()) await t.fill(tenantKey);
  }
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/auth/login"), { timeout: 60000 });
  await page.waitForTimeout(2000);
  await context.storageState({ path: STORAGE_STATE_PATH });
}

async function discoverApiBase(page) {
  let apiBase = process.env.DEMO_API_BASE || null;
  if (!apiBase) {
    page.on("response", (r) => {
      const u = r.url();
      if (!apiBase && u.includes("/api/") && u.includes("inquiry")) {
        apiBase = u.split("/api/")[0] + "/api";
      }
    });
    await page.goto(`${baseUrl}/inquiry`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);
  }
  return apiBase;
}

async function fetchFirstId(page, apiBase, endpoint, idField = "id") {
  return page.evaluate(async ({ apiBase, endpoint, idField }) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      const rows = json?.result?.data || json?.result?.rows || json?.result || json?.data || [];
      const list = Array.isArray(rows) ? rows : rows?.items || [];
      if (list.length && list[0][idField]) return String(list[0][idField]);
      if (json?.result?.id) return String(json.result.id);
    } catch { /* ignore */ }
    return null;
  }, { apiBase, endpoint, idField });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const contextOptions = { viewport: { width: 1920, height: 1080 } };
  if (existsSync(STORAGE_STATE_PATH)) contextOptions.storageState = STORAGE_STATE_PATH;
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await ensureLogin(page, context, baseUrl);

  const apiBase = await discoverApiBase(page);
  if (!apiBase) throw new Error("Could not detect demo API base URL");

  const ids = {
    inquiryId: await fetchFirstId(page, apiBase, "/inquiry?limit=5&page=1"),
    marketingLeadId: await fetchFirstId(page, apiBase, "/marketing-leads?limit=5&page=1"),
    quotationId: await fetchFirstId(page, apiBase, "/quotation?limit=5&page=1"),
    pendingOrderId: await fetchFirstId(page, apiBase, "/order?limit=5&page=1&status=pending"),
    confirmOrderId: await fetchFirstId(page, apiBase, "/confirm-orders?limit=5&page=1"),
    b2bSalesOrderId: await fetchFirstId(page, apiBase, "/b2b-sales-orders?limit=5&page=1"),
    b2bInvoiceId: await fetchFirstId(page, apiBase, "/b2b-invoices?limit=5&page=1"),
    serviceTicketId: await fetchFirstId(page, apiBase, "/service-tickets?limit=5&page=1"),
  };

  writeFileSync(
    IDS_PATH,
    JSON.stringify({ discoveredAt: new Date().toISOString(), baseUrl, apiBase, ...ids }, null, 2)
  );
  await browser.close();
  console.log("demo-ids.json:", ids);
  Object.entries(ids).forEach(([k, v]) => { if (!v) console.warn(`  Missing: ${k}`); });
}

main().catch((err) => { console.error(err); process.exit(1); });
