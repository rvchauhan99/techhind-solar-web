"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconClockExclamation, IconCircleCheck, IconUserCheck } from "@tabler/icons-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { currentMonthDefaults } from "@/components/common/hrmsFilterDates";
import AttendanceRequestFilterPanel from "./components/AttendanceRequestFilterPanel";

const MODULE_KEY = "hrms_attendance_requests";
const MONTH_DEFAULTS = currentMonthDefaults();

const EMPTY_FILTERS = {
  status: "",
  request_type: "",
  source: "",
  department_id: "",
  designation_id: "",
  employee_id: "",
  level1_status: "",
  level2_status: "",
  from: MONTH_DEFAULTS.from,
  to: MONTH_DEFAULTS.to,
  created_from: "",
  created_to: "",
};

const ADVANCED_KEYS = Object.keys(EMPTY_FILTERS);

export default function HrmsAttendanceRequestsPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const list = useListTableState({
    defaultLimit: 20,
    filters: { ...EMPTY_FILTERS },
  });

  const [tableKey, setTableKey] = useState(0);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [note, setNote] = useState("");
  const [correctedAt, setCorrectedAt] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [counts, setCounts] = useState({ l1: null, l2: null, approved: null });
  const [countsLoading, setCountsLoading] = useState(true);

  const listParams = useMemo(() => {
    const f = list.filters;
    return {
      status: f.status || undefined,
      request_type: f.request_type || undefined,
      source: f.source || undefined,
      department_id: f.department_id || undefined,
      designation_id: f.designation_id || undefined,
      employee_id: f.employee_id || undefined,
      level1_status: f.level1_status || undefined,
      level2_status: f.level2_status || undefined,
      from: f.from || undefined,
      to: f.to || undefined,
      created_from: f.created_from || undefined,
      created_to: f.created_to || undefined,
      q: list.q || undefined,
    };
  }, [list.filters, list.q]);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    const base = { ...listParams, limit: 1 };
    delete base.status;
    try {
      const [l1, l2, approved] = await Promise.all([
        hrmsService.listAttendanceRequests({ ...base, status: "pending_l1" }),
        hrmsService.listAttendanceRequests({ ...base, status: "pending_l2" }),
        hrmsService.listAttendanceRequests({ ...base, status: "approved" }),
      ]);
      setCounts({
        l1: unwrap(l1)?.meta?.total ?? 0,
        l2: unwrap(l2)?.meta?.total ?? 0,
        approved: unwrap(approved)?.meta?.total ?? 0,
      });
    } catch {
      setCounts({ l1: null, l2: null, approved: null });
    } finally {
      setCountsLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const fetcher = useCallback(
    async ({ page, limit }) => {
      const res = await hrmsService.listAttendanceRequests({
        page,
        limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [listParams]
  );

  const openDecision = (row, level, decision) => {
    setDecisionTarget({ row, level, decision });
    setNote("");
    if (decision === "approve" && level === 2 && row?.request_at) {
      const d = new Date(row.request_at);
      const pad = (n) => String(n).padStart(2, "0");
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setCorrectedAt(local);
    } else {
      setCorrectedAt("");
    }
  };

  const confirmDecision = async () => {
    if (!decisionTarget) return;
    const { row, level, decision } = decisionTarget;
    setDeciding(true);
    try {
      const payload = { level, decision, note: note || undefined };
      if (
        decision === "approve" &&
        level === 2 &&
        correctedAt &&
        String(correctedAt).trim()
      ) {
        payload.corrected_at = new Date(correctedAt).toISOString();
      }
      await hrmsService.decideAttendanceRequest(row.id, payload);
      toastSuccess(`Request ${decision}d (L${level})`);
      setDecisionTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Action failed");
    } finally {
      setDeciding(false);
    }
  };

  const advancedActiveCount = useMemo(() => {
    const keys = ADVANCED_KEYS.filter(
      (k) => k !== "from" && k !== "to" && String(list.filters[k] ?? "").trim() !== ""
    );
    let n = keys.length;
    if (list.q) n += 1;
    if (list.filters.from && list.filters.from !== MONTH_DEFAULTS.from) n += 1;
    if (list.filters.to && list.filters.to !== MONTH_DEFAULTS.to) n += 1;
    return n;
  }, [list.filters, list.q]);

  const hasActiveFilters = advancedActiveCount > 0;

  const handleApplyFilters = (draft) => {
    list.setFilters({
      status: draft.status || "",
      request_type: draft.request_type || "",
      source: draft.source || "",
      department_id: draft.department_id || "",
      designation_id: draft.designation_id || "",
      employee_id: draft.employee_id || "",
      level1_status: draft.level1_status || "",
      level2_status: draft.level2_status || "",
      from: draft.from || "",
      to: draft.to || "",
      created_from: draft.created_from || "",
      created_to: draft.created_to || "",
    });
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    list.setQ("");
    list.setFilters({ ...EMPTY_FILTERS });
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      list.setQ("");
      setTableKey((k) => k + 1);
      return;
    }
    if (key === "from" || key === "to") {
      list.setFilters({
        ...list.filters,
        from: MONTH_DEFAULTS.from,
        to: MONTH_DEFAULTS.to,
      });
      setTableKey((k) => k + 1);
      return;
    }
    list.setFilter(key, "");
    setTableKey((k) => k + 1);
  };

  const filterPanelValues = useMemo(
    () => ({ ...list.filters, q: list.q }),
    [list.filters, list.q]
  );

  const columns = useMemo(
    () => [
      {
        field: "user",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <span className="font-medium text-foreground">
            {row.user?.name || row.employee?.emp_code || `User #${row.user_id}`}
          </span>
        ),
      },
      {
        field: "request_type",
        label: "Type",
        sortable: false,
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span>{String(row.request_type || "").replace(/_/g, " ")}</span>
            {row.source === "system_auto_checkout" && (
              <span className="inline-flex w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                Auto punch-out
              </span>
            )}
          </div>
        ),
      },
      {
        field: "request_at",
        label: "Requested at",
        sortable: false,
        render: (row) => (row.request_at ? new Date(row.request_at).toLocaleString() : "—"),
      },
      {
        field: "reason",
        label: "Reason",
        sortable: false,
        render: (row) => <span className="text-xs line-clamp-2">{row.reason}</span>,
      },
      {
        field: "l1",
        label: "Manager (L1)",
        sortable: false,
        render: (row) =>
          row.level1_status ? (
            <StatusBadge status={row.level1_status} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        field: "l2",
        label: "HR (L2)",
        sortable: false,
        render: (row) =>
          row.level2_status ? (
            <StatusBadge status={row.level2_status} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-1">
            {row.status === "pending_l1" && (
              <>
                <Button size="sm" variant="outline" onClick={() => openDecision(row, 1, "approve")}>
                  Approve (L1)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openDecision(row, 1, "reject")}>
                  Reject
                </Button>
              </>
            )}
            {row.status === "pending_l2" && perm.can_update && (
              <>
                <Button size="sm" onClick={() => openDecision(row, 2, "approve")}>
                  Approve (L2)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openDecision(row, 2, "reject")}>
                  Reject
                </Button>
              </>
            )}
            {row.status !== "pending_l1" && row.status !== "pending_l2" && (
              <span className="text-xs text-muted-foreground">No action</span>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [perm.can_update]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Attendance Requests"
        subtitle="Correction requests — the reporting manager approves first (L1), then HR (L2)"
        addButtonLabel="New request"
        onAddClick={() => router.push("/hrms/attendance-requests/add")}
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconUserCheck size={16} />}
            label="Pending your approval (L1)"
            value={counts.l1 ?? "—"}
            accentColor="#f37021"
            subLabel="Manager decision needed"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconClockExclamation size={16} />}
            label="Pending HR (L2)"
            value={counts.l2 ?? "—"}
            accentColor="#1b365d"
            subLabel="HR decision needed"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Approved"
            value={counts.approved ?? "—"}
            accentColor="#00823b"
            subLabel="Corrections applied"
            loading={countsLoading}
          />
        </div>

        <AttendanceRequestFilterPanel
          values={filterPanelValues}
          quickSearch={list.q}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            list.setQ(v);
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadDepartments={(q) => hrmsService.searchHrmsDepartments(q)}
          loadDesignations={(q, deptId) =>
            hrmsService.searchHrmsDesignations(q, { department_id: deptId || undefined })
          }
          loadEmployees={(q, opts = {}) =>
            hrmsService.searchHrmsEmployees(q, {
              department_id: opts.department_id || undefined,
              designation_id: opts.designation_id || undefined,
            })
          }
          resolveDepartment={(id) => hrmsService.resolveHrmsDepartment(id)}
          resolveDesignation={(id) => hrmsService.resolveHrmsDesignation(id)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
        />

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            emptyState={
              <EmptyState
                icon={IconClockExclamation}
                title={hasActiveFilters ? "No requests match these filters" : "No correction requests"}
                description={
                  hasActiveFilters
                    ? "Try removing a filter chip or clearing the quick search."
                    : "When someone raises a missed punch or correction, it will appear here for approval."
                }
                actionLabel={hasActiveFilters ? undefined : "New request"}
                onAction={
                  hasActiveFilters ? undefined : () => router.push("/hrms/attendance-requests/add")
                }
              />
            }
          />
        </div>

        <AlertDialog open={!!decisionTarget} onOpenChange={(open) => !open && setDecisionTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {decisionTarget?.decision === "approve" ? "Approve" : "Reject"} request (L{decisionTarget?.level})
              </AlertDialogTitle>
              <AlertDialogDescription>
                {decisionTarget?.row?.user?.name || decisionTarget?.row?.employee?.emp_code} —{" "}
                {String(decisionTarget?.row?.request_type || "").replace(/_/g, " ")}. You can add an optional note.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Input label="Note (optional)" name="note" value={note} onChange={(e) => setNote(e.target.value)} />
              {decisionTarget?.decision === "approve" &&
                decisionTarget?.level === 2 &&
                decisionTarget?.row?.request_type === "check_out" && (
                  <Input
                    type="datetime-local"
                    label="Corrected check-out time (optional)"
                    name="corrected_at"
                    value={correctedAt}
                    onChange={(e) => setCorrectedAt(e.target.value)}
                    helperText={
                      decisionTarget?.row?.source === "system_auto_checkout"
                        ? "Adjust the auto punch-out time before applying."
                        : "Leave as-is to apply the requested time."
                    }
                  />
                )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deciding}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant={decisionTarget?.decision === "reject" ? "destructive" : "default"}
                loading={deciding}
                onClick={confirmDecision}
              >
                {decisionTarget?.decision === "approve" ? "Approve" : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
