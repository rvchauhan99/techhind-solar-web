"use client";

import { formatDate } from "@/utils/dataTableUtils";

function statusBadgeClass(status) {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("won") || s.includes("converted") || s.includes("closed")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  }
  if (s.includes("lost") || s.includes("dead") || s.includes("reject")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
  if (s.includes("follow") || s.includes("progress") || s.includes("open") || s.includes("hot")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  }
  if (s.includes("new") || s.includes("warm")) {
    return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
}

const DetailRow = ({ label, value }) => (
  <div className="py-0.5">
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    <p className="text-xs break-words">{value ?? "-"}</p>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mt-2.5 mb-1 pb-0.5 border-b border-border first:mt-0">
    {children}
  </h3>
);

export default function MarketingLeadDetailsContent({ lead, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!lead) return null;
  const l = lead;
  const phones = [l.mobile_number, l.alternate_mobile_number].filter(Boolean).join(", ") || "-";

  return (
    <div className="pr-1 space-y-0.5">
      {/* Hero Summary Block */}
      <div className="rounded border border-border bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 p-2.5 border-l-4 border-l-[#00823b]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {l.lead_number || `#${l.id}`}
            </p>
            <p className="text-sm font-semibold text-[#00823b] mt-0.5">
              {l.expected_capacity_kw != null ? `${Number(l.expected_capacity_kw)} kW` : "-"}
              <span className="text-slate-600 dark:text-slate-400 font-normal ml-1.5">
                · {l.expected_project_cost != null ? `₹ ${Number(l.expected_project_cost).toLocaleString("en-IN")}` : "-"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 shrink-0">
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(
                l.status
              )}`}
            >
              {l.status || "—"}
            </span>
          </div>
        </div>
      </div>

      <SectionTitle>Contact</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow
          label="Name"
          value={
            l.customer_name
              ? `${l.customer_name}${l.company_name ? ` (${l.company_name})` : ""}`
              : "-"
          }
        />
        <DetailRow label="Phone" value={phones} />
        <DetailRow label="Email" value={l.email_id} />
      </div>

      <SectionTitle>Address</SectionTitle>
      <DetailRow label="Line" value={l.address} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow
          label="City / State / PIN"
          value={[l.city_name, l.state_name, l.pin_code].filter(Boolean).join(", ") || "-"}
        />
      </div>

      <SectionTitle>Source & branch</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Source" value={l.inquiry_source_name || "-"} />
        <DetailRow label="Campaign" value={l.campaign_name || "-"} />
        <DetailRow label="Assigned to" value={l.assigned_to_name || "Unassigned"} />
      </div>

      <SectionTitle>Requirement</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow
          label="Capacity"
          value={l.expected_capacity_kw != null ? `${l.expected_capacity_kw} kW` : "-"}
        />
        <DetailRow
          label="Expected value"
          value={
            l.expected_project_cost != null
              ? `₹ ${Number(l.expected_project_cost).toLocaleString("en-IN")}`
              : "-"
          }
        />
      </div>

      <SectionTitle>Dates</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Created" value={l.created_at ? formatDate(l.created_at) : "-"} />
        <DetailRow label="Updated" value={l.updated_at ? formatDate(l.updated_at) : "-"} />
      </div>

      {l.remarks ? (
        <>
          <SectionTitle>Remarks</SectionTitle>
          <div className="text-xs whitespace-pre-wrap leading-snug bg-muted/30 p-2 rounded-md border border-border/50">
            {l.remarks}
          </div>
        </>
      ) : null}
    </div>
  );
}
