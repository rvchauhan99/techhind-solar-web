/**
 * Pagination QA helper — paste via browser_execute_script after each list load.
 * Reads sessionStorage pagQA_* set by the agent, records result, returns next URL or done.
 */
(() => {
  const routes = JSON.parse(sessionStorage.getItem("pagQA_routes") || "[]");
  const results = JSON.parse(sessionStorage.getItem("pagQA_results") || "[]");
  let index = Number(sessionStorage.getItem("pagQA_index") || "0");

  const href = location.href;
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  const pageParam = params.get("page");
  const body = document.body?.innerText || "";
  const pageLabel = body.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
  const showing = body.match(/Showing\s+[^\n]+/i)?.[0] || null;
  const hasError =
    /Cannot find module|Application error|Unhandled Runtime Error|Something went wrong/i.test(
      body
    );
  const loadingOnly = /^\s*Loading\.\.\.\s*$/i.test(body.trim()) || body.trim() === "Loading...";
  const addBtn =
    Array.from(document.querySelectorAll("button,a")).find((el) =>
      /^(Create|Add|New)\b/i.test((el.textContent || "").trim())
    ) || null;

  // Only record if we are on an expected QA path (path matches current index route)
  const expected = routes[index];
  const onExpected = expected && (path === expected || path.startsWith(expected + "/"));

  if (onExpected || path === expected) {
    results.push({
      route: expected || path,
      href,
      pageParam,
      pageLabel: pageLabel ? pageLabel[0] : null,
      pageNum: pageLabel ? Number(pageLabel[1]) : null,
      totalPages: pageLabel ? Number(pageLabel[2]) : null,
      showing,
      hasError,
      loadingOnly,
      addLabel: addBtn ? (addBtn.textContent || "").trim().slice(0, 40) : null,
      urlKeepsPage2: pageParam === "2",
      pass:
        !hasError &&
        !loadingOnly &&
        pageParam === "2" &&
        // If only 1 page of data, still pass URL persistence
        true,
    });
    sessionStorage.setItem("pagQA_results", JSON.stringify(results));
    index += 1;
    sessionStorage.setItem("pagQA_index", String(index));
  }

  if (index >= routes.length) {
    return { done: true, total: results.length, results };
  }

  const next = routes[index];
  return {
    done: false,
    recorded: results.length,
    nextIndex: index,
    nextUrl: `http://localhost:3000${next}?page=2&limit=20`,
    last: results[results.length - 1] || null,
  };
})()
