"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/api/axios";
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
import { toastSuccess, toastError } from "@/utils/toast";
import {
  IconBrandFacebook,
  IconRefresh,
  IconTrash,
  IconWorld,
  IconForms,
  IconCloudDownload,
  IconPlugConnected,
  IconPlugConnectedX,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d) => {
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

const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ active, expired }) {
  if (expired)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-orange-500 font-medium">
        <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />
        Token Expired
      </span>
    );
  if (active)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
        Active
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
      <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
      Inactive
    </span>
  );
}

function SubscribedBadge({ subscribed }) {
  return subscribed ? (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      Webhook Active
    </span>
  ) : (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
      No Webhook
    </span>
  );
}

// ─── FormRow ──────────────────────────────────────────────────────────────────

function FormRow({ form, onSyncLeads, loading }) {
  return (
    <div className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{form.form_name || "Untitled Form"}</p>
        <p className="text-xs text-muted-foreground">
          ID: {form.form_id} {form.form_status ? `· ${form.form_status}` : ""}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => onSyncLeads(form.id)}
        title="Manually pull all leads for this form"
      >
        <IconCloudDownload className="mr-1 h-3.5 w-3.5" />
        Pull Leads
      </Button>
    </div>
  );
}

// ─── PageRow ──────────────────────────────────────────────────────────────────

function PageRow({ page, accountId, onPageAction }) {
  const [expanded, setExpanded] = useState(false);
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadForms = useCallback(async () => {
    setFormsLoading(true);
    try {
      const res = await axios.get(`/meta/pages/${page.id}/forms`);
      setForms(res?.data?.data ?? []);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to load forms");
    } finally {
      setFormsLoading(false);
    }
  }, [page.id]);

  const handleExpand = () => {
    if (!expanded && forms.length === 0) {
      loadForms();
    }
    setExpanded((v) => !v);
  };

  const handleSyncForms = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`/meta/pages/${page.id}/sync-forms`);
      toastSuccess(res?.data?.message || "Forms synced");
      loadForms();
      if (!expanded) setExpanded(true);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to sync forms");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWebhookToggle = async () => {
    setActionLoading(true);
    try {
      if (page.is_subscribed) {
        await axios.delete(`/meta/pages/${page.id}/subscribe`);
        toastSuccess("Webhook unsubscribed");
      } else {
        await axios.post(`/meta/pages/${page.id}/subscribe`);
        toastSuccess("Webhook subscribed! Real-time leads enabled.");
      }
      onPageAction(); // refresh parent
    } catch (err) {
      toastError(err?.response?.data?.message || "Webhook action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncLeads = async (formId) => {
    try {
      const res = await axios.post(`/meta/forms/${formId}/sync-leads`);
      toastSuccess(res?.data?.message || "Leads synced");
    } catch (err) {
      toastError(err?.response?.data?.message || "Lead sync failed");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          className="flex items-center gap-2 text-left text-sm font-medium hover:underline"
          onClick={handleExpand}
        >
          {expanded ? (
            <IconChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <IconChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <IconWorld className="h-4 w-4 text-blue-500" />
          {page.page_name || page.page_id}
        </button>
        <div className="flex items-center gap-2">
          <SubscribedBadge subscribed={page.is_subscribed} />
          <Button
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={handleSyncForms}
            title="Fetch forms from Facebook"
          >
            <IconForms className="mr-1 h-3.5 w-3.5" />
            Sync Forms
          </Button>
          <Button
            size="sm"
            variant={page.is_subscribed ? "destructive" : "default"}
            disabled={actionLoading}
            onClick={handleWebhookToggle}
            title={page.is_subscribed ? "Stop receiving live leads" : "Start receiving live leads"}
          >
            {page.is_subscribed ? (
              <>
                <IconPlugConnectedX className="mr-1 h-3.5 w-3.5" />
                Unsubscribe
              </>
            ) : (
              <>
                <IconPlugConnected className="mr-1 h-3.5 w-3.5" />
                Subscribe
              </>
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-3 pt-2 space-y-2">
          {formsLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading forms…</p>
          ) : forms.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No forms found. Click "Sync Forms" to fetch from Facebook.
            </p>
          ) : (
            forms.map((form) => (
              <FormRow
                key={form.id}
                form={form}
                onSyncLeads={handleSyncLeads}
                loading={false}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({ account, onDisconnect }) {
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const expired = isExpired(account.expires_at);

  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const res = await axios.get(`/meta/accounts/${account.id}/pages`);
      setPages(res?.data?.data ?? []);
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
    setActionLoading(true);
    try {
      const res = await axios.post(`/meta/accounts/${account.id}/sync-pages`);
      toastSuccess(res?.data?.message || "Pages synced from Facebook");
      loadPages();
      if (!expanded) setExpanded(true);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to sync pages");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Account header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
            <IconBrandFacebook className="h-5 w-5 text-[#1877F2]" />
          </div>
          <div>
            <p className="text-sm font-semibold">{account.display_name || "Facebook Account"}</p>
            <p className="text-xs text-muted-foreground">ID: {account.fb_user_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot active={account.is_active} expired={expired} />
          {account.expires_at && (
            <span className="text-xs text-muted-foreground">
              Expires: {formatDate(account.expires_at)}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={handleSyncPages}
          >
            <IconRefresh className="mr-1 h-3.5 w-3.5" />
            Sync Pages
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={actionLoading}
            onClick={() => onDisconnect(account)}
          >
            <IconTrash className="mr-1 h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Pages section */}
      <div className="px-5 py-4">
        <button
          className="mb-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={handleExpand}
        >
          {expanded ? <IconChevronDown className="h-3.5 w-3.5" /> : <IconChevronRight className="h-3.5 w-3.5" />}
          Pages ({pages.length || "?"})
        </button>

        {expanded && (
          <div className="space-y-2">
            {pagesLoading ? (
              <p className="text-xs text-muted-foreground">Loading pages…</p>
            ) : pages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No pages found. Click "Sync Pages" to fetch from Facebook.
              </p>
            ) : (
              pages.map((page) => (
                <PageRow
                  key={page.id}
                  page={page}
                  accountId={account.id}
                  onPageAction={loadPages}
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

export default function MetaIntegrationPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disconnectDialog, setDisconnectDialog] = useState({ open: false, account: null });
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/meta/accounts");
      setAccounts(res?.data?.data ?? []);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to load Facebook accounts";
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
        toastError("Failed to initiate Meta login: URL not found");
      }
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to initiate Meta login");
    }
  };

  const handleDisconnectConfirm = async () => {
    const { account } = disconnectDialog;
    if (!account) return;
    setDisconnecting(true);
    try {
      await axios.delete(`/meta/accounts/${account.id}`);
      toastSuccess(`${account.display_name || "Account"} disconnected`);
      setDisconnectDialog({ open: false, account: null });
      fetchAccounts();
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to disconnect account");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <IconBrandFacebook className="h-6 w-6 text-[#1877F2]" />
            Facebook Lead Ads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Facebook accounts to sync Lead Ads into your marketing leads.
          </p>
        </div>
        <Button onClick={handleConnect} className="bg-[#1877F2] hover:bg-[#166fe5] text-white">
          <IconBrandFacebook className="mr-2 h-4 w-4" />
          Connect Facebook Account
        </Button>
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium">How it works</p>
        <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
          <li>Click "Connect Facebook Account" and log in with your Facebook credentials.</li>
          <li>After connecting, click <strong>Sync Pages</strong> to fetch your Facebook Pages.</li>
          <li>For each page, click <strong>Subscribe</strong> to enable real-time lead delivery.</li>
          <li>Optionally click <strong>Sync Forms → Pull Leads</strong> to import existing leads.</li>
        </ol>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          Loading connected accounts…
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <IconBrandFacebook className="mx-auto mb-3 h-10 w-10 text-[#1877F2]/40" />
          <p className="font-medium">No Facebook accounts connected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click "Connect Facebook Account" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onDisconnect={(acc) => setDisconnectDialog({ open: true, account: acc })}
            />
          ))}
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      <AlertDialog
        open={disconnectDialog.open}
        onOpenChange={(open) => !open && setDisconnectDialog({ open: false, account: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Facebook account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <strong>{disconnectDialog.account?.display_name || "this account"}</strong> and all
              its linked pages and forms. Leads already imported will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectConfirm}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
