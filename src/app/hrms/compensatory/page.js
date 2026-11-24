"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  IconPlus,
  IconCheck,
  IconX,
  IconArrowsExchange,
  IconClock,
  IconCircleCheck,
} from "@tabler/icons-react";
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
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Textarea from "@/components/common/Textarea";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_compensatory";

export default function HrmsCompensatoryPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [decision, setDecision] = useState(null); // { row, action: "approve" | "reject" }
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ pending: null, approvedDays: null });

  const loadSummary = useCallback(async () => {
    try {
      const res = await hrmsService.listCompensatory({ limit: 1 });
      const s = unwrap(res)?.summary;
      setSummary({ pending: s?.pending ?? 0, approvedDays: s?.approvedDays ?? 0 });
    } catch {
      setSummary({ pending: null, approvedDays: null });
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const fetcher = useMemo(
    () =>
      async ({ page, limit, search, q }) => {
        const res = await hrmsService.listCompensatory({
          page,
          limit,
          status: filters.status || undefined,
          search: filters.search || search || q || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const openDecision = (row, action) => {
    setDecision({ row, action });
    setNote("");
  };

  const submitDecision = async () => {
    if (!decision) return;
    setSaving(true);
    try {
      await hrmsService.decideCompensatory(decision.row.id, {
        decision: decision.action,
        note: note.trim() || undefined,
      });
      toastSuccess(
        decision.action === "approve"
          ? "Compensatory leave approved and credited to leave balance"
          : "Compensatory request rejected"
      );
      setDecision(null);
      setNote("");
      setTableKey((k) => k + 1);
      loadSummary();
    } catch (err) {
      toastErrorFromApi(err, "Could not update the request");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "employee_name",
        label: "Employee",
        sortable: false,
        filterType: "text",
        filterKey: "search",
        defaultFilterOperator: "contains",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.employee_name || "—"}</span>
            {row.emp_code && (
              <span className="text-xs text-muted-foreground">{row.emp_code}</span>
            )}
          </div>
        ),
      },
      { field: "worked_date", label: "Worked on", sortable: true },
      { field: "requested_leave_date", label: "Leave on", sortable: true },
      {
        field: "number_of_days",
        label: "Days",
        sortable: true,
        render: (row) => <span className="tabular-nums">{Number(row.number_of_days || 0)}</span>,
      },
      {
        field: "hours_worked",
        label: "Hours",
        sortable: true,
        render: (row) => <span className="tabular-nums">{Number(row.hours_worked || 0)}</span>,
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "status",
        filterOptions: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ],
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {perm.can_update && row.status === "pending" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Approve compensatory for ${row.employee_name || "employee"}`}
                  title="Approve"
                  onClick={() => openDecision(row, "approve")}
                >
                  <IconCheck className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Reject compensatory for ${row.employee_name || "employee"}`}
                  title="Reject"
                  onClick={() => openDecision(row, "reject")}
                >
                  <IconX className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
            {row.status !== "pending" && (
              <span className="text-xs text-muted-foreground">{row.decision_note || "—"}</span>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [perm.can_update]
  );

  const isApprove = decision?.action === "approve";

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Compensatory Leave"
        subtitle="Comp-off earned by working on a holiday or weekend — approval credits the leave balance"
        actions={
          perm.can_create ? (
            <Button size="sm" onClick={() => router.push("/hrms/compensatory/add")}>
              <IconPlus className="size-4" /> Request Comp-off
            </Button>
          ) : null
        }
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <StatCard
            compact
            icon={<IconClock size={16} />}
            label="Pending approval"
            value={summary.pending ?? "—"}
            accentColor="#f37021"
            subLabel="Awaiting a decision"
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Days credited"
            value={summary.approvedDays ?? "—"}
            accentColor="#00823b"
            subLabel="Approved comp-off days"
          />
        </div>


        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable

          key={tableKey}
          columnFilterValues={filters}
          onColumnFilterChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }));
            setTableKey((k) => k + 1);
          }}
          filterParams={filters}
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          height="100%"
          initialSortBy="worked_date"
          initialSortOrder="desc"
          emptyState={
            <EmptyState
              icon={IconArrowsExchange}
              title="No compensatory requests"
              description="When someone works a holiday or weekend, record it here to give them an off in lieu."
              actionLabel={perm.can_create ? "Request Comp-off" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/compensatory/add") : undefined}
            />
          }
        />
        </div>

        <AlertDialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isApprove ? "Approve compensatory leave" : "Reject compensatory request"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isApprove
                  ? `${decision?.row?.number_of_days ?? 0} day(s) will be credited to ${decision?.row?.employee_name || "the employee"}'s leave balance.`
                  : `The ${decision?.row?.number_of_days ?? 0} day(s) request for ${decision?.row?.employee_name || "the employee"} will be rejected.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-1">
              <Textarea
                label="Note (optional)"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                helperText="Saved with the decision for the audit trail"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant={isApprove ? "default" : "destructive"}
                loading={saving}
                onClick={submitDecision}
              >
                {isApprove ? "Approve" : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
