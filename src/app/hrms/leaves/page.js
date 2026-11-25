"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  IconCheck,
  IconX,
  IconBan,
  IconCalendarOff,
  IconClockExclamation,
  IconCircleCheck,
} from "@tabler/icons-react";
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
import Textarea from "@/components/common/Textarea";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import {
  currentMonthDefaults,
  monthSelectOptions,
  yearSelectOptions,
} from "@/components/common/hrmsFilterDates";
import LeaveFilterPanel from "./components/LeaveFilterPanel";

const MODULE_KEY = "hrms_leaves";
const MONTH_DEFAULTS = currentMonthDefaults();
const EMPTY_FILTERS = {
  year: MONTH_DEFAULTS.year,
  month: MONTH_DEFAULTS.month,
  from: MONTH_DEFAULTS.from,
  to: MONTH_DEFAULTS.to,
  end_from: "",
  end_to: "",
  created_from: "",
  created_to: "",
  department_id: "",
  designation_id: "",
  employee_id: "",
  leave_type_id: "",
  status: "",
  is_emergency: "",
  is_lwp: "",
  duration: "",
  level1_status: "",
  level2_status: "",
  is_reverted_by_attendance: "",
};

function buildApiParams(filters, q) {
  const params = {};
  if (q?.trim()) params.q = q.trim();
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.end_from) params.end_from = filters.end_from;
  if (filters.end_to) params.end_to = filters.end_to;
  if (filters.created_from) params.created_from = filters.created_from;
  if (filters.created_to) params.created_to = filters.created_to;
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.designation_id) params.designation_id = filters.designation_id;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.leave_type_id) params.leave_type_id = filters.leave_type_id;
  if (filters.status) params.status = filters.status;
  if (filters.is_emergency !== "" && filters.is_emergency != null) {
    params.is_emergency = filters.is_emergency;
  }
  if (filters.is_lwp !== "" && filters.is_lwp != null) params.is_lwp = filters.is_lwp;
  if (filters.duration) params.duration = filters.duration;
  if (filters.level1_status) params.level1_status = filters.level1_status;
  if (filters.level2_status) params.level2_status = filters.level2_status;
  if (filters.is_reverted_by_attendance !== "" && filters.is_reverted_by_attendance != null) {
    params.is_reverted_by_attendance = filters.is_reverted_by_attendance;
  }
  return params;
}

function formatBalanceSummary(balancePayload) {
  const rows = Array.isArray(balancePayload)
    ? balancePayload
    : balancePayload?.balances || balancePayload?.data || [];
  if (!Array.isArray(rows) || !rows.length) return "No leave types with remaining balance.";
  return rows
    .map((r) => {
      const title = r.leaveType?.title || r.title || r.leave_type || `Type #${r.leave_type_id}`;
      const rem =
        r.remaining ??
        r.balance ??
        r.remaining_days ??
        (r.quota != null && r.used != null ? Number(r.quota) - Number(r.used) : null);
      return `${title}: ${rem != null ? rem : "—"}`;
    })
    .join(" · ");
}

export default function HrmsLeavesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState({ l1: null, l2: null, approved: null });
  const [countsLoading, setCountsLoading] = useState(true);
  const [fyAck, setFyAck] = useState(null);
  const [balanceText, setBalanceText] = useState("");
  const [fyDialog, setFyDialog] = useState(null);
  const [disputeNote, setDisputeNote] = useState("");
  const [fyBusy, setFyBusy] = useState(false);

  const YEAR_OPTIONS = useMemo(() => yearSelectOptions(), []);
  const MONTH_OPTIONS = useMemo(() => monthSelectOptions(), []);

  const apiParams = useMemo(() => buildApiParams(filters, q), [filters, q]);

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    const keys = [
      "department_id",
      "designation_id",
      "employee_id",
      "leave_type_id",
      "status",
      "is_emergency",
      "is_lwp",
      "duration",
      "level1_status",
      "level2_status",
      "is_reverted_by_attendance",
      "end_from",
      "end_to",
      "created_from",
      "created_to",
    ];
    let n = keys.filter((k) => String(filters[k] ?? "").trim() !== "").length;
    if (q.trim()) n += 1;
    if (filters.from && filters.from !== MONTH_DEFAULTS.from) n += 1;
    if (filters.to && filters.to !== MONTH_DEFAULTS.to) n += 1;
    if (String(filters.year) !== MONTH_DEFAULTS.year || String(filters.month) !== MONTH_DEFAULTS.month) {
      n += 1;
    }
    return n;
  }, [filters, q]);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    const base = { ...apiParams, limit: 1 };
    delete base.status;
    try {
      const [l1, l2, approved] = await Promise.all([
        hrmsService.listLeaves({ ...base, status: "pending_l1" }),
        hrmsService.listLeaves({ ...base, status: "pending_l2" }),
        hrmsService.listLeaves({ ...base, status: "approved" }),
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
  }, [apiParams]);

  const loadFyAck = useCallback(async () => {
    try {
      const meRes = await hrmsService.getLeaveBalanceAckMe();
      const me = unwrap(meRes);
      setFyAck(me || null);
      if (me?.employee_id && !me.is_approved_in_current_fy) {
        try {
          const balRes = await hrmsService.getLeaveBalance();
          setBalanceText(formatBalanceSummary(unwrap(balRes)));
        } catch {
          setBalanceText("");
        }
      } else {
        setBalanceText("");
      }
    } catch {
      setFyAck(null);
      setBalanceText("");
    }
  }, []);

  useEffect(() => {
    loadCounts();
    loadFyAck();
  }, [loadCounts, loadFyAck]);

  const fetcher = useMemo(
    () => async (params) => {
      const res = await hrmsService.listLeaves({
        ...apiParams,
        page: params.page,
        limit: params.limit,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: params.limit || 20 };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiParams, tableKey]
  );

  const handleApplyFilters = (next) => {
    setFilters((prev) => ({
      ...prev,
      ...next,
      year: next.year || prev.year,
      month: next.month || prev.month,
    }));
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setQ("");
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      setQ("");
      setTableKey((k) => k + 1);
      return;
    }
    if (key === "from" || key === "to" || key === "year" || key === "month") {
      setFilters((prev) => ({
        ...prev,
        year: MONTH_DEFAULTS.year,
        month: MONTH_DEFAULTS.month,
        from: MONTH_DEFAULTS.from,
        to: MONTH_DEFAULTS.to,
      }));
      setTableKey((k) => k + 1);
      return;
    }
    setFilters((prev) => ({ ...prev, [key]: "" }));
    setTableKey((k) => k + 1);
  };

  const submitFyAck = async (status) => {
    if (status === "rejected" && !disputeNote.trim()) {
      toastErrorFromApi({ message: "Note is required to dispute the balance" }, "Note required");
      return;
    }
    setFyBusy(true);
    try {
      await hrmsService.createLeaveBalanceAck({
        status,
        note: status === "rejected" ? disputeNote.trim() : undefined,
        balance_snapshot: balanceText ? { summary: balanceText } : undefined,
      });
      toastSuccess(status === "approved" ? "Leave balance confirmed for this FY" : "Dispute recorded");
      setFyDialog(null);
      setDisputeNote("");
      loadFyAck();
    } catch (err) {
      toastErrorFromApi(err, "Could not save acknowledgement");
    } finally {
      setFyBusy(false);
    }
  };

  const openAction = (row, level, decision, extra = {}) => {
    setActionTarget({ row, level, decision, extra });
    setNote("");
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    const { row, level, decision, extra } = actionTarget;
    setBusy(true);
    try {
      if (decision === "cancel") {
        await hrmsService.cancelLeave(row.id);
        toastSuccess("Leave cancelled");
      } else {
        await hrmsService.decideLeave(row.id, { level, decision, note: note || undefined, ...extra });
        toastSuccess(`Leave ${decision}d (L${level})`);
      }
      setActionTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Action failed");
    } finally {
      setBusy(false);
    }
  };

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
        field: "leaveType",
        label: "Type",
        sortable: false,
        render: (row) => row.leaveType?.title || row.leave_type_id,
      },
      {
        field: "dates",
        label: "Dates",
        sortable: false,
        render: (row) =>
          row.start_date === row.end_date ? row.start_date : `${row.start_date} → ${row.end_date}`,
      },
      { field: "duration", label: "Duration", sortable: false },
      { field: "days", label: "Days", sortable: false },
      {
        field: "flags",
        label: "Kind",
        sortable: false,
        render: (row) =>
          row.is_emergency || row.is_lwp ? (
            <div className="flex flex-wrap gap-1">
              {row.is_emergency ? <StatusBadge status="pending" label="Emergency" /> : null}
              {row.is_lwp ? <StatusBadge status="secondary" label="LWP" /> : null}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Planned</span>
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
          <div className="flex items-center justify-end gap-1">
            {row.status === "pending_l1" && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Approve (L1)"
                  title="Approve (L1)"
                  onClick={() => openAction(row, 1, "approve")}
                >
                  <IconCheck className="h-4 w-4 text-[#00823b]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Reject (L1)"
                  title="Reject (L1)"
                  onClick={() => openAction(row, 1, "reject")}
                >
                  <IconX className="h-4 w-4 text-destructive" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Cancel leave"
                  title="Cancel leave"
                  onClick={() => openAction(row, 1, "cancel")}
                >
                  <IconBan className="h-4 w-4" />
                </Button>
              </>
            )}
            {row.status === "pending_l2" && perm.can_update && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Approve (L2)"
                  title="Approve (L2)"
                  onClick={() => openAction(row, 2, "approve")}
                >
                  <IconCheck className="h-4 w-4 text-[#00823b]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Approve as leave without pay"
                  title="Approve as LWP"
                  onClick={() => openAction(row, 2, "approve", { is_lwp: true })}
                >
                  <IconCalendarOff className="h-4 w-4 text-[#f37021]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Reject (L2)"
                  title="Reject (L2)"
                  onClick={() => openAction(row, 2, "reject")}
                >
                  <IconX className="h-4 w-4 text-destructive" />
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
    [busy, perm.can_update]
  );

  const target = actionTarget;
  const actionLabel =
    target?.decision === "cancel" ? "Cancel leave" : target?.decision === "approve" ? "Approve" : "Reject";

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leaves"
        subtitle="Leave applications — manager approves first (L1), then HR (L2)"
        addButtonLabel="Apply leave"
        onAddClick={() => router.push("/hrms/leaves/add")}
      >
        {fyAck?.employee_id && !fyAck.is_approved_in_current_fy ? (
          <div className="mb-3 flex flex-col gap-2 rounded-md border border-[#f37021]/40 bg-[#f37021]/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Confirm your FY {fyAck.fy_year}–{String(fyAck.fy_year + 1).slice(-2)} leave balance
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {balanceText || "Open to review remaining balance, then confirm or dispute."}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={() => { setDisputeNote(""); setFyDialog("dispute"); }}>
                Dispute
              </Button>
              <Button size="sm" onClick={() => setFyDialog("confirm")}>
                Confirm balance
              </Button>
            </div>
          </div>
        ) : null}

        <LeaveFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          yearOptions={YEAR_OPTIONS}
          monthOptions={MONTH_OPTIONS}
          activeCount={advancedActiveCount}
          defaultOpen={false}
          onQuickSearch={(v) => {
            setQ(v || "");
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadDepartments={(query) => hrmsService.searchHrmsDepartments(query)}
          loadDesignations={(query) => hrmsService.searchHrmsDesignations(query)}
          loadEmployees={(query, opts = {}) =>
            hrmsService.searchHrmsEmployees(query, {
              department_id: opts.department_id || undefined,
              designation_id: opts.designation_id || undefined,
            })
          }
          loadLeaveTypes={(query) => hrmsService.searchHrmsLeaveTypes(query)}
          resolveDepartment={(id) => hrmsService.resolveHrmsDepartment(id)}
          resolveDesignation={(id) => hrmsService.resolveHrmsDesignation(id)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
          resolveLeaveType={(id) => hrmsService.resolveHrmsLeaveType(id)}
        />

        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconClockExclamation size={16} />}
            label="Pending manager (L1)"
            value={counts.l1 ?? "—"}
            accentColor="#f37021"
            subLabel="Awaiting reporting manager"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconClockExclamation size={16} />}
            label="Pending HR (L2)"
            value={counts.l2 ?? "—"}
            accentColor="#1b365d"
            subLabel="Awaiting HR decision"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Approved"
            value={counts.approved ?? "—"}
            accentColor="#00823b"
            subLabel="Balance already deducted"
            loading={countsLoading}
          />
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            emptyState={
              <EmptyState
                icon={IconCalendarOff}
                title={advancedActiveCount ? "No leaves match these filters" : "No leave applications"}
                description={
                  advancedActiveCount
                    ? "Try clearing the filters to see all leave applications."
                    : "Apply for leave to start the manager → HR approval flow."
                }
                actionLabel="Apply leave"
                onAction={() => router.push("/hrms/leaves/add")}
              />
            }
          />
        </div>

        <AlertDialog open={!!target} onOpenChange={(open) => !open && setActionTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionLabel}
                {target?.decision !== "cancel" ? ` (L${target?.level})` : ""}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {target?.row?.user?.name || target?.row?.employee?.emp_code || "This employee"} —{" "}
                {target?.row?.leaveType?.title || "leave"} {target?.row?.start_date}
                {target?.row?.end_date && target?.row?.end_date !== target?.row?.start_date
                  ? ` → ${target.row.end_date}`
                  : ""}
                {target?.extra?.is_lwp ? " (approved as leave without pay)" : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {target?.decision !== "cancel" && (
              <div className="py-2">
                <Input label="Note (optional)" name="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant={target?.decision === "approve" ? "default" : "destructive"}
                loading={busy}
                onClick={confirmAction}
              >
                {actionLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!fyDialog} onOpenChange={(open) => !open && setFyDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {fyDialog === "confirm" ? "Confirm leave balance" : "Dispute leave balance"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {fyDialog === "confirm"
                  ? "This records that you agree with the remaining leave balance for the current financial year. It does not change any balances."
                  : "Describe what looks wrong. HR can see your dispute on Leave balance approvals. Balances are not changed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {balanceText ? (
              <p className="text-sm text-foreground border rounded-md px-2 py-1.5 bg-muted/40">{balanceText}</p>
            ) : null}
            {fyDialog === "dispute" ? (
              <div className="py-2">
                <Textarea
                  label="Dispute note"
                  name="dispute_note"
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  required
                />
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={fyBusy}>Back</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant={fyDialog === "confirm" ? "default" : "destructive"}
                loading={fyBusy}
                onClick={() => submitFyAck(fyDialog === "confirm" ? "approved" : "rejected")}
              >
                {fyDialog === "confirm" ? "Confirm" : "Submit dispute"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}