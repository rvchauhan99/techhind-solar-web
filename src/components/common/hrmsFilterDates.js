/** Shared HRMS date helpers for Advanced Filter panels. */

export function monthDateBounds(year, month) {
  const y = Number(year);
  const m = Number(month);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(last).padStart(2, "0")}`,
  };
}

/** Calendar defaults for the current local month. */
export function currentMonthDefaults(now = new Date()) {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1);
  const bounds = monthDateBounds(year, month);
  return { year, month, from: bounds.from, to: bounds.to };
}

/** Indian FY start year (Apr–Mar). If month >= April, FY starts this year. */
export function currentFyYear(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return String(m >= 4 ? y : y - 1);
}

export function fyLabel(fyStartYear) {
  const y = Number(fyStartYear);
  return `${y}–${y + 1}`;
}

export function yearSelectOptions(now = new Date()) {
  return [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }));
}

export function monthSelectOptions() {
  return Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString("en", { month: "short" }),
  }));
}

export function fyYearSelectOptions(now = new Date(), span = 3) {
  const current = Number(currentFyYear(now));
  return Array.from({ length: span }, (_, i) => {
    const y = current - (span - 1 - i);
    return { value: String(y), label: fyLabel(y) };
  });
}

/** YYYY-MM for current month (payroll / payout). */
export function currentMonthKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
