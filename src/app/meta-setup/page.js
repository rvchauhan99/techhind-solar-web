"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  IconBrandFacebook,
  IconRefresh,
  IconTrash,
  IconPlus,
  IconWorld,
  IconForms,
  IconCloudDownload,
  IconPlugConnected,
  IconPlugConnectedX,
  IconHome,
  IconChevronRight,
  IconChevronDown,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import { toastSuccess, toastError } from "@/utils/toast";
import metaService from "@/services/metaService";
import Select, { MenuItem } from "@/components/common/Select";
import MultiSelect from "@/components/common/MultiSelect";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { IconUsers } from "@tabler/icons-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const isExpired = (at) => at && new Date(at) < new Date();

// ─── Badges ───────────────────────────────────────────────────────────────────

function AccountStatusBadge({ active, expired }) {
  if (expired)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
        <IconAlertCircle className="h-3 w-3" /> Token expired
      </span>
    );
  if (active)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <IconCheck className="h-3 w-3" /> Connected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      Inactive
    </span>
  );
}

function WebhookBadge({ subscribed }) {
  return subscribed ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      <IconPlugConnected className="h-3 w-3" /> Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Not subscribed
    </span>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
      }`}
    >
      {label}
    </span>
  );
}

// ─── FormRow ──────────────────────────────────────────────────────────────────

function formatManagerSummary(form) {
  const managers = form.form_managers || [];
  if (managers.length === 0) return null;
  const names = managers.map((m) => m.name).filter(Boolean).join(", ");
  if (managers.length === 1) return `Manager: ${names}`;
  return `Managers: ${names} (round-robin)`;
}

function FormRow({ form, onConfigure }) {
  const [pulling, setPulling] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const managerSummary = formatManagerSummary(form);

  const handlePull = async () => {
    setPulling(true);
    setLastResult(null);
    try {
      const res = await metaService.syncLeads(form.id);
      const msg = res?.message || `${res?.data?.created ?? 0} new leads imported`;
      toastSuccess(msg);
      setLastResult({ type: "success", msg });
    } catch (err) {
      const msg = err?.response?.data?.message || "Lead pull failed";
      toastError(msg);
      setLastResult({ type: "error", msg });
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{form.form_name || "Untitled Form"}</p>
        <p className="text-xs text-muted-foreground">
          Form ID: {form.form_id}
          {form.form_status ? ` · ${form.form_status}` : ""}
        </p>
        {managerSummary ? (
          <p className="mt-0.5 text-xs text-blue-700">
            {managerSummary}
            {onConfigure ? (
              <>
                {" · "}
                <button
                  type="button"
                  className="font-medium underline hover:no-underline"
                  onClick={() => onConfigure(form)}
                >
                  Configure
                </button>
              </>
            ) : null}
          </p>
        ) : onConfigure ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            No auto-assignment ·{" "}
            <button
              type="button"
              className="font-medium text-blue-700 underline hover:no-underline"
              onClick={() => onConfigure(form)}
            >
              Configure
            </button>
          </p>
        ) : null}
        {lastResult && (
          <p
            className={`mt-0.5 text-xs ${lastResult.type === "success" ? "text-green-600" : "text-red-500"}`}
          >
            {lastResult.msg}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={pulling}
        onClick={handlePull}
        className="ml-3 shrink-0"
      >
        <IconCloudDownload className="mr-1 h-3.5 w-3.5" />
        {pulling ? "Pulling…" : "Pull Leads"}
      </Button>
    </div>
  );
}

// ─── PageRow ──────────────────────────────────────────────────────────────────

function PageRow({ page, onChanged, onConfigureForm }) {
  const [expanded, setExpanded] = useState(false);
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsSyncing, setFormsSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  const loadForms = useCallback(async () => {
    setFormsLoading(true);
    try {
      const data = await metaService.listForms(page.id);
      setForms(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to load forms");
    } finally {
      setFormsLoading(false);
    }
  }, [page.id]);

  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true);
    try {
      const data = await metaService.pageReadiness(page.id);
      setReadiness(data);
    } catch (err) {
      setReadiness(null);
      toastError(err?.response?.data?.message || "Failed to load readiness diagnostics");
    } finally {
      setReadinessLoading(false);
    }
  }, [page.id]);

  const handleExpand = () => {
    if (!expanded && forms.length === 0) loadForms();
    if (!expanded && !readiness) loadReadiness();
    setExpanded((v) => !v);
  };

  const handleSyncForms = async () => {
    setFormsSyncing(true);
    try {
      const res = await metaService.syncForms(page.id);
      toastSuccess(res?.message || "Forms synced from Facebook");
      loadForms();
      loadReadiness();
      if (!expanded) setExpanded(true);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to sync forms");
    } finally {
      setFormsSyncing(false);
    }
  };

  const handleWebhookToggle = async () => {
    setToggling(true);
    try {
      if (page.is_subscribed) {
        await metaService.unsubscribePage(page.id);
        toastSuccess("Webhook unsubscribed — live leads paused");
      } else {
        await metaService.subscribePage(page.id);
        toastSuccess("Webhook subscribed — real-time leads enabled!");
      }
      onChanged?.();
      loadReadiness();
    } catch (err) {
      toastError(err?.response?.data?.message || "Webhook action failed");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button
          className="flex min-w-0 items-center gap-2 text-sm font-medium hover:underline"
          onClick={handleExpand}
        >
          {expanded ? (
            <IconChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <IconChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <IconWorld className="h-4 w-4 shrink-0 text-blue-500" />
          <span className="truncate">{page.page_name || page.page_id}</span>
        </button>
        <div className="flex items-center gap-2">
          <WebhookBadge subscribed={page.is_subscribed} />
          <Button
            size="sm"
            variant="outline"
            disabled={formsSyncing}
            onClick={handleSyncForms}
          >
            <IconForms className="mr-1 h-3.5 w-3.5" />
            {formsSyncing ? "Syncing…" : "Sync Forms"}
          </Button>
          <Button
            size="sm"
            variant={page.is_subscribed ? "outline" : "default"}
            className={page.is_subscribed ? "text-destructive border-destructive/50 hover:bg-destructive/10" : ""}
            disabled={toggling}
            onClick={handleWebhookToggle}
          >
            {page.is_subscribed ? (
              <>
                <IconPlugConnectedX className="mr-1 h-3.5 w-3.5" />
                {toggling ? "Saving…" : "Stop Live"}
              </>
            ) : (
              <>
                <IconPlugConnected className="mr-1 h-3.5 w-3.5" />
                {toggling ? "Saving…" : "Enable Live"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Forms section */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3 space-y-2">
          {readinessLoading ? (
            <p className="text-xs text-muted-foreground">Checking diagnostics…</p>
          ) : readiness ? (
            <div className="rounded-md border border-border bg-background p-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill ok={!!readiness?.checks?.permission_checks?.ok} label="Permissions" />
                <StatusPill ok={!!readiness?.checks?.page_task_checks?.ok} label="Page Tasks" />
                <StatusPill ok={!!readiness?.checks?.subscription_checks?.ok} label="Webhook" />
                <StatusPill ok={!!readiness?.checks?.ready_for_auto_sync} label="Auto Sync Ready" />
              </div>
              {Array.isArray(readiness?.missing_scopes) && readiness.missing_scopes.length > 0 && (
                <p className="text-xs text-orange-700">
                  Missing scopes: {readiness.missing_scopes.join(", ")}. Reconnect account to grant these.
                </p>
              )}
              {Array.isArray(readiness?.recommendations) && readiness.recommendations.length > 0 && (
                <p className="text-xs text-muted-foreground">{readiness.recommendations[0]}</p>
              )}
            </div>
          ) : null}

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Lead Forms
          </p>
          {formsLoading ? (
            <p className="text-sm text-muted-foreground">Loading forms…</p>
          ) : forms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No forms found. Click <strong>"Sync Forms"</strong> to fetch from Facebook.
            </div>
          ) : (
            forms.map((form) => (
              <FormRow
                key={form.id}
                form={form}
                onConfigure={onConfigureForm ? () => onConfigureForm(page, form) : null}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Form Auto Assignment ─────────────────────────────────────────────────────

function FormAutoAssignmentSection({ accounts, focus, sectionRef, onSaved }) {
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [managerIds, setManagerIds] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPages = useCallback(async () => {
    if (!accounts?.length) {
      setPages([]);
      return;
    }
    setPagesLoading(true);
    try {
      const results = await Promise.all(
        accounts.map((acc) => metaService.listPages(acc.id).catch(() => []))
      );
      const merged = results.flat().filter(Boolean);
      const byId = new Map();
      for (const page of merged) {
        if (page?.id != null) byId.set(page.id, page);
      }
      setPages(Array.from(byId.values()));
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to load pages");
      setPages([]);
    } finally {
      setPagesLoading(false);
    }
  }, [accounts]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (focus?.pageId) {
      setSelectedPageId(String(focus.pageId));
    }
    if (focus?.formId) {
      setSelectedFormId(String(focus.formId));
    }
    if (focus?.pageId || focus?.formId) {
      sectionRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focus, sectionRef]);

  useEffect(() => {
    if (!selectedPageId) {
      setForms([]);
      setSelectedFormId("");
      return;
    }
    let cancelled = false;
    setFormsLoading(true);
    metaService
      .listForms(Number(selectedPageId))
      .then((data) => {
        if (!cancelled) setForms(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          toastError(err?.response?.data?.message || "Failed to load forms");
          setForms([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFormsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPageId]);

  useEffect(() => {
    if (!selectedFormId) {
      setManagerIds([]);
      setManagerOptions([]);
      return;
    }
    let cancelled = false;
    setConfigLoading(true);
    metaService
      .getFormAutoAssignment(Number(selectedFormId))
      .then((data) => {
        if (cancelled) return;
        const ids = Array.isArray(data?.user_ids) ? data.user_ids : [];
        setManagerIds(ids);
        const opts = (data?.managers || []).map((m) => ({
          value: m.id,
          label: m.name || `User #${m.id}`,
        }));
        setManagerOptions(opts);
      })
      .catch((err) => {
        if (!cancelled) {
          toastError(err?.response?.data?.message || "Failed to load assignment config");
          setManagerIds([]);
          setManagerOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFormId]);

  const handleSave = async () => {
    if (!selectedFormId) {
      toastError("Select a lead form first");
      return;
    }
    setSaving(true);
    try {
      await metaService.saveFormAutoAssignment(Number(selectedFormId), {
        user_ids: managerIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
      });
      toastSuccess("Form auto-assignment saved");
      onSaved?.();
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  if (!accounts?.length) return null;

  return (
    <div
      ref={sectionRef}
      className="relative z-30 mb-4 shrink-0 overflow-visible rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
    >
        <div className="mb-2 flex items-center gap-2">
          <IconUsers className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold">Form-wise Auto Assignment</h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Assign incoming Meta leads to one or more Form Managers. Multiple managers use round-robin.
        </p>
        <div className="relative z-30 grid gap-2 overflow-visible md:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Meta Page"
            size="small"
            value={selectedPageId}
            onChange={(e) => {
              setSelectedPageId(e.target.value);
              setSelectedFormId("");
            }}
            disabled={pagesLoading}
            displayEmpty
          >
            <MenuItem value="">
              <em>{pagesLoading ? "Loading pages…" : "Select page"}</em>
            </MenuItem>
            {pages.map((page) => (
              <MenuItem key={page.id} value={String(page.id)}>
                {page.page_name || page.page_id}
              </MenuItem>
            ))}
          </Select>
          <Select
            label="Meta Lead Form"
            size="small"
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            disabled={!selectedPageId || formsLoading}
            displayEmpty
          >
            <MenuItem value="">
              <em>
                {!selectedPageId
                  ? "Select page first"
                  : formsLoading
                    ? "Loading forms…"
                    : "Select form"}
              </em>
            </MenuItem>
            {forms.map((form) => (
              <MenuItem key={form.id} value={String(form.id)}>
                {form.form_name || form.form_id}
              </MenuItem>
            ))}
          </Select>
          <div className="relative z-40 overflow-visible md:col-span-2">
            <MultiSelect
              name="form_managers"
              label="Form Managers"
              size="small"
              placeholder="Select one or more managers"
              value={managerIds}
              options={managerOptions}
              searchable
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
              }
              disabled={!selectedFormId || configLoading}
              onChange={(e) => {
                const next = Array.isArray(e.target.value) ? e.target.value : [];
                setManagerIds(next);
                setManagerOptions((prev) => {
                  const map = new Map((prev || []).map((o) => [String(o.value), o]));
                  for (const id of next) {
                    if (!map.has(String(id))) {
                      map.set(String(id), { value: id, label: `User #${id}` });
                    }
                  }
                  return Array.from(map.values());
                });
              }}
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={!selectedFormId || saving || configLoading} onClick={handleSave}>
            {saving ? "Saving…" : "Save Configuration"}
          </Button>
        </div>
    </div>
  );
}

// ─── AccountSection ───────────────────────────────────────────────────────────

function AccountSection({ account, onDisconnect, onConfigureForm }) {
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesSyncing, setPagesSyncing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const expired = isExpired(account.expires_at);

  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const data = await metaService.listPages(account.id);
      setPages(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to load pages");
    } finally {
      setPagesLoading(false);
    }
  }, [account.id]);

  const handleExpand = () => {
    if (!expanded && pages.length === 0) loadPages();
    setExpanded((v) => !v);
  };

  const handleSyncPages = async () => {
    setPagesSyncing(true);
    try {
      const res = await metaService.syncPages(account.id);
      toastSuccess(res?.message || "Pages synced from Facebook");
      loadPages();
      if (!expanded) setExpanded(true);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to sync pages");
    } finally {
      setPagesSyncing(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Account header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1877F2]/10">
            <IconBrandFacebook className="h-6 w-6 text-[#1877F2]" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{account.display_name || "Facebook Account"}</p>
            <p className="text-xs text-muted-foreground">
              User ID: {account.fb_user_id}
              {account.expires_at ? ` · Expires ${fmtDate(account.expires_at)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AccountStatusBadge active={account.is_active} expired={expired} />
          <Button
            size="sm"
            variant="outline"
            disabled={pagesSyncing}
            onClick={handleSyncPages}
          >
            <IconRefresh className="mr-1 h-3.5 w-3.5" />
            {pagesSyncing ? "Syncing…" : "Sync Pages"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDisconnect(account)}
          >
            <IconTrash className="mr-1 h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Pages + expand */}
      <div className="px-5 py-4">
        <button
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={handleExpand}
        >
          {expanded ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
          Pages {pages.length > 0 ? `(${pages.length})` : ""}
        </button>

        {expanded && (
          <div className="space-y-3">
            {pagesLoading ? (
              <p className="text-sm text-muted-foreground">Loading pages…</p>
            ) : pages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No pages found. Click <strong>"Sync Pages"</strong> to fetch from Facebook.
              </div>
            ) : (
              pages.map((page) => (
                <PageRow
                  key={page.id}
                  page={page}
                  onChanged={loadPages}
                  onConfigureForm={onConfigureForm}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MetaSetupPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disconnectDialog, setDisconnectDialog] = useState({ open: false, account: null });
  const [disconnecting, setDisconnecting] = useState(false);
  const [assignmentFocus, setAssignmentFocus] = useState({ pageId: null, formId: null });
  const [assignmentRefreshKey, setAssignmentRefreshKey] = useState(0);
  const assignmentSectionRef = useRef(null);

  const handleConfigureForm = useCallback((page, form) => {
    setAssignmentFocus({ pageId: page.id, formId: form.id });
  }, []);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await metaService.listAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to load accounts";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = async () => {
    try {
      const url = await metaService.initiateOAuth();
      if (url) {
        window.location.href = url;
      } else {
        toastError("Failed to initiate Facebook login: URL not found");
      }
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to initiate Facebook login");
    }
  };

  const handleDisconnectConfirm = async () => {
    const { account } = disconnectDialog;
    if (!account) return;
    setDisconnecting(true);
    try {
      await metaService.disconnectAccount(account.id);
      toastSuccess(`${account.display_name || "Account"} disconnected`);
      setDisconnectDialog({ open: false, account: null });
      fetchAccounts();
    } catch (err) {
      toastError(err?.response?.data?.message || "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col overflow-y-auto">
        {/* ── Header ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <IconBrandFacebook className="h-6 w-6 text-[#1877F2]" />
              Meta Lead Ads Setup
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your Facebook accounts to automatically sync Lead Ads into Marketing Leads.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              style={{ backgroundColor: "#1877F2" }}
              className="hover:opacity-90"
              onClick={handleConnect}
            >
              <IconPlus className="mr-2 h-4 w-4" />
              Connect Facebook Account
            </Button>
            <Button variant="ghost" onClick={() => router.push("/home")}>
              <IconHome className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="mb-5 shrink-0 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-800">How to set up in 4 steps</p>
          <ol className="space-y-1 text-sm text-blue-700">
            <li>
              <span className="font-medium">1. Connect</span> — Click "Connect Facebook Account" and log in.
            </li>
            <li>
              <span className="font-medium">2. Sync Pages</span> — Fetch your Facebook Pages from Meta.
            </li>
            <li>
              <span className="font-medium">3. Enable Live</span> — Subscribe a page to receive leads in real time.
            </li>
            <li>
              <span className="font-medium">4. Pull Leads</span> — Import past leads from any form instantly.
            </li>
          </ol>
        </div>

        <div className="mb-5 shrink-0 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">Meta prerequisites</p>
          <ul className="space-y-0.5 text-xs text-amber-700">
            <li>
              Webhook URL is platform-global (one URL for all tenants, no tenant_key in the URL).
              Your admin configures it once in Meta Developer Console.
            </li>
            <li>Meta app must subscribe to Page object with leadgen field; verify token must match backend env.</li>
            <li>After Sync Pages / Sync Forms, routes are registered automatically for live lead delivery.</li>
            <li>If scopes are missing in diagnostics, reconnect account and approve all requested permissions.</li>
          </ul>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
            Loading connected accounts…
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
            <IconBrandFacebook className="mb-4 h-14 w-14 text-[#1877F2]/30" />
            <p className="text-lg font-semibold">No accounts connected yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your Facebook account to start syncing Lead Ads.
            </p>
            <Button
              className="mt-6"
              style={{ backgroundColor: "#1877F2" }}
              onClick={handleConnect}
            >
              <IconPlus className="mr-2 h-4 w-4" />
              Connect Facebook Account
            </Button>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-visible pb-6">
            <FormAutoAssignmentSection
              accounts={accounts}
              focus={assignmentFocus}
              sectionRef={assignmentSectionRef}
              onSaved={() => setAssignmentRefreshKey((k) => k + 1)}
            />
            {accounts.map((acc) => (
              <AccountSection
                key={`${acc.id}-${assignmentRefreshKey}`}
                account={acc}
                onDisconnect={(a) => setDisconnectDialog({ open: true, account: a })}
                onConfigureForm={handleConfigureForm}
              />
            ))}
          </div>
        )}

        {/* ── Disconnect dialog ── */}
        <AlertDialog
          open={disconnectDialog.open}
          onOpenChange={(open) =>
            !open && setDisconnectDialog({ open: false, account: null })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Facebook account?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes{" "}
                <strong>{disconnectDialog.account?.display_name || "this account"}</strong> and
                all its pages and forms. Leads already imported will not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={disconnecting}
                onClick={handleDisconnectConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
