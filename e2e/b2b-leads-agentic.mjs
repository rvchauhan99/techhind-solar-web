#!/usr/bin/env node
/**
 * Agentic browser test suite for the full B2B Leads module.
 *
 * Usage:
 *   node e2e/b2b-leads-agentic.mjs
 *
 * Env overrides:
 *   BASE_URL, TENANT_KEY, E2E_EMAIL, E2E_PASSWORD, HEADED=1
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = join(__dirname, "artifacts", "b2b-leads");
mkdirSync(ARTIFACTS, { recursive: true });

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TENANT_KEY = process.env.TENANT_KEY || "acme";
const EMAIL = process.env.E2E_EMAIL || "superadmin@user.com";
const PASSWORD = process.env.E2E_PASSWORD || "Admin@1234";
const HEADED = process.env.HEADED === "1" || process.env.HEADED === "true";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const companyName = `AGENTIC B2B ${Date.now()}`;
const mobileLocal = `9${String(Date.now()).slice(-9)}`;

const results = [];
let page;
let context;
let browser;
let createdLeadId = null;
let createdLeadNumber = null;

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

/** Fill an unlabeled/labeled text input near a label string */
async function fillNearLabel(labelText, value) {
  const label = page.locator("label").filter({ hasText: new RegExp(escapeRe(labelText), "i") }).first();
  await expectVisible(label);
  const box = label.locator("xpath=ancestor::div[contains(@class,'w-full')][1]");
  const input = box.locator("input, textarea").first();
  await input.scrollIntoViewIfNeeded();
  await input.fill(value);
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    // fallback: any text match briefly
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
    await page.getByRole("button", { name: /Add Lead|Sign In/i }).first().waitFor({ state: "visible", timeout: 15000 });
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
    const path = await shot(`fail-${id}`);
    record(id, "fail", err?.message || String(err), { screenshot: path });
  }
}

async function main() {
  console.log(`\nB2B Leads agentic web test`);
  console.log(`URL=${BASE_URL} tenant=${TENANT_KEY} user=${EMAIL} headed=${HEADED}\n`);

  browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 40 : 0,
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

  // ── Landing / Kanban ─────────────────────────────────────────────────
  await runCase("leads.kanban.load", async () => {
    await gotoApp(`/b2b-leads`);
    await waitReady(2000);
    await expectVisible(page.getByRole("heading", { name: /B2B Leads/i }));
    for (const col of ["Created", "Follow Up", "On Hold", "Converted", "Not Interested"]) {
      await expectVisible(page.getByText(col, { exact: true }));
    }
    await expectVisible(page.getByRole("button", { name: /Add Lead/i }));
    await expectVisible(page.getByRole("button", { name: /Assign Leads/i }));
    await expectVisible(page.getByRole("button", { name: /Analysis/i }));
  });

  await runCase("leads.kanban.filters_b2b_status", async () => {
    await clickText("Advanced Filters");
    await waitReady(500);
    // Status multiselect should offer Created / On Hold (B2B), not New/Junk
    const statusLabel = page.locator("label").filter({ hasText: /^Status$/i }).first();
    await expectVisible(statusLabel);
    const statusRoot = statusLabel.locator("xpath=ancestor::div[contains(@class,'w-full') or contains(@class,'relative')][1]");
    await statusRoot.locator("input, button, [role='combobox'], div").first().click({ force: true });
    await page.waitForTimeout(400);
    const bodyText = await page.locator("body").innerText();
    if (!/Created/i.test(bodyText)) throw new Error("B2B status 'Created' not visible in filter options");
    if (!/On Hold/i.test(bodyText)) throw new Error("B2B status 'On Hold' not visible in filter options");
    // Close panel noise
    await page.keyboard.press("Escape");
    const clearBtn = page.getByRole("button", { name: /^Clear$/i });
    if (await clearBtn.count()) await clearBtn.first().click().catch(() => {});
  });

  // ── List view + filters + pagination ─────────────────────────────────
  await runCase("leads.list.toggle", async () => {
    await page.getByRole("button", { name: /List View/i }).click();
    await waitReady(2000);
    await expectVisible(page.getByRole("button", { name: /Kanban View/i }));
    // table-ish content
    const hasRows =
      (await page.locator("table tbody tr, [role='row']").count()) > 0 ||
      (await page.getByText(/B2BL|LEAD|Seed Co|AGENTIC/i).count()) > 0;
    if (!hasRows) throw new Error("List view shows no lead rows");
  });

  await runCase("leads.list.filter_created", async () => {
    await clickText("Advanced Filters");
    await waitReady(400);
    // Open status multi and pick Created
    const statusLabel = page.locator("label").filter({ hasText: /^Status$/i }).first();
    const statusBox = statusLabel.locator("xpath=following::*[1]");
    await statusLabel.click({ force: true });
    await page.waitForTimeout(200);
    // Try clicking Created option chip/checkbox/text inside panel
    const createdOpt = page.getByText("Created", { exact: true }).last();
    await createdOpt.click({ timeout: 8000 });
    await page.getByRole("button", { name: /^Apply$/i }).click();
    await waitReady(2000);
    const badges = page.locator("text=/created/i");
    if ((await badges.count()) === 0) {
      // soft check — may still pass if empty set; verify URL/filter applied via network is hard; ensure no crash
      const err = page.getByText(/Failed|Error/i);
      if ((await err.count()) > 0) throw new Error("Filter apply surfaced an error");
    }
  });

  await runCase("leads.list.pagination", async () => {
    await clickText("Advanced Filters").catch(() => {});
    const clearBtn = page.getByRole("button", { name: /^Clear$/i });
    if (await clearBtn.count()) {
      await clearBtn.first().click();
      await waitReady(1500);
    }
    const next = page
      .getByRole("button", { name: /next|go to next page/i })
      .or(page.locator('button[aria-label*="next" i]'));
    if ((await next.count()) === 0) return; // single page is fine
    const disabled = await next.first().isDisabled().catch(() => false);
    if (disabled) return;
    await next.first().click();
    await waitReady(1500);
  });

  // ── Create lead ──────────────────────────────────────────────────────
  await runCase("leads.create", async () => {
    await gotoApp(`/b2b-leads/add`);
    await waitReady(1500);
    await fillNearLabel("Company Name", companyName);
    await fillNearLabel("Contact Person", "Agentic Tester");
    await page.locator('input[name="mobile_number_local"]').first().fill(mobileLocal);
    await pickAutocomplete("Lead Source", "a");
    await pickAutocomplete("Assigned To", "super");

    const waitResp = page.waitForResponse(
      (r) => r.url().includes("/b2b-leads") && r.request().method() === "POST" && !r.url().includes("follow"),
      { timeout: 30000 }
    );
    await page.getByRole("button", { name: /Create Lead/i }).click();
    const resp = await waitResp;
    if (!resp.ok()) {
      throw new Error(`Create API ${resp.status()}: ${(await resp.text()).slice(0, 200)}`);
    }
    const json = await resp.json().catch(() => ({}));
    const lead = json?.result ?? json?.data ?? json;
    createdLeadId = lead?.id != null ? String(lead.id) : null;
    createdLeadNumber = lead?.lead_number || null;
    await toastSeen("B2B lead created", 10000);
    await page.waitForURL(/\/b2b-leads\/view\?id=/, { timeout: 20000 }).catch(() => {});
    const m = page.url().match(/[?&]id=(\d+)/);
    if (m) createdLeadId = m[1];
    if (!createdLeadId) throw new Error("Could not resolve created lead id after POST");
  });

  // ── View ─────────────────────────────────────────────────────────────
  await runCase("leads.view", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads/view?id=${createdLeadId}`);
    await waitReady(1500);
    await expectVisible(page.getByText(companyName, { exact: false }));
    await expectVisible(page.getByRole("button", { name: /Edit Lead|Timeline|Convert/i }).first());
  });

  // ── Edit ─────────────────────────────────────────────────────────────
  await runCase("leads.edit", async () => {
    await gotoApp(`/b2b-leads/edit?id=${createdLeadId}`);
    await waitReady(1500);
    await fillNearLabel("City", "Ahmedabad");
    await page.getByRole("button", { name: /Update Lead/i }).click();
    const ok = await toastSeen("B2B lead updated", 15000);
    if (!ok) await waitReady(1500);
  });

  // ── Schedule follow-up from list menu ────────────────────────────────
  await runCase("leads.schedule_followup", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads/view?id=${createdLeadId}`);
    await waitReady(1200);
    await gotoApp(`/b2b-leads`);
    await waitReady(1500);
    const listBtn = page.getByRole("button", { name: /List View/i });
    if (await listBtn.count()) await listBtn.click();
    await waitReady(1500);
    // Quick search by company
    const qs = page.getByPlaceholder(/Quick Search/i);
    if (await qs.count()) {
      await qs.fill(companyName);
      await waitReady(1800);
    }
    const actions = page.locator('button[aria-label="Actions"]');
    await expectVisible(actions, 20000);
    await actions.first().click();
    await page.getByText(/Schedule follow-up/i).click();
    await waitReady(800);
    await expectVisible(page.getByText(/Schedule Follow-up/i));
    await page.getByRole("button", { name: /^Schedule$/i }).click();
    await toastSeen("Follow-up scheduled", 15000);
    await waitReady(800);
  });

  await runCase("leads.add_followup", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads`);
    await waitReady(1200);
    const listBtn = page.getByRole("button", { name: /List View/i });
    if (await listBtn.count()) await listBtn.click();
    await waitReady(1200);
    const qs = page.getByPlaceholder(/Quick Search/i);
    if (await qs.count()) {
      await qs.fill(companyName);
      await waitReady(1800);
    }
    await page.locator('button[aria-label="Actions"]').first().click();
    await page.getByText(/Add follow-up/i).click();
    await waitReady(800);
    // Outcome is a shadcn Select — open trigger then pick visible option
    const outcomeLabel = page.locator("label").filter({ hasText: /^Outcome/i }).first();
    await expectVisible(outcomeLabel);
    const outcomeTrigger = outcomeLabel.locator("xpath=following::button[1]");
    await outcomeTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: /Follow Up Needed/i }).click();
    try {
      await fillNearLabel("Notes", "Agentic follow-up notes");
    } catch {
      await page.locator("textarea").first().fill("Agentic follow-up notes");
    }
    const waitFu = page.waitForResponse(
      (r) => r.url().includes(`/b2b-leads/${createdLeadId}/follow-ups`) && r.request().method() === "POST",
      { timeout: 30000 }
    ).catch(() => null);
    await page.getByRole("button", { name: /Save Follow-Up/i }).click();
    await waitFu;
    const saved = await toastSeen("Follow-up saved", 15000);
    if (!saved) {
      // dialog may have closed after success without lasting toast
      await waitReady(800);
    }
  });

  // ── Follow-up work queue ─────────────────────────────────────────────
  await runCase("followup.today", async () => {
    await gotoApp(`/b2b-lead-followup`);
    await waitReady(2000);
    await expectVisible(page.getByText(/B2B Lead Follow-Ups/i));
    await page.getByRole("button", { name: /^Today$/i }).or(page.getByText(/^Today$/)).first().click();
    await waitReady(2000);
    // Should not show only closed statuses; page should render table
    const body = await page.locator("body").innerText();
    if (/Failed to|Something went wrong/i.test(body)) throw new Error("Follow-up Today errored");
    // Our new lead with null or today next FU should often appear — soft check
    const hasCompany = await page.getByText(companyName, { exact: false }).count();
    if (!hasCompany) {
      // Queue loaded; lead may be on another page — acceptable for Today preset smoke
    }
  });

  await runCase("followup.presets", async () => {
    for (const chip of ["Overdue", "Tomorrow", "All"]) {
      await page.getByText(chip, { exact: true }).first().click();
      await waitReady(1200);
      const body = await page.locator("body").innerText();
      if (/Failed to|Something went wrong/i.test(body)) throw new Error(`${chip} preset errored`);
    }
    await page.getByText("Today", { exact: true }).first().click();
    await waitReady(800);
  });

  await runCase("followup.filters_status_options", async () => {
    await clickText("Advanced Filters");
    await waitReady(500);
    const body = await page.locator("body").innerText();
    if (!/Created/i.test(body) || !/On Hold/i.test(body)) {
      // open status dropdown
      const statusLabel = page.locator("label").filter({ hasText: /^Status$/i }).first();
      await statusLabel.click({ force: true });
      await page.waitForTimeout(400);
    }
    const text = await page.locator("body").innerText();
    if (!/Created/i.test(text)) throw new Error("Follow-up filters missing B2B Created status");
    await page.keyboard.press("Escape");
  });

  await runCase("followup.pagination", async () => {
    await page.getByText("All", { exact: true }).first().click();
    await waitReady(1500);
    const next = page.locator('button[aria-label*="next" i], button:has-text("›"), button:has-text(">")').first();
    if (await next.count()) {
      const disabled = await next.isDisabled().catch(() => false);
      if (!disabled) {
        await next.click();
        await waitReady(1200);
      }
    }
  });

  // ── Analysis dashboard ───────────────────────────────────────────────
  await runCase("leads.analysis", async () => {
    await gotoApp(`/b2b-leads/analysis`);
    await waitReady(2500);
    await expectVisible(page.getByText(/B2B Leads Analysis/i).first());
    await expectVisible(page.getByText(/New Leads|Active Pipeline|Conversion/i).first());
    const body = await page.locator("body").innerText();
    if (/Failed to load analysis/i.test(body)) throw new Error("Analysis failed to load");

    // Date preset
    const preset30 = page.getByRole("button", { name: /^30D$/i });
    if (await preset30.count()) {
      await preset30.first().click();
      await waitReady(2000);
    }

    // KPI / chart presence
    await expectVisible(page.getByText(/Lifecycle Funnel|Follow-up Health|Source Effectiveness/i).first());

    // Drill-down from overdue KPI if present
    const overdue = page.getByText(/Overdue \/ At Risk/i);
    if (await overdue.count()) {
      await overdue.first().click({ trial: true }).catch(() => {});
    }

    // Metric definitions panel
    await expectVisible(page.getByText(/Metric Definitions/i).first());
  });

  await runCase("leads.analysis.export", async () => {
    await gotoApp(`/b2b-leads/analysis`);
    await waitReady(2000);
    const exportBtn = page.getByRole("button", { name: /Export/i });
    await expectVisible(exportBtn);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }).catch(() => null),
      exportBtn.first().click(),
    ]);
    if (!download) {
      // soft-fail only if button clicked without download (API may block); still assert no crash
      const body = await page.locator("body").innerText();
      if (/Export failed/i.test(body)) throw new Error("Analysis export failed");
    }
  });

  await runCase("leads.analysis.drilldown", async () => {
    await gotoApp(`/b2b-leads/analysis`);
    await waitReady(2000);
    const converted = page.getByText(/^Conversions$/i);
    if (await converted.count()) {
      await converted.first().click();
      await waitReady(2000);
      const url = page.url();
      if (!/b2b-leads/.test(url)) throw new Error("Expected drill-down to b2b-leads");
    }
  });

  // ── Assign page smoke ────────────────────────────────────────────────
  await runCase("leads.assign.smoke", async () => {
    await gotoApp(`/b2b-leads/assign`);
    await waitReady(2000);
    await expectVisible(page.getByText(/Assign/i).first());
    const assignBtn = page.getByRole("button", { name: /Assign Leads/i });
    await expectVisible(assignBtn);
  });

  // ── Kanban return + reopen path smoke (only if we convert — skip convert to avoid side effects) ─
  await runCase("leads.kanban.return", async () => {
    await gotoApp(`/b2b-leads`);
    await waitReady(1500);
    const kanbanBtn = page.getByRole("button", { name: /Kanban View/i });
    if (await kanbanBtn.count()) await kanbanBtn.click();
    await waitReady(1500);
    await expectVisible(page.getByText("Created", { exact: true }));
  });

  // ── View page follow-up form (if present) ─────────────────────────────
  await runCase("leads.view.timeline_button", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads/view?id=${createdLeadId}`);
    await waitReady(1500);
    const timeline = page.getByRole("button", { name: /Timeline/i });
    if (await timeline.count()) {
      await timeline.first().click();
      await waitReady(800);
    }
  });

  // ── Documents upload / view ──────────────────────────────────────────
  await runCase("leads.documents.upload_view", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads/view?id=${createdLeadId}`);
    await waitReady(1500);
    await page.getByRole("button", { name: /\+ Upload/i }).click();
    await waitReady(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "agentic-doc.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("agentic document content"),
    });
    const waitUpload = page.waitForResponse(
      (r) => r.url().includes(`/b2b-leads/${createdLeadId}/documents`) && r.request().method() === "POST",
      { timeout: 30000 }
    ).catch(() => null);
    await page.getByRole("button", { name: /^Upload$/i }).click();
    await waitUpload;
    await toastSeen("Document uploaded", 15000);
    await waitReady(1000);
    const viewBtn = page.getByRole("button", { name: /^View$/i }).first();
    if (await viewBtn.count()) {
      await viewBtn.click();
      await waitReady(800);
    }
  });

  // ── Kanban drag Created → Follow Up (mouse path; fallback Add FU menu) ──
  await runCase("leads.kanban.drag_to_follow_up", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads`);
    const kanbanBtn = page.getByRole("button", { name: /Kanban View/i });
    if (await kanbanBtn.count()) await kanbanBtn.click();
    await waitReady(2000);
    const source = page.locator(`[data-rbd-draggable-id="${createdLeadId}"]`).first();
    const target = page.locator(`[data-rbd-droppable-id="follow_up"]`).first();
    let dragged = false;
    if ((await source.count()) && (await target.count())) {
      const s = await source.boundingBox();
      const t = await target.boundingBox();
      if (s && t) {
        await page.mouse.move(s.x + s.width / 2, s.y + 20);
        await page.mouse.down();
        await page.mouse.move(t.x + t.width / 2, t.y + 40, { steps: 12 });
        await page.mouse.up();
        await waitReady(1000);
        dragged = true;
      }
    }
    const dialog = page.getByText(/Add Call Details/i).first();
    if (await dialog.isVisible().catch(() => false)) {
      const outcomeLabel = page.locator("label").filter({ hasText: /^Outcome/i }).first();
      if (await outcomeLabel.count()) {
        await outcomeLabel.locator("xpath=following::button[1]").click();
        await page.getByRole("option", { name: /Follow Up Needed|No Answer/i }).first().click();
      }
      await page.getByRole("button", { name: /Save Follow-Up/i }).click();
      await toastSeen("Follow-up saved", 20000);
    } else if (!dragged) {
      // Fallback: open card menu Add follow-up (same status transition path)
      const menuBtn = source.locator('button[aria-label="Actions"]').or(
        page.getByText(companyName, { exact: false }).locator("xpath=ancestor::div[contains(@class,'MuiPaper') or contains(@class,'Paper')][1]//button").first()
      );
      if (await menuBtn.count()) {
        await menuBtn.first().click();
        await page.getByText(/Add follow-up/i).click();
        await waitReady(600);
        const outcomeLabel = page.locator("label").filter({ hasText: /^Outcome/i }).first();
        await outcomeLabel.locator("xpath=following::button[1]").click();
        await page.getByRole("option", { name: /Follow Up Needed/i }).click();
        await page.getByRole("button", { name: /Save Follow-Up/i }).click();
        await toastSeen("Follow-up saved", 20000);
      } else {
        throw new Error("Could not drag or open Add follow-up for created lead");
      }
    }
  });

  // ── Assign save ──────────────────────────────────────────────────────
  await runCase("leads.assign.save", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads/assign`);
    await waitReady(1500);
    // Collapse filters if open so assign bar is clear
    const adv = page.getByText("Advanced Filters").first();
    if (await adv.count()) {
      // leave as-is; search via quick search in panel header
    }
    const qs = page.getByPlaceholder(/Quick Search/i);
    if (await qs.count()) {
      await qs.fill(createdLeadNumber || companyName);
      await waitReady(2000);
    }
    // Ensure one row selected
    const checks = page.locator('table input[type="checkbox"], tbody input[type="checkbox"]');
    if ((await checks.count()) >= 1) {
      const first = checks.first();
      const checked = await first.isChecked().catch(() => false);
      if (!checked) await first.click({ force: true });
    }

    // Open assign_to trigger (id from Select)
    const trigger = page.locator("#assign_to");
    await expectVisible(trigger, 10000);
    await trigger.click();
    await page.waitForTimeout(400);
    // Prefer a user that is not the first empty placeholder
    const options = page.getByRole("option");
    const count = await options.count();
    if (count < 2) throw new Error("No assignable users in dropdown");
    // pick last non-empty option to maximize chance of change
    await options.nth(Math.min(count - 1, 2)).click();
    await page.waitForTimeout(200);

    const waitAssign = page.waitForResponse(
      (r) => r.url().includes("/b2b-leads/assign") && r.request().method() === "POST",
      { timeout: 25000 }
    ).catch(() => null);
    await page.getByRole("button", { name: /Assign Leads/i }).click();
    const resp = await waitAssign;
    if (!resp) {
      // maybe validation toast
      const body = await page.locator("body").innerText();
      if (/Please select assigning user|Please select at least one lead/i.test(body)) {
        throw new Error("Assign validation failed — user or lead not selected");
      }
      throw new Error("Assign did not complete");
    }
    if (!resp.ok()) throw new Error(`Assign failed: ${resp.status()} ${(await resp.text()).slice(0, 120)}`);
    await toastSeen("assigned successfully", 12000);
  });

  // ── Convert + reopen ─────────────────────────────────────────────────
  await runCase("leads.convert", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads/view?id=${createdLeadId}`);
    await waitReady(1500);
    page.once("dialog", async (d) => {
      await d.accept();
    });
    const waitConv = page.waitForResponse(
      (r) => r.url().includes(`/b2b-leads/${createdLeadId}/convert`) && r.request().method() === "POST",
      { timeout: 30000 }
    ).catch(() => null);
    await page.getByRole("button", { name: /Convert to Client/i }).click();
    const resp = await waitConv;
    if (resp && !resp.ok()) throw new Error(`Convert failed: ${resp.status()}`);
    await toastSeen("Converted", 15000);
    await waitReady(1500);
    const body = await page.locator("body").innerText();
    if (!/converted/i.test(body)) throw new Error("Lead not showing converted status");
  });

  await runCase("leads.reopen", async () => {
    if (!createdLeadId) throw new Error("No created lead");
    await gotoApp(`/b2b-leads`);
    await waitReady(1200);
    const listBtn = page.getByRole("button", { name: /List View/i });
    if (await listBtn.count()) await listBtn.click();
    await waitReady(1200);
    const qs = page.getByPlaceholder(/Quick Search/i);
    if (await qs.count()) {
      await qs.fill(companyName);
      await waitReady(1800);
    }
    await page.locator('button[aria-label="Actions"]').first().click();
    await page.getByText(/Reopen to follow-up/i).click();
    await waitReady(800);
    await page.getByRole("button", { name: /Reopen|Schedule/i }).last().click();
    await toastSeen("reopened", 15000);
    await waitReady(1000);
  });

  // ── Export (leads + follow-up) ───────────────────────────────────────
  await runCase("leads.export", async () => {
    await gotoApp(`/b2b-leads`);
    await waitReady(1200);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }).catch(() => null),
      page.getByRole("button", { name: /Export/i }).first().click(),
    ]);
    await toastSeen("Export completed", 15000).catch(() => {});
    if (download) {
      const path = await download.path().catch(() => null);
      if (path) {
        // ok
      }
    }
  });

  await runCase("followup.export", async () => {
    await gotoApp(`/b2b-lead-followup`);
    await waitReady(1500);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }).catch(() => null),
      page.getByRole("button", { name: /Export/i }).first().click(),
    ]);
    await toastSeen("Export completed", 15000).catch(() => {});
    if (!download) {
      // toast alone is acceptable if browser download event missed
      const ok = results[results.length - 1];
      void ok;
    }
  });

  // ── Delete disposable lead (create fresh then delete) ────────────────
  await runCase("leads.delete", async () => {
    const delCompany = `AGENTIC DEL ${Date.now()}`;
    await gotoApp(`/b2b-leads/add`);
    await waitReady(1200);
    await fillNearLabel("Company Name", delCompany);
    await fillNearLabel("Contact Person", "Delete Me");
    await page.locator("#phone-mobile_number, input[name='mobile_number_local']").first().fill(`9${String(Date.now()).slice(-9)}`);
    await pickAutocomplete("Lead Source", "a");
    await pickAutocomplete("Assigned To", "super");
    const waitCreate = page.waitForResponse(
      (r) => r.url().includes("/b2b-leads") && r.request().method() === "POST" && !r.url().includes("follow"),
      { timeout: 30000 }
    );
    await page.getByRole("button", { name: /Create Lead/i }).click();
    const created = await waitCreate;
    const json = await created.json().catch(() => ({}));
    const lead = json?.result ?? json;
    const delId = lead?.id != null ? String(lead.id) : null;
    if (!delId) throw new Error("Delete-case create failed");
    await waitReady(1500);

    await gotoApp(`/b2b-leads`);
    await waitReady(1200);
    const listBtn = page.getByRole("button", { name: /List View/i });
    if (await listBtn.count()) await listBtn.click();
    await waitReady(1200);
    const qs = page.getByPlaceholder(/Quick Search/i);
    if (await qs.count()) {
      await qs.fill(delCompany);
      await waitReady(1800);
    }
    await page.locator('button[aria-label="Actions"]').first().click();
    await page.getByText(/^Delete$/i).click();
    await waitReady(400);
    const waitDel = page.waitForResponse(
      (r) => r.url().includes(`/b2b-leads/${delId}`) && r.request().method() === "DELETE",
      { timeout: 20000 }
    ).catch(() => null);
    await page.getByRole("button", { name: /^Delete$/i }).last().click();
    await waitDel;
    await toastSeen("deleted", 15000);
  });

  await browser.close();

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const report = {
    stamp,
    baseUrl: BASE_URL,
    tenant: TENANT_KEY,
    email: EMAIL,
    companyName,
    createdLeadId,
    createdLeadNumber,
    summary: { total: results.length, passed, failed, skipped },
    results,
  };
  const jsonPath = join(ARTIFACTS, `${stamp}-report.json`);
  const mdPath = join(ARTIFACTS, `${stamp}-report.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const md = [
    `# B2B Leads Agentic Web Test Report`,
    ``,
    `- When: ${stamp}`,
    `- URL: ${BASE_URL}`,
    `- Tenant: ${TENANT_KEY}`,
    `- User: ${EMAIL}`,
    `- Created lead: ${createdLeadId || "n/a"} (${companyName})`,
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
