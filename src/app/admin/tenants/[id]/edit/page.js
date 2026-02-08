"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import ModeBadge from "../../components/ModeBadge";

export default function AdminTenantEditPage() {
  const params = useParams();
  const id = params?.id;
  const [tenant, setTenant] = useState(null);
  const [status, setStatus] = useState("active");
  const [mode, setMode] = useState("shared");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmUpgrade, setConfirmUpgrade] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminAxios.get(`/admin/tenants/${id}`);
        const t = res?.data?.result ?? res?.data;
        if (!cancelled && t) {
          setTenant(t);
          setStatus(t.status);
          setMode(t.mode);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || "Failed to load tenant");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = { status };
      if (tenant?.mode === "shared") {
        payload.mode = mode;
      }
      await adminAxios.patch(`/admin/tenants/${id}`, payload);
      setTenant((prev) => (prev ? { ...prev, status, mode } : null));
      if (payload.mode === "dedicated") setConfirmUpgrade(false);
      if (payload.status === "suspended") setConfirmSuspend(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const wantsSuspend = status === "suspended" && tenant?.status === "active";
  const wantsUpgrade = mode === "dedicated" && tenant?.mode === "shared";

  const doSubmit = () => {
    if (wantsSuspend && !confirmSuspend) {
      setConfirmSuspend(true);
      return;
    }
    if (wantsUpgrade && !confirmUpgrade) {
      setConfirmUpgrade(true);
      return;
    }
    handleSubmit({ preventDefault: () => {} });
  };

  if (loading && !tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/tenants/${id}`}>← Back</Link>
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

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/tenants/${id}`}>← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold">Edit tenant</h1>
        <ModeBadge mode={tenant.mode} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); doSubmit(); }} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Active tenants can receive traffic; suspended tenants are rejected.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {tenant.mode === "shared" && (
          <Card>
            <CardHeader>
              <CardTitle>Mode</CardTitle>
              <CardDescription>You can upgrade from shared to dedicated only. Cannot downgrade to shared.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="dedicated">Dedicated</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {tenant.mode === "dedicated" && (
          <Card>
            <CardHeader>
              <CardTitle>Mode</CardTitle>
              <CardDescription>Dedicated (read-only). Cannot change to shared.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Dedicated (read-only). Cannot change to shared.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/admin/tenants/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              The backend will reject traffic for this tenant. You can activate again from this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmSuspend(false);
                handleSubmit({ preventDefault: () => {} });
              }}
            >
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUpgrade} onOpenChange={setConfirmUpgrade}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to dedicated?</AlertDialogTitle>
            <AlertDialogDescription>
              This tenant will be marked as dedicated. Ensure a separate backend is provisioned for this tenant. You cannot change back to shared later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmUpgrade(false);
                handleSubmit({ preventDefault: () => {} });
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
