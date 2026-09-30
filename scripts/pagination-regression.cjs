/**
 * Local pagination regression (Solar CRM web).
 * Usage: node scripts/pagination-regression.mjs
 * Does not commit; local QA only.
 */
const { chromium } = require("playwright");

const BASE = process.env.WEB_BASE || "http://localhost:3000";
const EMAIL = "superadmin@user.com";
const PASSWORD = "Admin@1234";

const ROUTES = [
  "/purchase-orders",
  "/po-inwards",
  "/quotation",
  "/inquiry",
  "/order",
  "/supplier",
  "/product",
  "/user-master",
  "/b2b-sales-orders",
  "/b2b-sales-quotes",
  "/b2b-shipments",
  "/b2b-clients",
  "/b2b-invoices",
  "/b2b-shipment-returns",
  "/stock-transfers",
  "/stock-adjustments",
  "/stocks",
  "/production-bom",
  "/production-orders",
  "/production-bookings",
  "/purchase-returns",
  "/site-visit",
  "/followup",
  "/serial-master",
  "/module-master",
  "/role-master",
  "/role-module",
  "/bill-of-material",
  "/project-price",
  "/user-order-commission-rates",
  "/service/tickets",
  "/service/warranty-claims",
  "/delivery-challans",
  "/cancelled-orders",
  "/marketing-lead-followup",
  "/b2b-lead-followup",
  "/payment-outstanding",
  "/commission-settlements/unsettled",
  "/commission-settlements/pending",
  "/commission-settlements/payout",
  "/commission-settlements/payout-approval",
  "/commission-settlements/report",
  "/commission-settlements/history",
  "/commission-settlements/ledger-report",
  "/agent-logs",
  "/service/search",
  "/closed-orders",
  "/confirm-orders",
  "/marketing-leads?view=list",
  "/b2b-leads?view=list",
];

const RETURN_TO_ROUTES = [
  { list: "/purchase-orders", addText: /Create PO/i },
  { list: "/po-inwards", addText: /Add|Create|New/i },
  { list: "/quotation", addText: /Add|Create|New/i },
  { list: "/delivery-challans", addText: /New Delivery Challan/i },
  { list: "/b2b-sales-orders", addText: /Add|Create|New/i },
  { list: "/stock-transfers", addText: /Add|Create|New/i },
  { list: "/stock-adjustments", addText: /Add|Create|New/i },
  { list: "/production-bom", addText: /Add|Create|New/i },
  { list: "/module-master", addText: /Add|Create|New/i },
  { list: "/role-master", addText: /Add|Create|New/i },
];

function listUrl(route) {
  if (route.includes("?")) {
    return `${BASE}${route}&page=2&limit=20`;
  }
  return `${BASE}${route}?page=2&limit=20`;
}

async function waitSettled(page, timeout = 12000) {
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Cannot find module|Application error|Unhandled Runtime Error/i.test(t))
          return true;
        if (/Showing\s+/i.test(t) || /Page\s+\d+\s+of\s+\d+/i.test(t)) return true;
        // some lists use cards without Showing
        if (t.length > 800 && !/^\s*Loading/i.test(t.trim())) return true;
        return false;
      },
      { timeout }
    );
  } catch {
    /* continue and classify */
  }
  await page.waitForTimeout(400);
}

async function checkList(page, route) {
  const url = listUrl(route);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitSettled(page);
  const info = await page.evaluate(() => {
    const body = document.body?.innerText || "";
    const params = new URLSearchParams(location.search);
    const pageLabel = body.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
    return {
      href: location.href,
      path: location.pathname,
      pageParam: params.get("page"),
      pageLabel: pageLabel ? pageLabel[0] : null,
      pageNum: pageLabel ? Number(pageLabel[1]) : null,
      totalPages: pageLabel ? Number(pageLabel[2]) : null,
      showing: body.match(/Showing\s+[^\n]+/i)?.[0] || null,
      hasError: /Cannot find module|Application error|Unhandled Runtime Error|Something went wrong/i.test(
        body
      ),
      loadingOnly:
        /^\s*Loading\.\.\.\s*$/i.test(body.trim()) ||
        (body.includes("Loading...") && body.length < 120),
    };
  });

  const pass =
    !info.hasError &&
    !info.loadingOnly &&
    info.pageParam === "2";

  return {
    route,
    type: "url_page",
    pass,
    reason: pass
      ? "ok"
      : info.hasError
        ? "error"
        : info.loadingOnly
          ? "loading"
          : info.pageParam !== "2"
            ? `pageParam=${info.pageParam}`
            : "fail",
    ...info,
  };
}

async function checkReturnTo(page, { list, addText }) {
  const url = listUrl(list);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitSettled(page);

  const clicked = await page.evaluate((reSource) => {
    const re = new RegExp(reSource, "i");
    const el = Array.from(document.querySelectorAll("button,a")).find((n) =>
      re.test((n.textContent || "").trim())
    );
    if (!el) return { ok: false, reason: "no_add_button" };
    el.click();
    return { ok: true, label: (el.textContent || "").trim().slice(0, 40) };
  }, addText.source);

  if (!clicked.ok) {
    return {
      route: list,
      type: "returnTo",
      pass: null,
      reason: "skipped_no_add",
      label: null,
    };
  }

  await page.waitForTimeout(800);
  const after = await page.evaluate(() => {
    const u = new URL(location.href);
    const returnTo = u.searchParams.get("returnTo");
    let decoded = null;
    let hasPage2 = false;
    if (returnTo) {
      try {
        decoded = decodeURIComponent(returnTo);
        hasPage2 = /[?&]page=2(?:&|$)/.test(decoded) || decoded.includes("page=2");
      } catch {
        decoded = returnTo;
      }
    }
    return {
      href: location.href,
      path: location.pathname,
      returnTo: decoded,
      hasPage2,
    };
  });

  // Cancel / go back if possible
  const cancelled = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button,a")).find((n) =>
      /^(Cancel|Back)$/i.test((n.textContent || "").trim())
    );
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (cancelled) {
    await page.waitForTimeout(800);
  } else {
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(500);
  }

  const back = await page.evaluate(() => ({
    href: location.href,
    pageParam: new URLSearchParams(location.search).get("page"),
  }));

  const pass = Boolean(after.hasPage2);
  return {
    route: list,
    type: "returnTo",
    pass,
    reason: pass
      ? back.pageParam === "2"
        ? "ok_return_and_back"
        : "ok_returnTo_url_back_partial"
      : after.returnTo
        ? "returnTo_missing_page"
        : "no_returnTo",
    addHref: after.href,
    returnTo: after.returnTo,
    backHref: back.href,
    backPage: back.pageParam,
  };
}

async function login(page) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  if (page.url().includes("/home") || !page.url().includes("/auth/login")) {
    return;
  }
  const email = page.locator("#email, input[name='email'], input[type='email']").first();
  const password = page.locator("#password, input[name='password'], input[type='password']").first();
  await email.fill(EMAIL);
  await password.fill("");
  await password.fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(home|erp-dashboard|dashboard)/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  const results = [];
  try {
    await login(page);
    console.log("Logged in:", page.url());

    for (const route of ROUTES) {
      try {
        const r = await checkList(page, route);
        results.push(r);
        console.log(`${r.pass ? "PASS" : "FAIL"} [url] ${route} — ${r.reason} ${r.pageLabel || ""}`);
      } catch (err) {
        results.push({
          route,
          type: "url_page",
          pass: false,
          reason: `exception: ${err.message}`,
        });
        console.log(`FAIL [url] ${route} — exception: ${err.message}`);
      }
    }

    for (const item of RETURN_TO_ROUTES) {
      try {
        const r = await checkReturnTo(page, item);
        results.push(r);
        const mark = r.pass === null ? "SKIP" : r.pass ? "PASS" : "FAIL";
        console.log(`${mark} [returnTo] ${item.list} — ${r.reason}`);
      } catch (err) {
        results.push({
          route: item.list,
          type: "returnTo",
          pass: false,
          reason: `exception: ${err.message}`,
        });
        console.log(`FAIL [returnTo] ${item.list} — exception: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  const urlTests = results.filter((r) => r.type === "url_page");
  const retTests = results.filter((r) => r.type === "returnTo");
  const urlPass = urlTests.filter((r) => r.pass).length;
  const urlFail = urlTests.filter((r) => !r.pass).length;
  const retPass = retTests.filter((r) => r.pass === true).length;
  const retFail = retTests.filter((r) => r.pass === false).length;
  const retSkip = retTests.filter((r) => r.pass === null).length;

  const summary = {
    urlPass,
    urlFail,
    urlTotal: urlTests.length,
    retPass,
    retFail,
    retSkip,
    retTotal: retTests.length,
    failures: results.filter((r) => r.pass === false),
  };

  const fs = require("fs");
  const out = "scripts/pagination-regression-results.json";
  fs.mkdirSync("scripts", { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ summary, results }, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("Wrote", out);
  process.exit(urlFail + retFail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
