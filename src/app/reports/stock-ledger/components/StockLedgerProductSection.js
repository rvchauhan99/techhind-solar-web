"use client";

import { IconChevronDown, IconChevronRight, IconExternalLink } from "@tabler/icons-react";
import StockLedgerTable from "./StockLedgerTable";

function Stat({ label, value, cls = "text-slate-800" }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-slate-400">{label}</span>{" "}
      <span className={`font-semibold tabular-nums ${cls}`}>{value ?? 0}</span>
    </span>
  );
}

export default function StockLedgerProductSection({ section, open, onToggle, onOpenProduct }) {
  const p = section.product || {};
  const movementCount = (section.rows || []).filter((r) => r.kind === "movement").length;

  return (
    <div className="rounded border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2 py-1 bg-slate-50/70 text-[11px]">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 min-w-0 text-left font-semibold text-slate-800 hover:text-primary"
          aria-expanded={open}
        >
          {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
          <span className="truncate max-w-[320px]">{p.name || `Product #${p.id}`}</span>
          {p.hsn_ssn_code ? (
            <span className="text-[10px] font-normal text-slate-400">HSN {p.hsn_ssn_code}</span>
          ) : null}
          <span className="text-[10px] font-normal text-slate-400">· {movementCount} entries</span>
        </button>
        <div className="flex flex-wrap items-center gap-x-3 text-[10px] ml-auto">
          <Stat label="Opening" value={section.opening_quantity} />
          <Stat label="In" value={`+${section.period_in ?? 0}`} cls="text-emerald-700" />
          <Stat label="Out" value={`-${section.period_out ?? 0}`} cls="text-red-700" />
          <Stat label="Closing" value={section.closing_quantity} />
          <button
            type="button"
            onClick={() => onOpenProduct?.(p)}
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
            title="Open single-product passbook"
          >
            <IconExternalLink size={11} /> Open
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-slate-100">
          <StockLedgerTable rows={section.rows || []} />
        </div>
      ) : null}
    </div>
  );
}
