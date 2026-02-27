"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { IconPhone } from "@tabler/icons-react";
import marketingLeadsService from "@/services/marketingLeadsService";
import moment from "moment";
import AddCallDetailsForm from "../components/AddCallDetailsForm";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"; // Keep basic MUI table for now or refactor to static table
// Actually, let's use a standard tailwind table
import Loader from "@/components/common/Loader";

function LeadHeader({ lead }) {
  if (!lead) return null;
  return (
    <Card className="mb-4 bg-white dark:bg-zinc-900 border-border">
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Lead #{lead.lead_number || "-"}</div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{lead.customer_name || "-"}</h2>
            <Badge variant="default" className="text-[10px] h-5">
              {lead.status || "NEW"}
            </Badge>
            {lead.priority && (
              <Badge variant="secondary" className="text-[10px] h-5 uppercase">
                {lead.priority}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-foreground">
            <div className="flex items-center gap-1.5 font-medium">
              <IconPhone className="size-4 text-muted-foreground" />
              {lead.mobile_number || "-"}
            </div>
            {lead.campaign_name && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-semibold text-foreground">Campaign:</span> {lead.campaign_name}
              </div>
            )}
            {lead.branch_name && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-semibold text-foreground">Branch:</span> {lead.branch_name}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadDetails({ lead }) {
  if (!lead) return null;
  return (
    <Card className="h-full bg-white dark:bg-zinc-900 border-border flex flex-col">
      <CardHeader className="border-b pb-3 pt-4 px-4 sm:px-6 shrink-0">
        <CardTitle>Lead Details</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Contact</div>
          <div className="text-sm font-medium">
            {lead.customer_name} {lead.company_name ? `(${lead.company_name})` : ""}
          </div>
          <div className="text-sm mt-0.5">
            {lead.mobile_number}
            {lead.alternate_mobile_number ? `, ${lead.alternate_mobile_number}` : ""}
          </div>
          {lead.email_id && (
            <div className="text-sm text-muted-foreground mt-0.5">
              {lead.email_id}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Address</div>
          <div className="text-sm">{lead.address || "-"}</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {lead.city_name || ""} {lead.state_name ? `, ${lead.state_name}` : ""} {lead.pin_code || ""}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Source & Campaign</div>
          <div className="text-sm flex gap-2">
            <span className="text-muted-foreground w-20">Source:</span>
            <span className="font-medium">{lead.inquiry_source_name || "N/A"}</span>
          </div>
          <div className="text-sm flex gap-2 mt-1">
            <span className="text-muted-foreground w-20">Campaign:</span>
            <span className="font-medium">{lead.campaign_name || "N/A"}</span>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Assignment</div>
          <div className="text-sm flex gap-2">
            <span className="text-muted-foreground w-24">Assigned To:</span>
            <span className="font-medium">{lead.assigned_to_name || "Unassigned"}</span>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Requirement</div>
          <div className="text-sm flex gap-2">
            <span className="text-muted-foreground w-20">Capacity:</span>
            <span className="font-medium">{lead.expected_capacity_kw != null ? `${lead.expected_capacity_kw} kW` : "-"}</span>
          </div>
          <div className="text-sm flex gap-2 mt-1">
            <span className="text-muted-foreground w-20">Value:</span>
            <span className="font-medium">
              {lead.expected_project_cost != null
                ? `₹ ${Number(lead.expected_project_cost).toLocaleString()}`
                : "-"}
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-md border border-border/50">
            {lead.remarks || "-"}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

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
          err?.response?.data?.message || err?.message || "Failed to load follow-ups";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (leadId) {
      load();
    }
  }, [leadId, refreshKey]);

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-4">
        <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
          {error}
        </div>
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="py-8 text-center border rounded-lg bg-muted/10 border-dashed">
        <div className="text-sm text-muted-foreground">
          No follow-ups recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Contacted At</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Channel</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Outcome</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Sub-status / Reason</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Next Follow-Up</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Promised Action</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Call Notes</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((fu) => (
              <tr key={fu.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-foreground">
                  {fu.contacted_at
                    ? moment(fu.contacted_at).format("DD-MMM-YYYY HH:mm")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{fu.contact_channel || "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="outline" className="font-medium bg-background">
                    {fu.outcome?.replace(/_/g, " ") || "-"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fu.outcome_sub_status || "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap text-foreground">
                  {fu.next_follow_up_at
                    ? moment(fu.next_follow_up_at).format("DD-MMM-YYYY HH:mm")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fu.promised_action || "-"}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground" title={fu.notes}>
                  {fu.notes || "-"}
                </td>
                <td className="px-4 py-3 text-foreground font-medium">{fu.created_by_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
        const leadData = res?.result || res?.data || res;
        setLead(leadData);
        setError(null);
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load marketing lead";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (error) {
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
  }

  return (
    <AddEditPageShell
      title="Marketing Lead Details"
      listHref="/marketing-leads"
      listLabel="Leads"
      className="pb-6"
    >
      <div className="mt-2 flex flex-col h-full gap-4">
        <LeadHeader lead={lead} />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
          <div className="md:col-span-4 lg:col-span-3 h-full">
            <LeadDetails lead={lead} />
          </div>

          <div className="md:col-span-8 lg:col-span-9 h-[calc(100vh-210px)] flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <Card className="shrink-0 bg-white dark:bg-zinc-900 border-border">
                <CardContent className="p-0 sm:p-0">
                  <AddCallDetailsForm
                    leadId={lead.id}
                    lead={lead}
                    onSaved={() => setHistoryRefreshKey((k) => k + 1)}
                    onConverted={() => {
                      // Refresh lead details after conversion
                      window.location.reload();
                    }}
                  />
                </CardContent>
              </Card>

              <div className="flex flex-col flex-1 shrink-0 pb-4">
                <h3 className="text-lg font-semibold tracking-tight mb-3 px-1">
                  Call History
                </h3>
                <FollowUpHistory leadId={lead.id} refreshKey={historyRefreshKey} />
              </div>
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
      <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader /></div>}>
        <MarketingLeadViewContent />
      </Suspense>
    </ProtectedRoute>
  );
}


