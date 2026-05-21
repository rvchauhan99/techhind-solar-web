"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  IconPhone,
  IconPencil,
  IconMail,
  IconMapPin,
  IconUser,
  IconBriefcase,
  IconCalendar,
  IconChevronRight,
  IconStar,
  IconBrandFacebook,
} from "@tabler/icons-react";
import marketingLeadsService from "@/services/marketingLeadsService";
import moment from "moment";
import AddCallDetailsForm from "../components/AddCallDetailsForm";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import FacebookLeadDetailsSection, {
  isFacebookMarketingLead,
  hasFacebookSurvey,
} from "@/components/marketing-leads/FacebookLeadDetailsSection";

/* ─── Helpers ─────────────────────────────────────────────── */

const STATUS_STYLES = {
  new: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50",
  follow_up:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  converted:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  not_interested:
    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
  junk: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40",
  medium:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/40",
  low: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

function statusBadge(status) {
  const cls =
    STATUS_STYLES[status?.toLowerCase()] ||
    "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}
    >
      {(status || "new").replace(/_/g, " ")}
    </span>
  );
}

function priorityBadge(priority) {
  if (!priority) return null;
  const cls =
    PRIORITY_STYLES[priority?.toLowerCase()] ||
    "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      <IconStar className="size-2.5" />
      {priority}
    </span>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

/** Top hero-style header banner */
function LeadHeroBanner({ lead, onEdit }) {
  const isFb = isFacebookMarketingLead(lead);
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm
        ${
          isFb
            ? "bg-gradient-to-r from-blue-50/80 via-white to-white dark:from-blue-950/20 dark:via-zinc-900 dark:to-zinc-900 border-blue-100/70 dark:border-blue-900/30"
            : "bg-white dark:bg-zinc-900 border-border"
        }`}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {/* Lead number */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50">
            #{lead.lead_number || "—"}
          </span>
          {isFb && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#1877F2] to-[#0A56C6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              <IconBrandFacebook className="size-3" />
              FB Lead
            </span>
          )}
          {statusBadge(lead.status)}
          {priorityBadge(lead.priority)}
        </div>

        {/* Name */}
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-tight">
          {lead.customer_name || "—"}
        </h1>

        {/* Quick info row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-sm text-muted-foreground">
          {lead.mobile_number && (
            <a
              href={`tel:${lead.mobile_number}`}
              className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold hover:underline"
            >
              <IconPhone className="size-3.5" />
              {lead.mobile_number}
            </a>
          )}
          {lead.email_id && (
            <span className="flex items-center gap-1.5">
              <IconMail className="size-3.5 text-blue-400" />
              {lead.email_id}
            </span>
          )}
          {lead.city_name && (
            <span className="flex items-center gap-1.5">
              <IconMapPin className="size-3.5 text-rose-400" />
              {lead.city_name}
              {lead.state_name ? `, ${lead.state_name}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {lead.status &&
          !["converted", "not_interested", "junk"].includes(lead.status) && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <IconPencil className="size-4 mr-1.5" />
              Edit Lead
            </Button>
          )}
      </div>
    </div>
  );
}

/** Compact info tile */
function InfoTile({ label, value, className = "" }) {
  if (!value) return null;
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground break-words leading-snug">
        {value}
      </span>
    </div>
  );
}

/** Left sidebar: compact lead info card */
function LeadInfoCard({ lead }) {
  const isFb = isFacebookMarketingLead(lead);
  let tags = null;
  let meta = {};
  if (isFb) {
    tags = typeof lead?.tags === 'string' ? JSON.parse(lead.tags) : lead?.tags;
    meta = tags?.fb_metadata || {};
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-border">
      <CardHeader className="border-b py-2 px-3 sm:px-4 shrink-0">
        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <IconUser className="size-3.5" />
          Lead Info
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex flex-col gap-3">
        {/* Contact */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
            Contact
          </div>
          <InfoTile label="Name" value={lead.customer_name} />
          {lead.company_name && (
            <InfoTile label="Company" value={lead.company_name} />
          )}
          <InfoTile label="Mobile" value={lead.mobile_number} />
          {lead.alternate_mobile_number && (
            <InfoTile label="Alt. Mobile" value={lead.alternate_mobile_number} />
          )}
          <InfoTile label="Email" value={lead.email_id} />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
            Address
          </div>
          <InfoTile label="Address" value={lead.address} />
          {(lead.city_name || lead.state_name || lead.pin_code) && (
            <InfoTile
              label="City / State / PIN"
              value={[lead.city_name, lead.state_name, lead.pin_code]
                .filter(Boolean)
                .join(", ")}
            />
          )}
        </div>

        {/* Source & Assignment */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
            Source & Assignment
          </div>
          <InfoTile label="Source" value={lead.inquiry_source_name} />
          <InfoTile label="Campaign" value={lead.campaign_name} />
          <InfoTile
            label="Assigned To"
            value={lead.assigned_to_name || "Unassigned"}
          />
          <InfoTile label="Branch" value={lead.branch_name} />
        </div>

        {/* Facebook Ad Details */}
        {isFb && tags && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5 flex items-center gap-1.5">
              <IconBrandFacebook className="size-3.5 text-blue-500" />
              Ad Details
            </div>
            <InfoTile label="Page" value={tags.fb_page_name || tags.fb_page_id} />
            <InfoTile label="Form" value={tags.fb_form_name || tags.fb_form_id} />
            <InfoTile label="Ad" value={tags.fb_ad_name || meta.ad_name} />
            <InfoTile label="Ad Set" value={meta.adset_name} />
            <InfoTile label="Platform" value={meta.platform} />
            {meta.is_organic != null && (
              <InfoTile label="Organic" value={meta.is_organic ? "Yes" : "No"} />
            )}
          </div>
        )}

        {/* Requirement */}
        {(lead.expected_capacity_kw != null ||
          lead.expected_project_cost != null) && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
              Requirement
            </div>
            {lead.expected_capacity_kw != null && (
              <InfoTile
                label="Capacity"
                value={`${lead.expected_capacity_kw} kW`}
              />
            )}
            {lead.expected_project_cost != null && (
              <InfoTile
                label="Est. Value"
                value={`₹ ${Number(lead.expected_project_cost).toLocaleString()}`}
              />
            )}
          </div>
        )}

        {/* Remarks */}
        {lead.remarks && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
              Remarks
            </div>
            <div className="text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded-lg border border-border/40 p-2 max-h-[180px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
              {lead.remarks}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Follow-up history table */
function FollowUpHistory({ leadId, refreshKey }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await marketingLeadsService.listFollowUps(leadId, {
          page: 1,
          limit: 100,
        });
        const list = res?.result?.data || res?.data?.data || res?.data || res;
        setData(Array.isArray(list) ? list : []);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load follow-ups";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (leadId) load();
  }, [leadId, refreshKey]);

  if (loading)
    return (
      <div className="py-4 flex justify-center">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="p-2 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
        {error}
      </div>
    );
  if (!data.length)
    return (
      <div className="py-6 text-center border rounded-xl bg-muted/10 border-dashed">
        <IconCalendar className="size-8 text-muted-foreground/40 mx-auto mb-1.5" />
        <div className="text-sm text-muted-foreground">
          No follow-ups recorded yet.
        </div>
      </div>
    );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Contacted At</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Channel</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Outcome</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Sub-status</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Next F/U</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Promised Action</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Remarks</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((fu) => (
              <tr key={fu.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap text-foreground text-xs">
                  {fu.contacted_at
                    ? moment(fu.contacted_at).format("DD-MMM-YYYY HH:mm")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs capitalize">
                  {fu.contact_channel || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Badge variant="outline" className="font-medium bg-background text-xs">
                    {fu.outcome?.replace(/_/g, " ") || "—"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {fu.outcome_sub_status || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-foreground text-xs">
                  {fu.next_follow_up_at
                    ? moment(fu.next_follow_up_at).format("DD-MMM-YYYY HH:mm")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {fu.promised_action || "—"}
                </td>
                <td
                  className="px-3 py-2 max-w-[200px] truncate text-muted-foreground text-xs"
                  title={fu.notes}
                >
                  {fu.notes || "—"}
                </td>
                <td className="px-3 py-2 text-foreground font-semibold text-xs">
                  {fu.created_by_name || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main page content ───────────────────────────────────── */

function MarketingLeadViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (!leadId) {
      setError("Lead id is required");
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const res = await marketingLeadsService.getMarketingLeadById(leadId);
        setLead(res?.result || res?.data || res);
        setError(null);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load marketing lead"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leadId]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );

  if (error)
    return (
      <AddEditPageShell
        title="Marketing Lead Details"
        listHref="/marketing-leads"
        listLabel="Leads"
      >
        <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 mt-4">
          {error}
        </div>
      </AddEditPageShell>
    );

  const isFb = isFacebookMarketingLead(lead);
  const hasSurvey = hasFacebookSurvey(lead);

  return (
    <AddEditPageShell
      title="Marketing Lead Details"
      listHref="/marketing-leads"
      listLabel="Leads"
      className="pb-6"
    >
      <div className="mt-1 flex flex-col gap-3">
        {/* ── Hero Banner ─────────────────────────────────── */}
        <LeadHeroBanner
          lead={lead}
          onEdit={() => router.push(`/marketing-leads/edit?id=${lead.id}`)}
        />

        {/* ── Body: Left sidebar + Right main column ──────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Left sidebar (3 cols on large) */}
          <div className="md:col-span-4 lg:col-span-3">
            <LeadInfoCard lead={lead} />
          </div>

          {/* Right main column (9 / wide) */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-3">
            <div className={`grid grid-cols-1 ${hasSurvey ? 'xl:grid-cols-2' : ''} gap-3 items-start`}>
              {/* Facebook Lead Responses — FIRST and full width */}
              {hasSurvey && (
                <FacebookLeadDetailsSection lead={lead} />
              )}

              {/* Call / Follow-Up form */}
              <Card className="bg-white dark:bg-zinc-900 border-border">
                <CardHeader className="border-b py-2 px-3 sm:px-4 shrink-0">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <IconPhone className="size-3.5" />
                    Log Call / Follow-Up
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 py-1">
                  <AddCallDetailsForm
                    leadId={lead.id}
                    lead={lead}
                    onSaved={() => setHistoryRefreshKey((k) => k + 1)}
                    onConverted={() => window.location.reload()}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Call History */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 px-0 flex items-center gap-1.5">
                <IconCalendar className="size-3.5" />
                Call History
              </h3>
              <FollowUpHistory
                leadId={lead.id}
                refreshKey={historyRefreshKey}
              />
            </div>
          </div>
        </div>
      </div>
    </AddEditPageShell>
  );
}

export default function MarketingLeadViewPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader />
          </div>
        }
      >
        <MarketingLeadViewContent />
      </Suspense>
    </ProtectedRoute>
  );
}
