#!/usr/bin/env node
/**
 * Capture platform handbook screenshots — supports actions, demo IDs, drawers, PDFs.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HANDBOOK_ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(__dirname, "screenshot-manifest.json");
const IDS_PATH = join(__dirname, "demo-ids.json");
const OUTPUT_DIR = join(HANDBOOK_ROOT, "assets", "screenshots");
const PDF_DIR = join(OUTPUT_DIR, "pdfs");
const COVERAGE_PATH = join(__dirname, "coverage-report.json");
const STORAGE_STATE_PATH = join(__dirname, "storageState.json");

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const baseUrl = process.env.DEMO_BASE_URL || manifest.baseUrl;
const defaultViewport = manifest.viewport || { width: 1920, height: 1080 };
const defaultWaitMs = manifest.defaultWaitMs || 2000;

let demoIds = {};
if (existsSync(IDS_PATH)) {
  demoIds = JSON.parse(readFileSync(IDS_PATH, "utf8"));
}

function getTenantKeyFromBaseUrl(url) {
  try {
    const host = new URL(url).hostname;
    const parts = host.split(".");
    if (parts.length >= 3 && parts[0] !== "www") return parts[0];
  } catch { /* ignore */ }
  return process.env.DEMO_TENANT_KEY || "";
}

function resolveRoute(route, entry) {
  if (entry.requiresId) {
    const id = demoIds[entry.requiresId];
    if (!id) return null;
  }
  return route.replace(/\{\{(\w+)\}\}/g, (_, key) => demoIds[key] || "");
}

function classifyResult(url, entry) {
  if (url.includes("/access-denied")) return "access_denied";
  if (entry.public && entry.route === "/auth/login") return "captured";
  if (url.includes("/auth/login") && !entry.route.includes("/auth/login")) return "auth_required";
  return "captured";
}

async function loginIfNeeded(page, base) {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) return false;
  await page.goto(`${base}/auth/login`, { waitUntil: "networkidle" });
  const tenantKey = getTenantKeyFromBaseUrl(base);
  if (tenantKey) {
    const tenantInput = page.locator("#tenant_key");
    if (await tenantInput.count()) await tenantInput.fill(tenantKey);
  }
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').first().click();
  try {
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 60000 });
  } catch {
    throw new Error("Login failed — check DEMO_EMAIL/DEMO_PASSWORD");
  }
  await page.waitForTimeout(2000);
  return true;
}

async function waitForPageReady(page, entry) {
  try {
    await page.getByText("Loading...", { exact: false }).waitFor({ state: "hidden", timeout: 15000 });
  } catch { /* ok */ }
  if (entry.waitSelector) {
    try {
      await page.waitForSelector(entry.waitSelector, { timeout: 20000 });
    } catch {
      await page.waitForSelector("body", { timeout: 5000 });
    }
  }
  await page.waitForTimeout(defaultWaitMs);
}

async function runActions(page, context, entry, actions = []) {
  for (const action of actions) {
    try {
      if (action.type === "wait") {
        await page.waitForTimeout(action.ms || 1000);
      } else if (action.type === "waitForSelector") {
        await page.waitForSelector(action.selector, { timeout: action.timeout || 15000 });
      } else if (action.type === "click") {
        const loc = page.locator(action.selector).first();
        if (await loc.count()) await loc.click({ timeout: 10000 });
        else if (!action.optional) throw new Error(`Click target not found: ${action.selector}`);
      } else if (action.type === "press") {
        await page.keyboard.press(action.key);
      } else if (action.type === "downloadPdf") {
        mkdirSync(PDF_DIR, { recursive: true });
        const savePath = join(OUTPUT_DIR, action.saveAs || "pdfs/download.pdf");
        const menuBtn = page.locator(action.menuSelector).first();
        if (await menuBtn.count()) {
          await menuBtn.click();
          const item = page.getByText(action.menuItemText || "PDF", { exact: false }).first();
          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
            item.click().catch(() => null),
          ]);
          if (download) {
            await download.saveAs(savePath);
            const pdfPage = await context.newPage();
            await pdfPage.goto(`file://${savePath}`, { waitUntil: "networkidle" }).catch(() => null);
            await pdfPage.screenshot({ path: savePath.replace(/\.pdf$/, ".png"), fullPage: false }).catch(() => null);
            await pdfPage.close();
          }
        }
      } else if (action.type === "screenshotPdfViewer") {
        const viewer = page.locator(action.selector).first();
        if (await viewer.count()) {
          const shotPath = join(OUTPUT_DIR, entry.filename);
          await viewer.screenshot({ path: shotPath }).catch(() => page.screenshot({ path: shotPath, fullPage: false }));
        }
      }
    } catch (err) {
      if (!action.optional) throw err;
    }
  }
}

async function captureScreenshot(page, context, entry) {
  const resolvedRoute = resolveRoute(entry.route, entry);
  if (!resolvedRoute) {
    return { ...entry, status: "skipped", error: `Missing demo id: ${entry.requiresId}` };
  }

  const outputPath = join(OUTPUT_DIR, entry.filename);
  mkdirSync(dirname(outputPath), { recursive: true });
  const vp = entry.viewport || defaultViewport;
  await page.setViewportSize(vp);

  try {
    await page.goto(`${baseUrl}${resolvedRoute}`, { waitUntil: "networkidle", timeout: 90000 });
    await waitForPageReady(page, entry);

    const currentUrl = page.url();
    let status = classifyResult(currentUrl, entry);
    if (status === "auth_required" && !entry.public) {
      return { ...entry, status, url: currentUrl, error: "Redirected to login" };
    }

    if (entry.actions?.length) {
      await runActions(page, context, entry, entry.actions);
    }

    const hasPdfViewerShot = entry.actions?.some((a) => a.type === "screenshotPdfViewer");
    if (!hasPdfViewerShot) {
      await page.screenshot({ path: outputPath, fullPage: entry.fullPage === true });
    }

    return { ...entry, status: "captured", url: currentUrl, outputPath, route: resolvedRoute };
  } catch (err) {
    return { ...entry, status: "failed", error: err.message, route: resolvedRoute };
  }
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(PDF_DIR, { recursive: true });

  if (!existsSync(IDS_PATH)) {
    console.log("demo-ids.json not found — run: node docs/platform-handbook/scripts/discover-demo-ids.mjs");
  }

  const browser = await chromium.launch({ headless: true });
  const contextOptions = { viewport: defaultViewport };
  if (existsSync(STORAGE_STATE_PATH)) contextOptions.storageState = STORAGE_STATE_PATH;
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  if (!existsSync(STORAGE_STATE_PATH)) {
    const loggedIn = await loginIfNeeded(page, baseUrl);
    if (loggedIn) await context.storageState({ path: STORAGE_STATE_PATH });
  } else {
    await page.goto(`${baseUrl}/home`, { waitUntil: "networkidle" });
    if (page.url().includes("/auth/login")) {
      const loggedIn = await loginIfNeeded(page, baseUrl);
      if (loggedIn) await context.storageState({ path: STORAGE_STATE_PATH });
    }
  }

  const results = [];
  for (const entry of manifest.screenshots) {
    const label = resolveRoute(entry.route, entry) || entry.route;
    process.stdout.write(`Capturing ${label} ... `);
    const result = await captureScreenshot(page, context, entry);
    results.push(result);
    console.log(result.status);
  }

  await browser.close();

  const summary = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    demoIds,
    total: results.length,
    captured: results.filter((r) => r.status === "captured").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    accessDenied: results.filter((r) => r.status === "access_denied").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };

  writeFileSync(COVERAGE_PATH, JSON.stringify(summary, null, 2));
  console.log(`\nCoverage: ${summary.captured}/${summary.total} captured, ${summary.skipped} skipped, ${summary.failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
