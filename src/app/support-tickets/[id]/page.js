"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/utils/toast";
import {
  getSupportLimits,
  getSupportTicket,
  replySupportTicket,
} from "@/services/supportTicketsService";
import SupportAttachmentList, {
  SupportFileChipList,
  SupportFileDropzone,
  SupportPriorityBadge,
  SupportStatusBadge,
} from "@/components/support/SupportAttachmentViewer";

const POLL_MS = 20000;

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
  const loadInFlight = useRef(false);
  const threadEndRef = useRef(null);

  const load = useCallback(
    async ({ silent } = {}) => {
      if (loadInFlight.current) return;
      loadInFlight.current = true;
      try {
        const res = await getSupportTicket(id);
        setData(res);
      } catch (e) {
        if (!silent) {
          toastError(e?.response?.data?.message || e?.message || "Failed to load ticket");
        }
      } finally {
        loadInFlight.current = false;
      }
    },
    [id]
  );

  useEffect(() => {
    load();
    getSupportLimits()
      .then((lim) => lim && setLimits(lim))
      .catch(() => {});
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      load({ silent: true });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const ticket = data?.ticket;
  const messages = data?.messages || [];
  const maxFiles = limits.max_attachments_per_message || 5;
  const maxBytes = limits.max_attachment_bytes || 5 * 1024 * 1024;
  const isTerminal = ["resolved", "closed"].includes(ticket?.status);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleQueueFiles = (incoming) => {
    if (!incoming?.length) return;
    setFiles((prev) => [...prev, ...incoming].slice(0, maxFiles));
  };

  const handleRemoveQueued = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!body.trim() && !files.length) return;
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
    const wasTerminal = isTerminal;
    setBusy(true);
    try {
      await replySupportTicket(id, { body: body.trim() || "(attachment)", files });
      toastSuccess(wasTerminal ? "Reply sent — ticket reopened" : "Reply sent");
      setBody("");
      setFiles([]);
      await load();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Reply failed");
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) {
    return (
      <AddEditPageShell title="Support ticket" listHref="/support-tickets" listLabel="Tickets">
        <div className="p-3 text-sm text-slate-500">Loading…</div>
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell
      title={ticket.number || "Support ticket"}
      listHref="/support-tickets"
      listLabel="Tickets"
      className="gap-2"
    >
      <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-2" data-testid="support-ticket-detail">
        <Card className="shrink-0 border-slate-200 shadow-none">
          <CardHeader className="space-y-1 p-3 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-[#00823b]">{ticket.number}</div>
                <CardTitle className="text-base font-semibold text-slate-900">{ticket.subject}</CardTitle>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] capitalize text-slate-500">
                  {ticket.category ? <span>{ticket.category}</span> : null}
                </div>
                <p className="mt-1 text-[11px] text-slate-500" data-testid="support-managed-hint">
                  {isTerminal
                    ? "This ticket is resolved/closed. Reply to reopen it with TechHind Support."
                    : "Status is managed by TechHind Support. You can reply while the ticket is open."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <SupportPriorityBadge value={ticket.priority} />
                <SupportStatusBadge value={ticket.status} />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="flex min-h-[220px] flex-1 flex-col border-slate-200 shadow-none">
          <CardHeader className="shrink-0 border-b border-slate-100 p-0">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Conversation
              <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">
                ({messages.length})
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 overflow-y-auto bg-slate-50/40 p-2">
            {messages.map((m) => {
              const isSupport = m.author_type === "support";
              return (
                <div
                  key={m.id}
                  className={`flex ${isSupport ? "justify-start" : "justify-end"}`}
                  data-testid={`support-msg-${m.id}`}
                >
                  <div
                    className={`max-w-[min(100%,28rem)] rounded-lg border px-2.5 py-1.5 shadow-sm ${
                      isSupport
                        ? "border-slate-200 bg-white"
                        : "border-[#1b365d] bg-[#1b365d] text-white"
                    }`}
                  >
                    <div
                      className={`mb-1 flex flex-wrap items-center gap-1.5 text-[10px] ${
                        isSupport ? "text-slate-500" : "text-white/70"
                      }`}
                    >
                      <span
                        className={`rounded border px-1 py-0.5 font-semibold uppercase tracking-wider ${
                          isSupport
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-white/25 bg-white/15 text-white"
                        }`}
                      >
                        {m.author_type}
                      </span>
                      <span className={`font-medium ${isSupport ? "text-slate-700" : "text-white/90"}`}>
                        {m.author_name}
                      </span>
                      <span className="font-mono">
                        {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                      </span>
                    </div>
                    {m.body && m.body !== "(attachment)" && (
                      <div
                        className={`whitespace-pre-wrap text-sm ${
                          isSupport ? "text-slate-800" : "text-white"
                        }`}
                      >
                        {m.body}
                      </div>
                    )}
                    <SupportAttachmentList attachments={m.attachments} />
                  </div>
                </div>
              );
            })}
            <div ref={threadEndRef} />
          </CardContent>
        </Card>

        <form
          onSubmit={handleReply}
          className="shrink-0 space-y-2 rounded-md border border-slate-200 bg-white p-3"
          data-testid="support-reply-form"
        >
          {isTerminal && (
            <p className="text-xs text-amber-700" data-testid="support-reopen-note">
              Sending a reply will reopen this ticket.
            </p>
          )}
          <Textarea
            className="min-h-[72px] text-sm"
            placeholder={isTerminal ? "Reply to reopen…" : "Add a reply…"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid="support-reply-body"
          />
          <SupportFileDropzone
            onFiles={handleQueueFiles}
            disabled={busy}
            maxFiles={maxFiles}
            already={files.length}
            maxBytes={maxBytes}
            hint={`Drop, paste, or click (max ${maxFiles} × ${(maxBytes / (1024 * 1024)).toFixed(0)}MB)`}
            inputTestId="support-reply-files"
            dropzoneTestId="support-reply-dropzone"
          />
          <SupportFileChipList files={files} onRemove={handleRemoveQueued} disabled={busy} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/support-tickets")}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || (!body.trim() && !files.length)}
              data-testid="support-reply-submit"
            >
              {isTerminal ? "Reply & reopen" : "Send reply"}
            </Button>
          </div>
        </form>
      </div>
    </AddEditPageShell>
  );
}

export default function SupportTicketDetailPage() {
  return (
    <ProtectedRoute>
      <SupportTicketDetailContent />
    </ProtectedRoute>
  );
}
