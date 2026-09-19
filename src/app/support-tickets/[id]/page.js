"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/utils/toast";
import apiClient from "@/lib/api/axios";
import {
  getSupportLimits,
  getSupportTicket,
  replySupportTicket,
} from "@/services/supportTicketsService";

function SupportTicketDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [limits, setLimits] = useState({
    max_attachment_bytes: 5 * 1024 * 1024,
    max_attachments_per_message: 5,
  });

  const load = async () => {
    try {
      const res = await getSupportTicket(id);
      setData(res);
    } catch (e) {
      toastError(e?.response?.data?.message || e?.message || "Failed to load ticket");
    }
  };

  useEffect(() => {
    load();
    getSupportLimits()
      .then((lim) => lim && setLimits(lim))
      .catch(() => {});
  }, [id]);

  const ticket = data?.ticket;
  const messages = data?.messages || [];
  const maxFiles = limits.max_attachments_per_message || 5;
  const maxBytes = limits.max_attachment_bytes || 5 * 1024 * 1024;
  const closed = ["resolved", "closed"].includes(ticket?.status);

  const handleDownload = async (fileId, name) => {
    try {
      const res = await apiClient.get(`/support-tickets/files/${encodeURIComponent(fileId)}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "attachment";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toastError(e?.response?.data?.message || e?.message || "Download failed");
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (files.length > maxFiles) {
      toastError(`Max ${maxFiles} files`);
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
      await replySupportTicket(id, { body: body.trim(), files });
      toastSuccess("Reply sent");
      setBody("");
      setFiles([]);
      load();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Reply failed");
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) {
    return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="space-y-2 p-3" data-testid="support-ticket-detail">
      <button
        type="button"
        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
        onClick={() => router.push("/support-tickets")}
      >
        ← Back to tickets
      </button>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-mono text-xs text-blue-700">{ticket.number}</div>
            <h1 className="text-base font-semibold text-slate-900">{ticket.subject}</h1>
            <div className="mt-1 text-xs text-slate-500 capitalize">
              Status: {ticket.status} · Priority: {ticket.priority}
              {ticket.category ? ` · ${ticket.category}` : ""}
            </div>
            <p className="mt-1 text-[11px] text-slate-500" data-testid="support-managed-hint">
              Status is managed by TechHind Support. You can reply while the ticket is open.
            </p>
          </div>
          <span
            className={`inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold capitalize border ${
              closed
                ? "bg-slate-50 text-slate-600 border-slate-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {ticket.status}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="px-3 py-2" data-testid={`support-msg-${m.id}`}>
            <div className="mb-1 flex gap-2 text-[11px] text-slate-500">
              <span className="uppercase font-semibold">{m.author_type}</span>
              <span>{m.author_name}</span>
              <span className="font-mono">
                {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap text-slate-800">{m.body}</div>
            {(m.attachments || []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {m.attachments.map((a) => (
                  <button
                    key={a.file_id}
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-700 border border-slate-200 rounded px-1.5 py-0.5 hover:bg-slate-50"
                    onClick={() => handleDownload(a.file_id, a.name)}
                    data-testid={`support-file-${a.file_id}`}
                  >
                    ⬇ {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!closed && (
        <form onSubmit={handleReply} className="rounded-md border border-slate-200 bg-white p-3 space-y-2">
          <textarea
            className="w-full rounded border px-2 py-1.5 text-sm min-h-[72px]"
            placeholder="Add a reply…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid="support-reply-body"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs text-slate-600 cursor-pointer">
              Attach (max {maxFiles} × {(maxBytes / (1024 * 1024)).toFixed(0)}MB)
              <input
                type="file"
                multiple
                className="ml-2 text-xs"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, maxFiles))}
              />
            </label>
            <Button type="submit" size="sm" disabled={busy || !body.trim()} data-testid="support-reply-submit">
              Send reply
            </Button>
          </div>
        </form>
      )}
      {closed && (
        <p className="text-xs text-slate-500" data-testid="support-closed-note">
          This ticket is {ticket.status}. Contact TechHind Support if you need it reopened.
        </p>
      )}
    </div>
  );
}

export default function SupportTicketDetailPage() {
  return (
    <ProtectedRoute>
      <SupportTicketDetailContent />
    </ProtectedRoute>
  );
}
