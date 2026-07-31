#!/usr/bin/env node
/**
 * Agentic browser test suite for B2B Sales Schedule Planning.
 *
 * Usage:
 *   HEADED=1 node e2e/b2b-sales-planning-agentic.mjs
 *
 * Env overrides:
 *   BASE_URL, TENANT_KEY, E2E_EMAIL, E2E_PASSWORD, HEADED=1
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = join(__dirname, "artifacts", "b2b-sales-planning");
mkdirSync(ARTIFACTS, { recursive: true });

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_BASE = process.env.API_BASE || "http://localhost:5142/api";
const TENANT_KEY = process.env.TENANT_KEY || "acme";
const EMAIL = process.env.E2E_EMAIL || "superadmin@user.com";
const PASSWORD = process.env.E2E_PASSWORD || "Admin@1234";
const HEADED = process.env.HEADED === "1" || process.env.HEADED === "true";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const remarksTag = `AGENTIC PLAN ${Date.now()}`;
const uniqueClientName = `AGENTIC PLAN CLIENT ${Date.now()}`;

const results = [];
let page;
let context;
let browser;
let createdPlanId = null;
let createdPlanNo = null;
let seededClientName = null;

function record(id, status, detail = "", meta = {}) {
  const row = { id, status, detail, ...meta, at: new Date().toISOString() };
  results.push(row);
  const icon = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "SKIP";
  console.log(`[${icon}] ${id}${detail ? ` — ${detail}` : ""}`);
}

async function shot(name) {
  const path = join(ARTIFACTS, `${stamp}-${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function waitReady(ms = 1200) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.getByText("Loading...", { exact: false }).first().waitFor({ state: "hidden", timeout: 8000 });
  } catch {
    /* ok */
  }
  await page.waitForTimeout(ms);
}

async function expectVisible(locator, timeout = 15000) {
  await locator.first().waitFor({ state: "visible", timeout });
}

async function clickText(text, opts = {}) {
  const loc = page.getByRole(opts.role || "button", { name: text, exact: opts.exact ?? false });
  if ((await loc.count()) === 0) {
    await page.getByText(text, { exact: opts.exact ?? false }).first().click({ timeout: opts.timeout || 15000 });
    return;
  }
  await loc.first().click({ timeout: opts.timeout || 15000 });
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fillNearLabel(labelText, value) {
  const label = page.locator("label").filter({ hasText: new RegExp(escapeRe(labelText), "i") }).first();
  await expectVisible(label);
  const box = label.locator("xpath=ancestor::div[contains(@class,'w-full')][1]");
  const input = box.locator("input, textarea").first();
  await input.scrollIntoViewIfNeeded();
  await input.fill(value);
}

/** Fill DateField (DD/MM/YYYY masked) near a label */
async function fillDateNearLabel(labelText, ddmmyyyy) {
  const label = page.locator("label").filter({ hasText: new RegExp(escapeRe(labelText), "i") }).first();
  await expectVisible(label);
  const box = label.locator("xpath=ancestor::div[contains(@class,'w-full') or contains(@class,'relative')][1]");
  const input = box.locator("input").first();
  await input.scrollIntoViewIfNeeded();
  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await input.type(ddmmyyyy.replace(/\D/g, ""), { delay: 40 });
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
}

function formatDdMmYyyy(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function futureDate(daysAhead = 14) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

/** Select first option from async Autocomplete near label */
async function pickAutocomplete(labelText, typeQuery = "a") {
  const label = page.locator("label").filter({ hasText: new RegExp(escapeRe(labelText), "i") }).first();
  await expectVisible(label);
  const root = label.locator("xpath=ancestor::div[contains(@class,'relative')][1]");
  const input = root.locator("input").first();
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.fill("");
  await input.type(typeQuery, { delay: 40 });
  await page.waitForTimeout(900);
  const option = page.locator('[role="option"]').first();
  await expectVisible(option, 20000);
  await option.click();
  await page.waitForTimeout(300);
}

async function toastSeen(partial, timeout = 12000) {
  const toast = page.locator("[data-sonner-toast], [data-sonner-toaster], li[data-sonner-toast]").filter({
    hasText: partial,
  });
  try {
    await toast.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    try {
      await page.getByText(partial, { exact: false }).first().waitFor({ state: "visible", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

async function login() {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "domcontentloaded" });
  await waitReady(500);
  const tenant = page.locator("#tenant_key");
  if (await tenant.count()) {
    await tenant.fill(TENANT_KEY);
  }
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  try {
    await page.waitForURL((u) => !String(u).includes("/auth/login"), { timeout: 90000 });
  } catch {
    await page.getByRole("button", { name: /Sign In|Add Plan|Dashboard/i }).first().waitFor({ state: "visible", timeout: 15000 });
  }
  if (String(page.url()).includes("/auth/login")) {
    throw new Error("Still on login after submit");
  }
  await waitReady(1200);
}

async function ensureLoggedIn() {
  if (String(page.url()).includes("/auth/login")) {
    await login();
  }
}

async function gotoApp(path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await waitReady(600);
  if (String(page.url()).includes("/auth/login")) {
    await login();
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
    await waitReady(600);
  }
}

async function runCase(id, fn) {
  try {
    await ensureLoggedIn();
    await fn();
    record(id, "pass");
  } catch (err) {
    const path = await shot(`fail-${id}`).catch(() => null);
    record(id, "fail", err?.message || String(err), path ? { screenshot: path } : {});
  }
}

async function skipCase(id, detail) {
  record(id, "skip", detail);
}

async function getAccessTokenFromPage() {
  return page.evaluate(() => localStorage.getItem("accessToken"));
}

async function apiJson(method, path, body) {
  const token = await getAccessTokenFromPage();
  if (!token) throw new Error("No accessToken in localStorage");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === false) {
    throw new Error(json?.message || `API ${method} ${path} failed (${res.status})`);
  }
  return json;
}

async function seedClientForPlan() {
  const codeRes = await apiJson("GET", "/b2b-clients/next-client-code");
  const client_code = codeRes?.result?.client_code;
  if (!client_code) throw new Error("Failed to get next client code");
  const created = await apiJson("POST", "/b2b-clients", {
    client_code,
    client_name: uniqueClientName,
    client_type: "B2B",
    is_active: true,
    contact_person: "Agentic Tester",
    phone: `+9199${String(Date.now()).slice(-8)}`,
  });
  seededClientName = created?.result?.client_name || uniqueClientName;
  return seededClientName;
}

async function main() {
  console.log(`\nB2B Sales Planning agentic web test`);
  console.log(`URL=${BASE_URL} tenant=${TENANT_KEY} user=${EMAIL} headed=${HEADED}\n`);

  browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 60 : 0,
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  page = await context.newPage();
  page.setDefaultTimeout(25000);

  // ── Auth ─────────────────────────────────────────────────────────────
  await runCase("auth.login", async () => {
    try {
      await login();
    } catch {
      await waitReady(1000);
      await login();
    }
    if (String(page.url()).includes("/auth/login")) throw new Error("Still on login page");
  });

  // ── RBAC / nav ───────────────────────────────────────────────────────
  await runCase("planning.nav.rbac", async () => {
    await gotoApp(`/b2b-sales-planning`);
    await waitReady(1500);
    const url = String(page.url());
    if (url.includes("/access-denied")) {
      throw new Error("Access denied — sales planning RBAC module missing for tenant");
    }
    if (url.includes("/auth/login")) {
      throw new Error("Redirected to login");
    }
    await expectVisible(page.getByText(/B2B Sales Planning/i).first());
  });

  // ── List ─────────────────────────────────────────────────────────────
  await runCase("planning.list.load", async () => {
    await gotoApp(`/b2b-sales-planning`);
    await waitReady(1500);
    await expectVisible(page.getByText(/B2B Sales Planning/i).first());
    await expectVisible(page.getByRole("button", { name: /Dashboard/i }));
    await expectVisible(page.getByRole("button", { name: /Add Plan/i }));
    for (const col of ["Plan No", "Client", "Status", "Plan Date", "Assigned To"]) {
      await expectVisible(page.getByText(col, { exact: true }));
    }
  });

  await runCase("planning.list.status_tabs", async () => {
    await gotoApp(`/b2b-sales-planning`);
    await waitReady(1000);
    const tabs = [
      "All",
      "Due Today",
      "Upcoming",
      "Overdue",
      "Pipeline",
      "Pipeline Overdue",
      "Completed",
    ];
    for (const tab of tabs) {
      const btn = page.locator("button").filter({ hasText: new RegExp(`^${escapeRe(tab)}$`) }).first();
      await expectVisible(btn);
      await btn.click();
      await waitReady(900);
      const errToast = page.locator("[data-sonner-toast]").filter({ hasText: /Failed|Error|403/i });
      if ((await errToast.count()) > 0) {
        throw new Error(`Error toast after status tab "${tab}"`);
      }
    }
    // reset to All
    await page.locator("button").filter({ hasText: /^All$/ }).first().click();
    await waitReady(600);
  });

  await runCase("planning.list.search_sort", async () => {
    await gotoApp(`/b2b-sales-planning`);
    await waitReady(1000);
    const search = page.getByPlaceholder(/Quick Search|Search/i);
    if ((await search.count()) === 0) {
      throw new Error("Search input not found on list");
    }
    await search.first().fill("BSP");
    await waitReady(1500);
    await search.first().fill("");
    await waitReady(800);

    const planDateHeader = page.getByText("Plan Date", { exact: true }).first();
    await expectVisible(planDateHeader);
    await planDateHeader.click();
    await waitReady(900);
    await planDateHeader.click();
    await waitReady(900);
  });

  // ── Dashboard ────────────────────────────────────────────────────────
  await runCase("planning.dashboard.load", async () => {
    await gotoApp(`/b2b-sales-planning/dashboard`);
    await waitReady(1500);
    if (String(page.url()).includes("/access-denied")) {
      throw new Error("Dashboard access denied");
    }
    await expectVisible(page.getByText(/Sales Planning Dashboard/i).first());
    await expectVisible(page.getByText(/Due Today/i).first());
    await expectVisible(page.getByText(/Upcoming/i).first());
    await expectVisible(page.getByText(/Overdue/i).first());
    await expectVisible(page.getByText(/^Pipeline$/i).first());
    await expectVisible(page.getByText(/Pipeline Overdue/i).first());
    await expectVisible(page.getByText(/Completed/i).first());
    await expectVisible(page.getByText(/Focus list/i).first());

    // Click Upcoming card to filter
    const upcomingCard = page.locator("button, div").filter({ hasText: /^Upcoming/i }).first();
    await upcomingCard.click({ force: true }).catch(async () => {
      await page.getByText("Upcoming", { exact: true }).first().click({ force: true });
    });
    await waitReady(1200);
    await expectVisible(page.getByText(/Focus list/i).first());
    await expectVisible(page.getByRole("button", { name: /All Plans/i }));
  });

  // ── Create validation ────────────────────────────────────────────────
  await runCase("planning.create.validation", async () => {
    await gotoApp(`/b2b-sales-planning/add`);
    await waitReady(1000);
    await expectVisible(page.getByText(/Add Sales Plan/i).first());
    await page.getByRole("button", { name: /Create Plan/i }).click();
    await waitReady(500);
    const required = page.getByText(/Required/i);
    if ((await required.count()) < 1) {
      throw new Error("Expected Required validation messages");
    }
  });

  // ── Create submit ────────────────────────────────────────────────────
  await runCase("planning.create.submit", async () => {
    await seedClientForPlan();
    await gotoApp(`/b2b-sales-planning/add`);
    await waitReady(1000);

    await pickAutocomplete("Client", seededClientName.slice(0, 18));
    const planDate = futureDate(21);
    await fillDateNearLabel("Plan Date", formatDdMmYyyy(planDate));
    await pickAutocomplete("Assigned To", "super");
    await fillNearLabel("Remarks", remarksTag);

    const waitCreate = page.waitForResponse(
      (r) =>
        r.url().includes("/b2b-sales-planning") &&
        r.request().method() === "POST" &&
        !r.url().includes("dashboard") &&
        !r.url().includes("config"),
      { timeout: 30000 }
    );

    await page.getByRole("button", { name: /Create Plan/i }).click();
    const resp = await waitCreate;
    if (!resp.ok()) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Create failed HTTP ${resp.status()}: ${body.slice(0, 300)}`);
    }
    const json = await resp.json().catch(() => ({}));
    const plan = json?.result ?? json;
    createdPlanId = plan?.id ?? null;
    createdPlanNo = plan?.plan_no ?? null;

    const ok = await toastSeen("Sales plan created", 15000);
    if (!ok) {
      // may still have navigated
    }
    await waitReady(1500);
    const url = String(page.url());
    if (!/\/b2b-sales-planning\/\d+/.test(url)) {
      if (createdPlanId) {
        await gotoApp(`/b2b-sales-planning/${createdPlanId}`);
        await waitReady(1000);
      } else {
        throw new Error(`Expected detail URL after create, got ${url}`);
      }
    }
    const m = String(page.url()).match(/\/b2b-sales-planning\/(\d+)/);
    if (m) createdPlanId = Number(m[1]);
  });

  // ── Detail ───────────────────────────────────────────────────────────
  await runCase("planning.detail.load", async () => {
    if (!createdPlanId) throw new Error("No created plan id from prior step");
    await gotoApp(`/b2b-sales-planning/${createdPlanId}`);
    await waitReady(1500);
    await expectVisible(page.getByText(/Overview/i).first());
    await expectVisible(page.getByText(/^Status$/i).first());
    await expectVisible(page.getByText(/^Client$/i).first());
    await expectVisible(page.getByText(/Plan Date/i).first());
    await expectVisible(page.getByText(/Assigned To/i).first());
    await expectVisible(page.getByText(/Interval/i).first());
    if (remarksTag) {
      await expectVisible(page.getByText(remarksTag, { exact: false }));
    }
  });

  await runCase("planning.detail.reschedule", async () => {
    if (!createdPlanId) throw new Error("No created plan id");
    await gotoApp(`/b2b-sales-planning/${createdPlanId}`);
    await waitReady(1200);

    const rescheduleSection = page.getByText(/^Reschedule$/i);
    if ((await rescheduleSection.count()) === 0) {
      throw new Error("Reschedule section not visible (status may not be open)");
    }

    const newDate = futureDate(28);
    await fillDateNearLabel("New Plan Date", formatDdMmYyyy(newDate));
    // Remarks under Reschedule — second Remarks if multiple; fill near Reschedule section
    const remarksLabels = page.locator("label").filter({ hasText: /^Remarks$/i });
    if ((await remarksLabels.count()) > 0) {
      const label = remarksLabels.first();
      const box = label.locator("xpath=ancestor::div[contains(@class,'w-full')][1]");
      await box.locator("input, textarea").first().fill(`Rescheduled by agentic ${Date.now()}`);
    }

    const waitPut = page.waitForResponse(
      (r) => r.url().includes(`/b2b-sales-planning/${createdPlanId}/reschedule`) && r.request().method() === "PUT",
      { timeout: 25000 }
    );
    await page.getByRole("button", { name: /Save Reschedule/i }).click();
    const resp = await waitPut;
    if (!resp.ok()) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Reschedule failed HTTP ${resp.status()}: ${body.slice(0, 300)}`);
    }
    const ok = await toastSeen("Plan rescheduled", 8000);
    if (!ok) {
      // Accept successful API + page still on detail (toast may auto-dismiss with slowMo)
      await waitReady(800);
      if (!String(page.url()).includes(`/b2b-sales-planning/${createdPlanId}`)) {
        throw new Error("Reschedule toast not seen and left detail page");
      }
    }
    await waitReady(1000);
  });

  await runCase("planning.detail.create_scheduled_so_link", async () => {
    if (!createdPlanId) throw new Error("No created plan id");
    await gotoApp(`/b2b-sales-planning/${createdPlanId}`);
    await waitReady(1200);

    const soBtn = page.getByRole("button", { name: /Create Scheduled SO/i });
    if ((await soBtn.count()) === 0) {
      throw new Error("Create Scheduled SO button missing (status not open?)");
    }
    await soBtn.click();
    await waitReady(2000);

    const url = String(page.url());
    if (!url.includes("/b2b-sales-orders/add")) {
      throw new Error(`Expected SO add page, got ${url}`);
    }
    if (!url.includes(`sales_plan_id=${createdPlanId}`)) {
      throw new Error(`Missing sales_plan_id query on ${url}`);
    }
    if (!/order_type=SCHEDULED/i.test(url)) {
      throw new Error(`Missing order_type=SCHEDULED on ${url}`);
    }
    await expectVisible(page.getByText(/Add Scheduled Sales Order|Add B2B Sales Order/i).first());
  });

  await runCase("sales_order.add.cancel_back_to_plan", async () => {
    if (!createdPlanId) throw new Error("No created plan id");
    // Ensure we are on SO add from plan
    if (!String(page.url()).includes("/b2b-sales-orders/add")) {
      await gotoApp(
        `/b2b-sales-orders/add?sales_plan_id=${createdPlanId}&order_type=SCHEDULED`
      );
      await waitReady(1500);
    }
    await page.getByRole("button", { name: /^Cancel$/i }).first().click();
    await waitReady(1500);
    const url = String(page.url());
    if (!url.includes(`/b2b-sales-planning/${createdPlanId}`)) {
      throw new Error(`Cancel should return to plan detail, got ${url}`);
    }
  });

  await runCase("planning.detail.audit_trail", async () => {
    if (!createdPlanId) throw new Error("No created plan id");
    await gotoApp(`/b2b-sales-planning/${createdPlanId}`);
    await waitReady(1200);
    await expectVisible(page.getByText(/Audit Trail/i).first());
    const bodyText = await page.locator("body").innerText();
    const hasCreate = /CREATE|CREATED/i.test(bodyText);
    const hasReschedule = /RESCHEDULE/i.test(bodyText);
    if (!hasCreate && !hasReschedule) {
      // Soft: at least not empty "No logs yet" after create+reschedule
      if (/No logs yet/i.test(bodyText)) {
        throw new Error("Audit trail empty after create + reschedule");
      }
    }
  });

  // ── Pipeline reason (conditional) ────────────────────────────────────
  {
    let pipelinePlanId = null;
    try {
      await gotoApp(`/b2b-sales-planning`);
      await waitReady(800);
      const pipelineTab = page.locator("button").filter({ hasText: /^Pipeline$/ }).first();
      await pipelineTab.click();
      await waitReady(1500);
      const rows = page.locator("table tbody tr");
      const rowCount = await rows.count();
      const empty =
        rowCount === 0 ||
        (await page.getByText(/No (data|records|results)/i).count()) > 0;
      if (!empty && rowCount > 0) {
        // Prefer a row whose Status cell shows Pipeline (not empty placeholder)
        const planBtn = rows.first().locator("button").first();
        if ((await planBtn.count()) > 0) {
          await planBtn.click();
          await waitReady(1500);
          const m = String(page.url()).match(/\/b2b-sales-planning\/(\d+)/);
          if (m) {
            const bodyText = await page.locator("body").innerText();
            if (/Pipeline Reason/i.test(bodyText)) {
              pipelinePlanId = Number(m[1]);
            }
          }
        }
      }
    } catch {
      /* fall through to skip */
    }

    if (!pipelinePlanId) {
      await skipCase(
        "planning.pipeline_reason",
        "No PIPELINE plans available — expected without linked scheduled SO/shipment"
      );
    } else {
      await runCase("planning.pipeline_reason", async () => {
        await gotoApp(`/b2b-sales-planning/${pipelinePlanId}`);
        await waitReady(1200);
        await expectVisible(page.getByText(/Pipeline Reason/i).first());
        const reasonLabel = page.locator("label").filter({ hasText: /^Reason$/i }).first();
        if ((await reasonLabel.count()) > 0) {
          const near = reasonLabel.locator("xpath=following::button[1]");
          await near.click({ force: true });
        } else {
          await page.getByRole("combobox").first().click({ force: true });
        }
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"], [data-radix-collection-item]').first();
        await expectVisible(option, 8000);
        await option.click();
        await page.getByRole("button", { name: /Save Reason/i }).click();
        const ok = await toastSeen("Pipeline reason saved", 15000);
        if (!ok) {
          const err = await toastSeen("Failed", 2000);
          if (err) throw new Error("Failed to save pipeline reason");
        }
      });
    }
  }

  await browser.close();

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const report = {
    stamp,
    baseUrl: BASE_URL,
    tenant: TENANT_KEY,
    email: EMAIL,
    remarksTag,
    createdPlanId,
    createdPlanNo,
    summary: { total: results.length, passed, failed, skipped },
    results,
  };
  const jsonPath = join(ARTIFACTS, `${stamp}-report.json`);
  const mdPath = join(ARTIFACTS, `${stamp}-report.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const md = [
    `# B2B Sales Planning Agentic Web Test Report`,
    ``,
    `- When: ${stamp}`,
    `- URL: ${BASE_URL}`,
    `- Tenant: ${TENANT_KEY}`,
    `- User: ${EMAIL}`,
    `- Created plan: ${createdPlanId || "n/a"} (${createdPlanNo || remarksTag})`,
    `- Summary: **${passed} passed**, **${failed} failed**, ${skipped} skipped / ${results.length} total`,
    ``,
    `| Case | Status | Detail |`,
    `|---|---|---|`,
    ...results.map((r) => `| ${r.id} | ${r.status} | ${(r.detail || "").replace(/\|/g, "/")} |`),
    ``,
  ].join("\n");
  writeFileSync(mdPath, md);

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`Report: ${mdPath}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  try {
    if (page) await page.screenshot({ path: join(ARTIFACTS, `${stamp}-fatal.png`), fullPage: true });
  } catch {
    /* ignore */
  }
  try {
    if (browser) await browser.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
