"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import adminAxios from "@/lib/api/adminAxios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import ModeBadge from "../components/ModeBadge";
import { toastSuccess, toastError } from "@/utils/toast";

export default function AdminTenantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [tenant, setTenant] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageMonth, setUsageMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminAxios.get(`/admin/tenants/${id}`);
        if (!cancelled) setTenant(res?.data?.result ?? res?.data);
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message || err.message || "Failed to load tenant";
          setError(msg);
          toastError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAxios.get(`/admin/tenants/${id}/usage?month=${usageMonth}`);
        if (!cancelled) setUsage(res?.data?.result ?? res?.data);
      } catch {
        if (!cancelled) setUsage(null);
      }
    })();
    return () => { cancelled = true; };
  }, [id, usageMonth]);

  const handleStatusToggle = async () => {
    if (!tenant) return;
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    setActionLoading(true);
    try {
      await adminAxios.patch(`/admin/tenants/${id}`, { status: newStatus });
      toastSuccess("Tenant status updated");
      setTenant((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Update failed";
      setError(msg);
      toastError(msg);
    } finally {
      setActionLoading(false);
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

  if (loading && !tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/tenants">← Tenants</Link>
        </Button>
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/tenants">← Tenants</Link>
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/tenants">← Tenants</Link>
        </Button>
        <p className="text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  const br = tenant.billing_readiness ?? {};
  const sharedBilling = br.shared_billing ?? tenant.mode === "shared";
  const dedicatedBilling = br.dedicated_billing ?? tenant.mode === "dedicated";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/tenants">← Tenants</Link>
          </Button>
          <h1 className="text-2xl font-semibold">{tenant.tenant_key}</h1>
          <ModeBadge mode={tenant.mode} />
          <StatusBadge status={tenant.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/tenants/${id}/edit`}>Edit</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={handleStatusToggle}
          >
            {tenant.status === "active" ? "Suspend" : "Activate"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Tenant key:</span> {tenant.tenant_key}</p>
          <p><span className="text-muted-foreground">Mode:</span> {tenant.mode}</p>
          <p><span className="text-muted-foreground">Status:</span> {tenant.status}</p>
          <p><span className="text-muted-foreground">Created:</span> {formatDate(tenant.created_at)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Infrastructure (read-only)</CardTitle>
          <CardDescription>Database and bucket names only; no credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Database:</span> {tenant.db_name ?? "—"}</p>
          <p><span className="text-muted-foreground">Bucket:</span> {tenant.bucket_name ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage summary</CardTitle>
          <CardDescription>Monthly usage from customer_usage_daily.</CardDescription>
          <div className="pt-2">
            <Select value={usageMonth} onValueChange={setUsageMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  return <SelectItem key={v} value={v}>{v}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {usage ? (
            <>
              <p><span className="text-muted-foreground">API requests:</span> {usage.api_requests ?? 0}</p>
              <p><span className="text-muted-foreground">PDFs generated:</span> {usage.pdf_generated ?? 0}</p>
              <p><span className="text-muted-foreground">Active users:</span> {usage.active_users ?? 0}</p>
              <p><span className="text-muted-foreground">Storage (GB):</span> {usage.storage_gb ?? 0}</p>
              {usage.usage_score != null && (
                <p><span className="text-muted-foreground">Usage score:</span> {usage.usage_score}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No usage data for this month.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing readiness</CardTitle>
          <CardDescription>Derived from tenant mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Included in shared billing:</span> {sharedBilling ? "Yes" : "No"}</p>
          <p><span className="text-muted-foreground">Dedicated billing:</span> {dedicatedBilling ? "Yes" : "No"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
