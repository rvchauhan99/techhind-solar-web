"use client";

import { formatDate } from "@/utils/dataTableUtils";

const formatCurrency = (v) =>
  v != null && !Number.isNaN(Number(v))
    ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : "-";

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

function statusBadgeClass(status) {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("won") || s.includes("converted") || s.includes("closed")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  }
  if (s.includes("lost") || s.includes("dead") || s.includes("reject")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
  if (s.includes("follow") || s.includes("progress") || s.includes("open")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  }
  if (s.includes("new")) {
    return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
}

export default function InquiryDetailsContent({ inquiry, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!inquiry) return null;

  const i = inquiry;
  const fullAddress = [i.address, i.landmark_area, i.city_name, i.state_name, i.pin_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="pr-1 space-y-0.5">
      <div className="rounded border border-border bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 p-2.5 border-l-4 border-l-[#00823b]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {i.inquiry_number || `#${i.id}`}
            </p>
            <p className="text-sm font-semibold text-[#00823b] mt-0.5">
              {i.capacity != null && Number(i.capacity) > 0 ? `${Number(i.capacity)} kW` : "-"}
              <span className="text-slate-600 dark:text-slate-400 font-normal ml-1.5">
                · {formatCurrency(i.estimated_cost)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 shrink-0">
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(
                i.status
              )}`}
            >
              {i.status || "—"}
            </span>
            {i.is_dead ? (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                Dead
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <SectionTitle>Contact</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow
          label="Customer"
          value={
            i.customer_name
              ? `${i.customer_name}${i.company_name ? ` (${i.company_name})` : ""}`
              : "-"
          }
        />
        <DetailRow label="Mobile" value={i.mobile_number} />
        <DetailRow label="Alternate / phone" value={i.phone_no || "-"} />
        <DetailRow label="Email" value={i.email_id || "-"} />
      </div>

      <SectionTitle>Project</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Scheme" value={i.project_scheme} />
        <DetailRow label="Discom" value={i.discom_name} />
        <DetailRow label="Capacity" value={i.capacity != null ? `${i.capacity} kW` : "-"} />
        <DetailRow label="Estimated cost" value={formatCurrency(i.estimated_cost)} />
        <DetailRow label="Payment type" value={i.payment_type} />
        <DetailRow label="Rating" value={i.rating} />
        <DetailRow label="Reference" value={i.reference_from} />
      </div>

      <SectionTitle>Assignment</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Source" value={i.inquiry_source} />
        <DetailRow label="Branch" value={i.branch_name} />
        <DetailRow label="Inquiry by" value={i.inquiry_by_name} />
        <DetailRow label="Handled by" value={i.handled_by_name} />
        <DetailRow label="Channel partner" value={i.channel_partner_name} />
      </div>

      <SectionTitle>Address</SectionTitle>
      <DetailRow label="Full address" value={fullAddress || "-"} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Landmark / area" value={i.landmark_area} />
        <DetailRow label="Taluka" value={i.taluka} />
        <DetailRow label="District" value={i.district} />
      </div>

      <SectionTitle>Dates</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Date of inquiry" value={i.date_of_inquiry ? formatDate(i.date_of_inquiry) : "-"} />
        <DetailRow label="Next reminder" value={i.next_reminder_date ? formatDate(i.next_reminder_date) : "-"} />
        <DetailRow label="Created" value={i.created_at ? formatDate(i.created_at) : "-"} />
        {i.updated_at ? (
          <DetailRow label="Updated" value={formatDate(i.updated_at)} />
        ) : null}
      </div>

      {i.remarks ? (
        <>
          <SectionTitle>Remarks</SectionTitle>
          <div className="text-xs whitespace-pre-wrap leading-snug bg-muted/30 p-2 rounded-md border border-border/50">
            {i.remarks}
          </div>
        </>
      ) : null}

      {i.do_not_send_message ? (
        <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-2">
          Do not send SMS / messages for this inquiry.
        </p>
      ) : null}
    </div>
  );
}
