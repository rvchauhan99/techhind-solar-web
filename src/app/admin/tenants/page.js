"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import adminAxios from "@/lib/api/adminAxios";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import StatusBadge from "./components/StatusBadge";
import ModeBadge from "./components/ModeBadge";
import { IconPlus, IconEye, IconPencil, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";

export default function AdminTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, tenant: null, action: null });

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (modeFilter !== "all") params.set("mode", modeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await adminAxios.get(`/admin/tenants?${params.toString()}`);
      const list = res?.data?.result ?? res?.data ?? [];
      setTenants(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load tenants");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [modeFilter, statusFilter]);

  const handleStatusToggle = async (tenant) => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    setConfirmDialog({ open: true, tenant, action: "status", newStatus });
  };

  const confirmAction = async () => {
    const { tenant, action, newStatus } = confirmDialog;
    if (!tenant) return;
    setActionLoading(tenant.id);
    try {
      if (action === "status") {
        await adminAxios.patch(`/admin/tenants/${tenant.id}`, { status: newStatus });
      }
      setConfirmDialog({ open: false, tenant: null, action: null });
      await fetchTenants();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Button asChild>
          <Link href="/admin/tenants/new">
            <IconPlus className="mr-2 h-4 w-4" />
            Add tenant
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="shared">Shared</SelectItem>
            <SelectItem value="dedicated">Dedicated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading tenants…</div>
      ) : tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No tenants found. Add one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Tenant Key</th>
                <th className="px-4 py-3 text-left font-medium">Mode</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Database</th>
                <th className="px-4 py-3 text-left font-medium">Bucket</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{t.tenant_key ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ModeBadge mode={t.mode} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.db_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.bucket_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/tenants/${t.id}`)}
                      >
                        <IconEye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/tenants/${t.id}/edit`)}
                      >
                        <IconPencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading === t.id}
                        onClick={() => handleStatusToggle(t)}
                        title={t.status === "active" ? "Suspend" : "Activate"}
                      >
                        {t.status === "active" ? (
                          <IconPlayerPause className="h-4 w-4" />
                        ) : (
                          <IconPlayerPlay className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, tenant: null, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "status" && confirmDialog.newStatus === "suspended"
                ? "Suspend tenant?"
                : "Activate tenant?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.tenant?.tenant_key && (
                <>This will set tenant &quot;{confirmDialog.tenant.tenant_key}&quot; to {confirmDialog.newStatus}.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
