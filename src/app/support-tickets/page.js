"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/utils/toast";
import {
  createSupportTicket,
  getSupportLimits,
  getSupportStatus,
  listSupportTickets,
} from "@/services/supportTicketsService";

function SupportTicketsContent() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
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
        files,
      });
      toastSuccess("Ticket created");
      setShowCreate(false);
      setSubject("");
      setBody("");
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
      <div className="p-4" data-testid="support-disabled">
        <h1 className="text-lg font-semibold text-slate-900">Support tickets</h1>
        <p className="mt-2 text-sm text-slate-600">
          Support tickets are not enabled for this environment yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3" data-testid="support-tickets-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900">Support tickets</h1>
        <Button
          size="sm"
          data-testid="support-new-btn"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "Cancel" : "New ticket"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5" data-testid="support-filters">
        <select
          className="h-7 rounded border px-2 text-xs"
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
          className="h-7 rounded border px-2 text-xs"
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

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-md border border-slate-200 bg-white p-3 space-y-2"
          data-testid="support-create-form"
        >
          <input
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            data-testid="support-subject"
          />
          <textarea
            className="w-full rounded border px-2 py-1.5 text-sm min-h-[72px]"
            placeholder="Describe your issue…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid="support-body"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded border px-2 py-1 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <label className="text-xs text-slate-600 cursor-pointer">
              Attach (max {maxFiles} × {(maxBytes / (1024 * 1024)).toFixed(0)}MB)
              <input
                type="file"
                multiple
                className="ml-2 text-xs"
                onChange={(e) =>
                  setFiles(Array.from(e.target.files || []).slice(0, maxFiles))
                }
              />
            </label>
            <Button type="submit" size="sm" disabled={busy} data-testid="support-create-submit">
              Submit
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
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
                  className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${
                    isOpen ? "bg-blue-50/30" : ""
                  }`}
                  onClick={() => router.push(`/support-tickets/${t.id}`)}
                  data-testid={`support-row-${t.id}`}
                >
                  <td className="px-2 py-1.5 font-mono text-xs text-blue-700">{t.number}</td>
                  <td className={`px-2 py-1.5 ${isOpen ? "font-semibold" : "font-medium"}`}>{t.subject}</td>
                  <td className="px-2 py-1.5 capitalize text-xs">{t.status}</td>
                  <td className="px-2 py-1.5 capitalize text-xs">{t.priority}</td>
                  <td className="px-2 py-1.5 font-mono text-[11px] text-slate-500">
                    {t.updated_at ? new Date(t.updated_at).toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !rows.length && (
          <div className="px-3 py-6 text-sm text-slate-500">No tickets yet</div>
        )}
        {loading && <div className="px-3 py-6 text-sm text-slate-500">Loading…</div>}
      </div>
    </div>
  );
}

export default function SupportTicketsPage() {
  return (
    <ProtectedRoute>
      <SupportTicketsContent />
    </ProtectedRoute>
  );
}
