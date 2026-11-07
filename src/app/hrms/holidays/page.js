"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import Select, { MenuItem } from "@/components/common/Select";
import { useAuth } from "@/hooks/useAuth";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsHolidaysPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [status, setStatus] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tableKey, setTableKey] = useState(0);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1, y + 2].map(String);
  }, []);

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listHolidays({
        page,
        limit,
        search: q || undefined,
        status: status || undefined,
        year: year || undefined,
      });
      const payload = res?.result ?? res?.data ?? res;
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [status, year, tableKey]
  );

  const handleDelete = async (row) => {
    if (!perm.can_delete) return;
    if (!window.confirm(`Delete holiday "${row.title}" on ${row.holiday_date}?`)) return;
    try {
      await hrmsService.deleteHoliday(row.id);
      toast.success("Holiday deleted");
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const columns = useMemo(
    () => [
      { field: "holiday_date", label: "Date", sortable: true },
      { field: "title", label: "Title", sortable: true },
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
            {perm.can_update && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/hrms/holidays/${row.id}/edit`}>
                  <IconPencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {perm.can_delete && (
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [perm.can_update, perm.can_delete]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Holidays"
        addButtonLabel={perm.can_create ? "Add Holiday" : undefined}
        onAddClick={
          perm.can_create
            ? () => {
                window.location.href = "/hrms/holidays/add";
              }
            : undefined
        }
      >
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem]">
            <Select
              label="Year"
              size="small"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setTableKey((k) => k + 1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div className="min-w-[8rem]">
            <Select
              label="Status"
              size="small"
              value={status || "all"}
              onChange={(e) => {
                const v = e.target.value === "all" ? "" : e.target.value;
                setStatus(v);
                setTableKey((k) => k + 1);
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </div>
        </div>
        <PaginatedTable key={tableKey} columns={columns} fetcher={fetcher} showSearch height="70vh" />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
