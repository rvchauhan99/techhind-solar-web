"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import adminAxios from "@/lib/api/adminAxios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTenantNewPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    tenant_key: "",
    mode: "shared",
    status: "active",
    db_host: "",
    db_port: "5432",
    db_name: "",
    db_user: "",
    db_password: "",
    bucket_provider: "",
    bucket_name: "",
    bucket_region: "",
    bucket_endpoint: "",
    bucket_access_key: "",
    bucket_secret_key: "",
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        tenant_key: form.tenant_key.trim(),
        mode: form.mode,
        status: form.status,
      };
      if (form.mode === "shared") {
        payload.db_host = form.db_host.trim() || null;
        payload.db_port = form.db_port ? parseInt(form.db_port, 10) : null;
        payload.db_name = form.db_name.trim() || null;
        payload.db_user = form.db_user.trim() || null;
        payload.db_password = form.db_password || null;
        if (form.bucket_name?.trim()) {
          payload.bucket_provider = form.bucket_provider.trim() || null;
          payload.bucket_name = form.bucket_name.trim();
          payload.bucket_region = form.bucket_region.trim() || null;
          payload.bucket_endpoint = form.bucket_endpoint.trim() || null;
          payload.bucket_access_key = form.bucket_access_key || null;
          payload.bucket_secret_key = form.bucket_secret_key || null;
        }
      }
      const res = await adminAxios.post("/admin/tenants", payload);
      const created = res?.data?.result ?? res?.data;
      if (created?.id) {
        router.push(`/admin/tenants/${created.id}`);
      } else {
        router.push("/admin/tenants");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create tenant");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/tenants">← Tenants</Link>
        </Button>
        <h1 className="text-2xl font-semibold">Create tenant</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic info</CardTitle>
            <CardDescription>Tenant key must be unique.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_key">Tenant key *</Label>
              <Input
                id="tenant_key"
                value={form.tenant_key}
                onChange={(e) => update("tenant_key", e.target.value)}
                placeholder="e.g. acme"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => update("mode", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="dedicated">Dedicated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {form.mode === "shared" && (
          <Card>
            <CardHeader>
              <CardTitle>Database (shared)</CardTitle>
              <CardDescription>Required for shared mode. Backend will encrypt credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="db_host">Host</Label>
                  <Input
                    id="db_host"
                    value={form.db_host}
                    onChange={(e) => update("db_host", e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db_port">Port</Label>
                  <Input
                    id="db_port"
                    type="number"
                    value={form.db_port}
                    onChange={(e) => update("db_port", e.target.value)}
                    placeholder="5432"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="db_name">Database name *</Label>
                <Input
                  id="db_name"
                  value={form.db_name}
                  onChange={(e) => update("db_name", e.target.value)}
                  placeholder="tenant_db"
                  required={form.mode === "shared"}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="db_user">User *</Label>
                  <Input
                    id="db_user"
                    value={form.db_user}
                    onChange={(e) => update("db_user", e.target.value)}
                    placeholder="dbuser"
                    required={form.mode === "shared"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db_password">Password *</Label>
                  <Input
                    id="db_password"
                    type="password"
                    value={form.db_password}
                    onChange={(e) => update("db_password", e.target.value)}
                    placeholder="••••••"
                    required={form.mode === "shared"}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {form.mode === "shared" && (
          <Card>
            <CardHeader>
              <CardTitle>Bucket (optional)</CardTitle>
              <CardDescription>S3-compatible storage for this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bucket_name">Bucket name</Label>
                <Input
                  id="bucket_name"
                  value={form.bucket_name}
                  onChange={(e) => update("bucket_name", e.target.value)}
                  placeholder="my-bucket"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bucket_region">Region</Label>
                  <Input
                    id="bucket_region"
                    value={form.bucket_region}
                    onChange={(e) => update("bucket_region", e.target.value)}
                    placeholder="auto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bucket_endpoint">Endpoint</Label>
                  <Input
                    id="bucket_endpoint"
                    value={form.bucket_endpoint}
                    onChange={(e) => update("bucket_endpoint", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bucket_access_key">Access key</Label>
                <Input
                  id="bucket_access_key"
                  type="password"
                  value={form.bucket_access_key}
                  onChange={(e) => update("bucket_access_key", e.target.value)}
                  placeholder="••••••"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bucket_secret_key">Secret key</Label>
                <Input
                  id="bucket_secret_key"
                  type="password"
                  value={form.bucket_secret_key}
                  onChange={(e) => update("bucket_secret_key", e.target.value)}
                  placeholder="••••••"
                  autoComplete="off"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {form.mode === "dedicated" && (
          <Card>
            <CardHeader>
              <CardTitle>Dedicated tenant</CardTitle>
              <CardDescription>
                No database or bucket here. Ops will provision a separate backend for this tenant. You can mark the tenant as active; update mode or status later from the edit page.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create tenant"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/tenants">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
