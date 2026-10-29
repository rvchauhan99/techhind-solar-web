"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { toast } from "sonner";
import { buildInventoryVoucherHref } from "@/utils/inventoryVoucherLinks";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function SignedQty({ value, kind }) {
  if (kind !== "movement" || value == null) {
    return <span className="text-slate-400">—</span>;
  }
  const n = Number(value);
  if (n > 0) {
    return <span className="font-semibold text-emerald-600">+{n}</span>;
  }
  if (n < 0) {
    return <span className="font-semibold text-red-600">{n}</span>;
  }
  return <span className="text-slate-600">0</span>;
}

function VoucherCell({ row, returnContext }) {
  if (row.kind !== "movement") return <span className="text-slate-400">—</span>;

  if (!row.voucher_available || !row.voucher_href_hint) {
    return (
      <button
        type="button"
        className="text-left text-[11px] text-slate-500 underline-offset-2 hover:underline"
        onClick={() =>
          toast.error("Referenced document is unavailable or was removed.")
        }
      >
        {row.voucher_no || "—"}
      </button>
    );
  }

  const href = buildInventoryVoucherHref(row.voucher_href_hint, returnContext);
  if (!href) {
    return <span className="text-[11px] text-slate-600">{row.voucher_no || "—"}</span>;
  }

  return (
    <Link
      href={href}
      className="text-[11px] font-medium text-primary hover:underline"
      title="Open voucher"
    >
      {row.voucher_no || `#${row.transaction_id}`}
    </Link>
  );
}

export default function StockLedgerTable({ rows = [] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnContext = useMemo(
    () => ({ pathname, searchParams }),
    [pathname, searchParams]
  );
  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!rows.length) {
    return (
      <div className="rounded border border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
        No ledger rows for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-1.5 font-semibold">Date / Time</th>
            <th className="px-2 py-1.5 font-semibold">Transaction / Party</th>
            <th className="px-2 py-1.5 font-semibold">Voucher</th>
            <th className="px-2 py-1.5 font-semibold text-right">Quantity</th>
            <th className="px-2 py-1.5 font-semibold text-right">Running Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const key = `${row.kind}-${row.transaction_id || "x"}-${idx}`;
            const hasSerials = Array.isArray(row.serials) && row.serials.length > 0;
            const isOpen = expanded.has(key);
            const rowBg =
              row.kind === "opening" || row.kind === "closing"
                ? "bg-slate-50 font-semibold"
                : "hover:bg-slate-50/80";

            return (
              <Fragment key={key}>
                <tr className={`border-t border-slate-100 ${rowBg}`}>
                  <td className="px-2 py-1 align-top whitespace-nowrap text-slate-600">
                    {row.kind === "opening" || row.kind === "closing"
                      ? row.transaction_type_label
                      : formatDateTime(row.performed_at)}
                  </td>
                  <td className="px-2 py-1 align-top">
                    <div className="flex items-start gap-1">
                      {hasSerials ? (
                        <button
                          type="button"
                          className="mt-0.5 text-slate-400 hover:text-slate-700"
                          onClick={() => toggle(key)}
                          aria-label="Toggle serials"
                        >
                          {isOpen ? (
                            <IconChevronDown size={12} />
                          ) : (
                            <IconChevronRight size={12} />
                          )}
                        </button>
                      ) : (
                        <span className="inline-block w-3" />
                      )}
                      <div>
                        {row.kind === "movement" ? (
                          <>
                            <div className="font-medium text-slate-800">
                              {row.transaction_type_label || row.transaction_type}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {row.party_name ||
                                (row.warehouse_name ? `WH: ${row.warehouse_name}` : "—")}
                              {row.secondary_ref ? ` · ${row.secondary_ref}` : ""}
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-700">{row.transaction_type_label}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1 align-top">
                    <VoucherCell row={row} returnContext={returnContext} />
                  </td>
                  <td className="px-2 py-1 align-top text-right tabular-nums">
                    <SignedQty value={row.signed_quantity} kind={row.kind} />
                  </td>
                  <td className="px-2 py-1 align-top text-right tabular-nums font-medium text-slate-800">
                    {row.running_balance ?? "—"}
                  </td>
                </tr>
                {hasSerials && isOpen ? (
                  <tr className="border-t border-slate-50 bg-slate-50/50">
                    <td colSpan={5} className="px-2 py-1.5 pl-8 text-[10px] text-slate-600">
                      <span className="font-semibold text-slate-500">Serials: </span>
                      {row.serials.map((s) => s.serial_number).join(", ")}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
