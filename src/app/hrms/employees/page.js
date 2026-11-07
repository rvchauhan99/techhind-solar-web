"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconEye, IconPencil } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import { useAuth } from "@/hooks/useAuth";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsEmployeesPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [status, setStatus] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [tableKey, setTableKey] = useState(0);

  useEffect(() => {
    hrmsService
      .listDepartments({ limit: 100, status: "active" })
      .then((res) => {
        const payload = res?.result ?? res?.data ?? res;
        setDepartments(payload?.data || []);
      })
      .catch(() => setDepartments([]));
  }, []);

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listEmployees({
        page,
        limit,
        search: q || undefined,
        status: status || undefined,
        department_id: departmentId || undefined,
      });
      const payload = res?.result ?? res?.data ?? res;
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [status, departmentId, tableKey]
  );

  const columns = useMemo(
    () => [
      { field: "emp_code", label: "Emp Code", sortable: true },
      {
        field: "name",
        label: "Name",
        sortable: false,
        render: (row) => row.user?.name || "—",
      },
      {
        field: "email",
        label: "Work Email",
        sortable: false,
        render: (row) => row.user?.email || "—",
      },
      {
        field: "department",
        label: "Department",
        sortable: false,
        render: (row) => row.department?.title || "—",
      },
      {
        field: "designation",
        label: "Designation",
        sortable: false,
        render: (row) => row.designation?.title || "—",
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <span className="capitalize text-xs">{row.status}</span>,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/hrms/employees/${row.id}`}>
                <IconEye className="h-4 w-4" />
              </Link>
            </Button>
            {perm.can_update && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/hrms/employees/${row.id}/edit`}>
                  <IconPencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        ),
      },
    ],
    [perm.can_update]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Employees"
        addButtonLabel={perm.can_create ? "Add Employee" : undefined}
        onAddClick={
          perm.can_create
            ? () => {
                window.location.href = "/hrms/employees/add";
              }
            : undefined
        }
      >
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setTableKey((k) => k + 1);
              }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Department</label>
            <select
              className="flex h-8 min-w-[10rem] rounded-md border border-input bg-transparent px-2 text-sm"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setTableKey((k) => k + 1);
              }}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <PaginatedTable key={tableKey} columns={columns} fetcher={fetcher} showSearch height="70vh" />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
