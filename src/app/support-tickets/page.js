"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/utils/toast";
import {
  createSupportTicket,
  getSupportLimits,
  getSupportStatus,
  listSupportTickets,
} from "@/services/supportTicketsService";
import {
  SupportFileChipList,
  SupportFileDropzone,
  SupportPriorityBadge,
  SupportStatusBadge,
} from "@/components/support/SupportAttachmentViewer";

function SupportTicketsContent() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState("other");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [limits, setLimits] = useState({
    max_attachment_bytes: 5 * 1024 * 1024,
    max_attachments_per_message: 5,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const st = await getSupportStatus();
      setEnabled(Boolean(st?.enabled));
      if (!st?.enabled) {
        setRows([]);
        return;
      }
      const lim = await getSupportLimits().catch(() => null);
      if (lim) setLimits(lim);
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      const list = await listSupportTickets(params);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      toastError(e?.response?.data?.message || e?.message || "Failed to load tickets");
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const maxFiles = limits.max_attachments_per_message || 5;
  const maxBytes = limits.max_attachment_bytes || 5 * 1024 * 1024;

  const handleQueueFiles = (incoming) => {
    if (!incoming?.length) return;
    setFiles((prev) => [...prev, ...incoming].slice(0, maxFiles));
  };

  const handleRemoveQueued = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toastError("Subject and message are required");
      return;
    }
    if (files.length > maxFiles) {
      toastError(`Max ${maxFiles} attachments`);
      return;
    }
    for (const f of files) {
      if (f.size > maxBytes) {
        toastError(`${f.name} exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)} MB`);
        return;
      }
    }
    setBusy(true);
    try {
      const created = await createSupportTicket({
        subject: subject.trim(),
        body: body.trim(),
        priority,
        category,
        files,
      });
      toastSuccess("Ticket created");
      setShowCreate(false);
      setSubject("");
      setBody("");
      setPriority("normal");
      setCategory("other");
      setFiles([]);
      if (created?.id) router.push(`/support-tickets/${created.id}`);
      else load();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  if (enabled === false) {
    return (
      <AddEditPageShell title="Support tickets" listHref="/support-tickets" listLabel="Tickets">
        <div className="p-3" data-testid="support-disabled">
          <p className="text-sm text-slate-600">
            Support tickets are not enabled for this environment yet.
          </p>
        </div>
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell title="Support tickets" listHref="/support-tickets" listLabel="Tickets" className="gap-2">
      <div className="space-y-2" data-testid="support-tickets-page">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" data-testid="support-filters">
            <select
              className="h-7 rounded border border-slate-200 px-2 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="support-status-filter"
            >
              <option value="all">All status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              className="h-7 rounded border border-slate-200 px-2 text-xs"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              data-testid="support-priority-filter"
            >
              <option value="all">All priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <Button size="sm" data-testid="support-new-btn" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "New ticket"}
          </Button>
        </div>

        {showCreate && (
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm font-semibold">New support ticket</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <form onSubmit={handleCreate} className="space-y-2" data-testid="support-create-form">
                <Input
                  className="h-8 text-sm"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="support-subject"
                />
                <Textarea
                  className="min-h-[72px] text-sm"
                  placeholder="Describe your issue…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  data-testid="support-body"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-7 rounded border border-slate-200 px-2 text-xs"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    data-testid="support-priority"
                    aria-label="Priority"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                  <select
                    className="h-7 rounded border border-slate-200 px-2 text-xs capitalize"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    data-testid="support-category"
                    aria-label="Category"
                  >
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="account">Account</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <SupportFileDropzone
                  onFiles={handleQueueFiles}
                  disabled={busy}
                  maxFiles={maxFiles}
                  already={files.length}
                  maxBytes={maxBytes}
                  hint={`Attach (max ${maxFiles} × ${(maxBytes / (1024 * 1024)).toFixed(0)}MB)`}
                  inputTestId="support-create-files"
                  dropzoneTestId="support-create-dropzone"
                />
                <SupportFileChipList files={files} onRemove={handleRemoveQueued} disabled={busy} />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={busy} data-testid="support-create-submit">
                    Submit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden border-slate-200 shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
                    <th className="px-2 py-1.5 text-left">Number</th>
                    <th className="px-2 py-1.5 text-left">Subject</th>
                    <th className="px-2 py-1.5 text-left">Status</th>
                    <th className="px-2 py-1.5 text-left">Priority</th>
                    <th className="px-2 py-1.5 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const isOpen = ["open", "pending"].includes(t.status);
                    return (
                      <tr
                        key={t.id}
                        className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                          isOpen ? "bg-blue-50/30" : ""
                        }`}
                        onClick={() => router.push(`/support-tickets/${t.id}`)}
                        data-testid={`support-row-${t.id}`}
                      >
                        <td className="px-2 py-1.5 font-mono text-xs text-[#00823b]">{t.number}</td>
                        <td className={`px-2 py-1.5 ${isOpen ? "font-semibold" : "font-medium"}`}>
                          {t.subject}
                        </td>
                        <td className="px-2 py-1.5">
                          <SupportStatusBadge value={t.status} />
                        </td>
                        <td className="px-2 py-1.5">
                          <SupportPriorityBadge value={t.priority} />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] text-slate-500">
                          {t.updated_at ? new Date(t.updated_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!loading && !rows.length && (
              <div className="px-3 py-6 text-sm text-slate-500">No tickets yet</div>
            )}
            {loading && <div className="px-3 py-6 text-sm text-slate-500">Loading…</div>}
          </CardContent>
        </Card>
      </div>
    </AddEditPageShell>
  );
}

export default function SupportTicketsPage() {
  return (
    <ProtectedRoute>
      <SupportTicketsContent />
    </ProtectedRoute>
  );
}
