"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import * as hrmsService from "@/services/hrmsService";
import roleService from "@/services/roleMasterService";
import { listBranches } from "@/services/companyService";
import { useAuth } from "@/hooks/useAuth";

export default function HrmsEmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activateForm, setActivateForm] = useState({
    name: "",
    email: "",
    mobile_number: "",
    role_id: "",
    branch_ids: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await hrmsService.getEmployee(id);
      const data = res?.result ?? res?.data ?? res;
      setRow(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load");
      router.push("/hrms/employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    Promise.all([roleService.listRoleMasters({ page: 1, limit: 200 }), listBranches()])
      .then(([roleRes, branchRes]) => {
        const rolePayload = roleRes?.result ?? roleRes?.data ?? roleRes;
        const roleRows = rolePayload?.data || rolePayload?.rows || (Array.isArray(rolePayload) ? rolePayload : []);
        setRoles(roleRows);
        const defaultRole =
          roleRows.find((r) => String(r.name || "").toLowerCase() === "user") ||
          roleRows.find((r) => String(r.name || "").toLowerCase() === "employee");
        setActivateForm((f) => ({
          ...f,
          role_id: defaultRole ? String(defaultRole.id) : f.role_id,
        }));
        const bPayload = branchRes?.result ?? branchRes?.data ?? branchRes;
        setBranches(bPayload?.data || (Array.isArray(bPayload) ? bPayload : []));
      })
      .catch(() => {});
  }, []);

  const openActivate = () => {
    setActivateForm((f) => ({
      ...f,
      name: row?.user?.name || "",
      email: row?.user?.email || "",
      mobile_number: row?.user?.mobile_number || "",
    }));
    setShowActivate(true);
  };

  const onActivate = async (e) => {
    e.preventDefault();
    if (!activateForm.name.trim() || !activateForm.email.trim()) {
      toast.error("Name and work email required");
      return;
    }
    setBusy(true);
    try {
      await hrmsService.activateEmployee(id, {
        ...activateForm,
        role_id: activateForm.role_id || null,
        branch_ids: activateForm.branch_ids,
      });
      toast.success("Employee activated");
      setShowActivate(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Activate failed");
    } finally {
      setBusy(false);
    }
  };

  const onDeactivate = async () => {
    if (!window.confirm("Deactivate this employee? Login will be blocked.")) return;
    setBusy(true);
    try {
      await hrmsService.deactivateEmployee(id, {});
      toast.success("Employee deactivated");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Deactivate failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleBranch = (bid) => {
    const n = Number(bid);
    setActivateForm((f) => {
      const set = new Set((f.branch_ids || []).map(Number));
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return { ...f, branch_ids: [...set] };
    });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-3 text-sm text-muted-foreground">Loading…</div>
      </ProtectedRoute>
    );
  }

  if (!row) return null;

  return (
    <ProtectedRoute>
      <div className="p-3 max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">
              {row.emp_code}
              {row.user?.name ? ` — ${row.user.name}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground capitalize">Status: {row.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {perm.can_update && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/hrms/employees/${id}/edit`}>Edit</Link>
              </Button>
            )}
            {perm.can_update && row.status !== "active" && (
              <Button size="sm" onClick={openActivate} disabled={busy}>
                Activate
              </Button>
            )}
            {perm.can_update && row.status === "active" && (
              <Button size="sm" variant="destructive" onClick={onDeactivate} disabled={busy}>
                Deactivate
              </Button>
            )}
            {row.user_id && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/user-master/edit?id=${row.user_id}`}>Open User</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link href="/hrms/employees">Back</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-muted-foreground">Work email: </span>
            {row.user?.email || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Mobile: </span>
            {row.user?.mobile_number || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Department: </span>
            {row.department?.title || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Designation: </span>
            {row.designation?.title || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Joining: </span>
            {row.joining_date || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">User id: </span>
            {row.user_id || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Branches: </span>
            {(row.user?.branches || row.user?.branch_ids || [])
              .map((b) => (typeof b === "object" ? b.name || b.branch_name || b.id : b))
              .join(", ") || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Bank: </span>
            {row.bank_name || "—"} {row.ac_number ? `(${row.ac_number})` : ""}
          </div>
          <div>
            <span className="text-muted-foreground">Emergency: </span>
            {row.emergency_name || "—"} {row.emergency_mobile || ""}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Notes: </span>
            {row.notes || "—"}
          </div>
        </div>

        {showActivate && (
          <form onSubmit={onActivate} className="rounded-md border border-border p-3 space-y-3">
            <p className="text-sm font-medium">Activate — provision User</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  value={activateForm.name}
                  onChange={(e) => setActivateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Work email *</Label>
                <Input
                  type="email"
                  value={activateForm.email}
                  onChange={(e) => setActivateForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input
                  value={activateForm.mobile_number}
                  onChange={(e) => setActivateForm((f) => ({ ...f, mobile_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={activateForm.role_id}
                  onChange={(e) => setActivateForm((f) => ({ ...f, role_id: e.target.value }))}
                >
                  <option value="">Default User</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Branches</Label>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                    <input
                      type="checkbox"
                      checked={activateForm.branch_ids.map(Number).includes(Number(b.id))}
                      onChange={() => toggleBranch(b.id)}
                    />
                    {b.name || b.branch_name || `Branch ${b.id}`}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                Confirm activate
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowActivate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
