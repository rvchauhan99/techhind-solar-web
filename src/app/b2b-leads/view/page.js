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
  IconTransform,
  IconBuilding,
  IconUpload,
  IconDownload,
  IconHistory
} from "@tabler/icons-react";
import b2bLeadService from "@/services/b2bLeadService";
import moment from "moment";
import { formatDate } from "@/utils/dataTableUtils";
import AddCallDetailsForm from "../components/AddCallDetailsForm";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Select, { MenuItem } from "@/components/common/Select";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";

/* ─── Helpers ─────────────────────────────────────────────── */

const STATUS_STYLES = {
  created: "bg-sky-100 text-sky-800 border-sky-200",
  follow_up: "bg-amber-100 text-amber-800 border-amber-200",
  converted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  not_interested: "bg-rose-100 text-rose-800 border-rose-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-sky-50 text-sky-700 border-sky-200",
  low: "bg-slate-50 text-slate-500 border-slate-200",
};

function statusBadge(status) {
  const cls = STATUS_STYLES[status?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {(status || "created").replace(/_/g, " ")}
    </span>
  );
}

function priorityBadge(priority) {
  if (!priority) return null;
  const cls = PRIORITY_STYLES[priority?.toLowerCase()] || "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      <IconStar className="size-2.5" />
      {priority}
    </span>
  );
}

const DOC_TYPES = [
  { value: "visiting_card", label: "Visiting Card" },
  { value: "gst_certificate", label: "GST Certificate" },
  { value: "company_profile", label: "Company Profile" },
  { value: "pan_card", label: "PAN Card" },
  { value: "other", label: "Other" },
];

/* ─── Sub-components ─────────────────────────────────────── */

/** Top hero-style header banner */
function LeadHeroBanner({ lead, onEdit, onConvert, onOpenTimeline }) {
  const isConverted = lead.status === "converted";
  
  return (
    <div className={`rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm bg-white dark:bg-zinc-900 border-border`}>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50">
            {lead.lead_number || `B2B-${lead.id}`}
          </span>
          {statusBadge(lead.status)}
          {priorityBadge(lead.priority)}
          {lead.pipeline_stage && (
            <span className="inline-flex items-center bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-200 capitalize">
              Stage: {String(lead.pipeline_stage).replace(/_/g, " ")}
            </span>
          )}
          {lead.converted_client_code && (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
              Client: {lead.converted_client_code}
            </span>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
          {lead.company_name || "—"}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-sm text-muted-foreground">
          {lead.contact_person && (
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <IconUser className="size-3.5" />
              {lead.contact_person} {lead.designation ? `(${lead.designation})` : ""}
            </span>
          )}
          {lead.mobile_number && (
            <a href={`tel:${lead.mobile_number}`} className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold hover:underline">
              <IconPhone className="size-3.5" />
              {lead.mobile_number}
            </a>
          )}
          {lead.email && (
            <span className="flex items-center gap-1.5">
              <IconMail className="size-3.5 text-blue-400" />
              {lead.email}
            </span>
          )}
          {lead.city && (
            <span className="flex items-center gap-1.5">
              <IconMapPin className="size-3.5 text-rose-400" />
              {lead.city}
              {lead.state ? `, ${lead.state}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onOpenTimeline}>
          <IconHistory className="size-4 mr-1.5" />
          Timeline
        </Button>
        {!isConverted && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <IconPencil className="size-4 mr-1.5" />
            Edit Lead
          </Button>
        )}
        {!isConverted && (
          <Button size="sm" onClick={onConvert}>
            <IconTransform className="size-4 mr-1.5" />
            Convert to Client
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
  return (
    <Card className="bg-white dark:bg-zinc-900 border-border">
      <CardHeader className="border-b py-2 px-3 sm:px-4 shrink-0">
        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <IconBriefcase className="size-3.5" />
          Lead Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex flex-col gap-3">
        {/* Contact */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
            Contact Details
          </div>
          <InfoTile label="Contact Person" value={lead.contact_person} />
          <InfoTile label="Mobile" value={lead.mobile_number} />
          {lead.alternate_mobile_number && <InfoTile label="Alt. Mobile" value={lead.alternate_mobile_number} />}
          <InfoTile label="Email" value={lead.email} />
          <InfoTile label="Website" value={lead.website} />
        </div>

        {/* Business Info */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
            Business Info
          </div>
          <InfoTile label="GSTIN" value={lead.gstin} />
          <InfoTile label="PAN" value={lead.pan_number} />
          <InfoTile label="Business Type" value={lead.business_type} />
          <InfoTile label="Industry" value={lead.industry} />
          <InfoTile label="Annual Volume" value={lead.annual_purchase_volume} />
          <InfoTile label="Current Supplier" value={lead.existing_supplier} />
          <InfoTile label="Existing ERP" value={lead.existing_erp} />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
            Address
          </div>
          <InfoTile label="Address" value={lead.address} />
          <InfoTile label="Area" value={lead.area} />
          {(lead.city || lead.state || lead.pincode) && (
            <InfoTile
              label="Location"
              value={[lead.city, lead.state, lead.pincode].filter(Boolean).join(", ")}
            />
          )}
        </div>

        {/* Source & Assignment */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
            Assignment
          </div>
          <InfoTile label="Source" value={lead.inquiry_source_name} />
          <InfoTile label="Assigned To" value={lead.assigned_to_name || "Unassigned"} />
          <InfoTile label="Assigned By" value={lead.assigned_by_name} />
        </div>

        {/* Requirements */}
        {(lead.expected_quantity || lead.expected_budget || lead.requirement_description) && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
              Requirements
            </div>
            <InfoTile label="Description" value={lead.requirement_description} />
            <InfoTile label="Expected Qty" value={lead.expected_quantity} />
            <InfoTile label="Budget" value={lead.expected_budget} />
            {lead.expected_purchase_date && (
              <InfoTile label="Exp. Purchase Date" value={moment(lead.expected_purchase_date).format("DD-MMM-YYYY")} />
            )}
          </div>
        )}

        {/* Products */}
        {lead.products && lead.products.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
              Products of Interest
            </div>
            <ul className="text-xs space-y-1 pl-3 list-disc text-muted-foreground">
              {lead.products.map(p => (
                <li key={p.product_id}>
                  <span className="font-semibold text-foreground">{p.product?.product_code || p.product?.product_name || `Product ${p.product_id}`}</span>
                  {p.quantity ? ` (Qty: ${p.quantity})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Remarks */}
        {lead.remarks && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
              Remarks
            </div>
            <div className="text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded border border-border/40 p-2 max-h-[180px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
              {lead.remarks}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Documents section */
function DocumentsCard({ leadId, refreshKey }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docType, setDocType] = useState("other");
  const [docFile, setDocFile] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [viewingDocId, setViewingDocId] = useState(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    const loadDocs = async () => {
      setLoading(true);
      try {
        const res = await b2bLeadService.listB2bLeadDocuments(leadId);
        setDocuments(res?.result ?? res ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (leadId) loadDocs();
  }, [leadId, refreshKey, localRefresh]);

  const handleUploadDoc = async () => {
    if (!docFile) {
      toast.error("Select a file");
      return;
    }
    setDocLoading(true);
    try {
      const fd = new FormData();
      fd.append("document", docFile);
      fd.append("document_type", docType);
      await b2bLeadService.uploadB2bLeadDocument(leadId, fd);
      toast.success("Document uploaded");
      setDocOpen(false);
      setDocFile(null);
      setLocalRefresh(r => r + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setDocLoading(false);
    }
  };

  const handleViewDoc = async (docId) => {
    if (!docId) return;
    setViewingDocId(docId);
    try {
      const url = await b2bLeadService.getB2bLeadDocumentUrl(leadId, docId);
      if (!url) {
        toast.error("Document URL not available");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to open document");
    } finally {
      setViewingDocId(null);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!docId) return;
    if (!window.confirm("Delete this document?")) return;
    try {
      await b2bLeadService.deleteB2bLeadDocument(leadId, docId);
      toast.success("Document deleted");
      setLocalRefresh((r) => r + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete document");
    }
  };

  return (
    <>
      <Card className="bg-white dark:bg-zinc-900 border-border">
        <CardHeader className="border-b py-2 px-3 sm:px-4 shrink-0 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <IconUpload className="size-3.5" />
            Documents
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setDocOpen(true)}>
            + Upload
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 flex justify-center"><Loader /></div>
          ) : documents.length > 0 ? (
            <ul className="text-xs divide-y divide-border">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 p-2 hover:bg-muted/30">
                  <span className="min-w-0 truncate font-medium">
                    {d.document_type} <span className="text-muted-foreground font-normal">— {d.file_name || d.file_path}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      disabled={viewingDocId === d.id}
                      onClick={() => handleViewDoc(d.id)}
                    >
                      {viewingDocId === d.id ? "…" : "View"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-destructive"
                      onClick={() => handleDeleteDoc(d.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">No documents uploaded.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className={DIALOG_FORM_MEDIUM}>
          <DialogTitle>Upload Document</DialogTitle>
          <div className="space-y-3">
            <Select label="Document Type" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
            <div>
              <label className="text-sm font-medium mb-1 block">File</label>
              <input type="file" className="text-sm w-full border p-1.5 rounded" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDocOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadDoc} disabled={docLoading}>
                {docLoading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
        const res = await b2bLeadService.listB2bLeadFollowUps(leadId, {
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
              <th className="px-3 py-2 font-bold whitespace-nowrap">Date</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Type</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Discussion</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Next F/U</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">Status</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((fu) => (
              <tr key={fu.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap text-foreground text-xs">
                  {fu.follow_up_at
                    ? moment(fu.follow_up_at).format("DD-MMM-YYYY HH:mm")
                    : moment(fu.created_at).format("DD-MMM-YYYY HH:mm")}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs capitalize">
                  {fu.follow_up_type?.replace(/_/g, " ") || "—"}
                </td>
                <td className="px-3 py-2 max-w-[300px] text-muted-foreground text-xs whitespace-pre-wrap">
                  {fu.discussion || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-foreground text-xs">
                  {fu.next_follow_up_at
                    ? moment(fu.next_follow_up_at).format("DD-MMM-YYYY HH:mm")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                   <Badge variant="outline" className="font-medium bg-background text-[10px]">
                     {fu.status?.replace(/_/g, " ") || "—"}
                   </Badge>
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

function LeadTimelineSidebar({ leadId, open, onClose }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !leadId) return;
    const fetchTimeline = async () => {
      setLoading(true);
      try {
        const res = await b2bLeadService.getB2bLeadTimeline(leadId);
        setTimeline(res?.result ?? res ?? []);
      } catch (err) {
        toast.error("Failed to load timeline");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [open, leadId]);

  return (
    <DetailsSidebar open={open} onClose={onClose} title="Timeline History">
      {loading ? (
        <div className="p-4 flex justify-center"><Loader /></div>
      ) : (
        <div className="space-y-3">
          {(Array.isArray(timeline) ? timeline : []).map((ev) => (
            <div key={ev.id} className="border-l-2 border-primary/40 pl-3 py-1">
              <div className="text-sm font-semibold">{ev.title}</div>
              {ev.description && (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5 leading-relaxed bg-muted/20 p-2 rounded border border-border/40">
                  {ev.description}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
                {formatDate(ev.created_at)} · {ev.created_by_name || "System"} · {ev.event_type}
              </div>
            </div>
          ))}
          {!timeline?.length && (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          )}
        </div>
      )}
    </DetailsSidebar>
  );
}

/* ─── Main page content ───────────────────────────────────── */

function B2bLeadViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await b2bLeadService.getB2bLeadById(leadId);
      setLead(res?.result || res?.data || res);
      setError(null);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load lead"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!leadId) {
      setError("Lead id is required");
      setLoading(false);
      return;
    }
    load();
  }, [leadId]);

  const handleFollowUpSaved = async () => {
    setHistoryRefreshKey((k) => k + 1);
    await load();
  };

  const handleConvert = async () => {
    if (!window.confirm("Convert this lead to a B2B Client?")) return;
    try {
      const res = await b2bLeadService.convertB2bLead(leadId);
      const result = res?.result ?? res;
      toast.success(`Converted to client ${result.client_code || result.client_id}`);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Conversion failed");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );

  if (error)
    return (
      <AddEditPageShell
        title="B2B Lead Details"
        listHref="/b2b-leads"
        listLabel="B2B Leads"
      >
        <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 mt-4">
          {error}
        </div>
      </AddEditPageShell>
    );

  const isConverted = lead?.status === "converted";

  return (
    <AddEditPageShell
      title="B2B Lead Details"
      listHref="/b2b-leads"
      listLabel="B2B Leads"
      className="pb-6"
    >
      <div className="mt-1 flex flex-col gap-3">
        {/* ── Hero Banner ─────────────────────────────────── */}
        <LeadHeroBanner
          lead={lead}
          onEdit={() => router.push(`/b2b-leads/edit?id=${lead.id}`)}
          onConvert={handleConvert}
          onOpenTimeline={() => setTimelineOpen(true)}
        />

        {/* ── Body: Left sidebar + Right main column ──────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Left sidebar (3/4 cols on large) */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-3">
            <LeadInfoCard lead={lead} />
            <DocumentsCard leadId={lead.id} refreshKey={historyRefreshKey} />
          </div>

          {/* Right main column (8/9 wide) */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-3">
            
            {!isConverted && (
              <Card className="bg-white dark:bg-zinc-900 border-border">
                <CardHeader className="border-b py-2 px-3 sm:px-4 shrink-0">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <IconPhone className="size-3.5" />
                    Log Follow-Up
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <AddCallDetailsForm
                    leadId={lead.id}
                    lead={lead}
                    onSaved={handleFollowUpSaved}
                    onConverted={handleFollowUpSaved}
                  />
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 px-0 flex items-center gap-1.5 mt-2">
                <IconCalendar className="size-3.5" />
                Follow-Up History
              </h3>
              <FollowUpHistory
                leadId={lead.id}
                refreshKey={historyRefreshKey}
              />
            </div>

          </div>
        </div>
      </div>
      <LeadTimelineSidebar
        leadId={lead.id}
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
      />
    </AddEditPageShell>
  );
}

export default function ViewB2bLeadPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader />
          </div>
        }
      >
        <B2bLeadViewContent />
      </Suspense>
    </ProtectedRoute>
  );
}
