"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconPencil,
  IconTrash,
  IconUsers,
  IconSearch,
  IconMessageCircle,
  IconCircleCheck,
  IconUserOff,
  IconEye,
  IconFileText,
  IconBrandWhatsapp,
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
import EmptyState from "@/components/common/EmptyState";
import StatCard from "@/components/common/StatCard";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, toastInfo } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_candidates";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "personal", label: "Personal Info" },
  { key: "hr", label: "HR Details" },
  { key: "final", label: "Final" },
];

const KPI_CARDS = [
  {
    key: "total",
    label: "Total Candidates",
    summaryKey: "total_candidates",
    icon: IconUsers,
    accent: "#1b365d",
  },
  {
    key: "screening",
    label: "In Screening",
    summaryKey: "in_screening",
    icon: IconSearch,
    accent: "#f37021",
  },
  {
    key: "interview",
    label: "In Interview",
    summaryKey: "in_interview",
    icon: IconMessageCircle,
    accent: "#2563eb",
  },
  {
    key: "selected",
    label: "Selected",
    summaryKey: "selected",
    icon: IconCircleCheck,
    accent: "#00823b",
  },
  {
    key: "rejected",
    label: "Rejected",
    summaryKey: "rejected",
    icon: IconUserOff,
    accent: "#dc2626",
  },
];

function stageBadgeVariant(stage) {
  const n = Number(stage);
  if (n === 0) return "destructive";
  if (n >= 7) return "success";
  return "secondary";
}

function formatInterviewDt(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function candidateDisplayName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(" ") || "Candidate";
}

function buildWhatsAppUrl(row) {
  const mobile = String(row?.mobile || "").replace(/\D/g, "");
  if (!mobile) return null;
  const phone = mobile.length === 10 ? `91${mobile}` : mobile;
  const name = candidateDisplayName(row);
  const position = row?.position_title || row?.position?.title || "the open role";
  let text;
  if (row?.is_form_filled) {
    const when = formatInterviewDt(row.interview_date);
    text = `Hi ${name}, your interview for ${position} is scheduled${when !== "—" ? ` on ${when}` : ""}. Please confirm.`;
  } else {
    const formHint = row?.form_access_token
      ? ` Please fill the interview form using your invite link.`
      : ` Please fill the interview form when you receive the link.`;
    text = `Hi ${name}, thank you for applying for ${position}.${formHint}`;
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function HrmsCandidatesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const fileRef = useRef(null);
  const [meta, setMeta] = useState({ positions: [], stages: [] });
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [filters, setFilters] = useState({
    position_id: "",
    stage: "",
    tab: "all",
    search: "",
    pipeline_kpi: "total",
  });
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

  const refreshSummary = useCallback(() => {
    setSummaryLoading(true);
    hrmsService
      .getCandidatePipelineSummary()
      .then((res) => setSummary(unwrap(res) || null))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    hrmsService
      .getCandidateMeta()
      .then((res) => {
        const payload = unwrap(res) || {};
        setMeta({
          positions: payload.positions || [],
          stages: payload.stages || [],
        });
      })
      .catch(() => setMeta({ positions: [], stages: [] }));
    refreshSummary();
  }, [refreshSummary]);

  const positionOptions = useMemo(
    () => (meta.positions || []).map((p) => ({ value: String(p.id ?? p.value), label: p.title || p.label })),
    [meta.positions]
  );
  const stageOptions = useMemo(
    () => (meta.stages || []).map((s) => ({ value: String(s.value), label: s.label })),
    [meta.stages]
  );

  const applyKpiFilter = (key) => {
    setFilters((f) => {
      const nextKey = f.pipeline_kpi === key && key !== "total" ? "total" : key;
      return {
        ...f,
        pipeline_kpi: nextKey,
        stage: "",
      };
    });
    setTableKey((k) => k + 1);
  };

  const fetcher = useMemo(
    () =>
      async ({ page, limit, q, search }) => {
        const res = await hrmsService.listCandidates({
          page,
          limit,
          search: filters.search || search || q || undefined,
          position_id: filters.position_id || undefined,
          stage: filters.stage !== "" ? filters.stage : undefined,
          tab: filters.tab || "all",
          pipeline_kpi:
            filters.pipeline_kpi && filters.pipeline_kpi !== "total"
              ? filters.pipeline_kpi
              : undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const metaOut = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta: metaOut };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deleteCandidate(deleteTarget.id);
      toastSuccess("Candidate deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
      refreshSummary();
    } catch (err) {
      toastErrorFromApi(err, "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const copyFormLink = async () => {
    try {
      const res = await hrmsService.getCandidateFormLink({
        site_url: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      const payload = unwrap(res) || {};
      const url = payload.url || "";
      if (!url) throw new Error("No link returned");
      await navigator.clipboard.writeText(url);
      toastSuccess("Interview form link copied");
    } catch (err) {
      toastErrorFromApi(err, "Could not copy form link");
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const res = await hrmsService.importCandidatesFile(file);
      const payload = unwrap(res) || {};
      const ok = payload.success?.length || 0;
      const fail = payload.failed?.length || 0;
      toastSuccess(`Import done: ${ok} added, ${fail} failed`);
      if (fail) toastInfo("Check failed rows — usually missing position or duplicate contact");
      setTableKey((k) => k + 1);
      refreshSummary();
    } catch (err) {
      toastErrorFromApi(err, "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await hrmsService.downloadCandidateImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "candidate-pipeline-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastErrorFromApi(err, "Template download failed");
    }
  };

  const openWhatsApp = (row) => {
    const url = buildWhatsAppUrl(row);
    if (!url) {
      toastInfo("Mobile number missing");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const columns = useMemo(
    () => [
      {
        field: "sr",
        label: "Sr.No.",
        sortable: false,
        render: (row, idx) => (typeof idx === "number" ? idx + 1 : row.id),
      },
      {
        field: "name",
        label: "Full Name",
        sortable: false,
        filterType: "text",
        filterKey: "search",
        defaultFilterOperator: "contains",
        render: (row) => (
          <button
            type="button"
            className="font-medium text-foreground hover:underline text-left"
            onClick={() => router.push(`/hrms/candidates/${row.id}`)}
          >
            {candidateDisplayName(row)}
          </button>
        ),
      },
      { field: "mobile", label: "Mobile No.", sortable: false, render: (row) => row.mobile || "—" },
      { field: "email", label: "Email Id", sortable: false, render: (row) => row.email || "—" },
      {
        field: "position",
        label: "Position",
        sortable: false,
        filterType: "select",
        filterKey: "position_id",
        filterOptions: positionOptions,
        render: (row) => row.position_title || row.position?.title || "—",
      },
      {
        field: "interviewed_by",
        label: "Interviewed By",
        sortable: false,
        render: (row) => row.interviewed_by || "—",
      },
      {
        field: "interview_date",
        label: "Interview Date & Time",
        sortable: false,
        render: (row) => formatInterviewDt(row.interview_date),
      },
      {
        field: "reference",
        label: "Reference By",
        sortable: false,
        render: (row) => row.reference || "—",
      },
      {
        field: "stage",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "stage",
        filterOptions: stageOptions,
        render: (row) => (
          <Badge variant={stageBadgeVariant(row.stage)}>
            {row.stage_label || row.status_label || `Stage ${row.stage}`}
          </Badge>
        ),
      },
      {
        field: "actions",
        label: "Action",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              aria-label="View candidate"
              title="View dashboard"
              onClick={() => router.push(`/hrms/candidates/${row.id}`)}
            >
              <IconEye className="h-4 w-4" />
            </Button>
            {row.resume_url ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Open resume"
                title="Resume"
                onClick={() => window.open(row.resume_url, "_blank", "noopener,noreferrer")}
              >
                <IconFileText className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              aria-label="WhatsApp"
              title={row.is_form_filled ? "WhatsApp schedule" : "WhatsApp form invite"}
              onClick={() => openWhatsApp(row)}
            >
              <IconBrandWhatsapp className="h-4 w-4 text-emerald-600" />
            </Button>
            {perm.can_update ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Edit candidate"
                title="Edit / evaluate"
                onClick={() => router.push(`/hrms/candidates/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
            {perm.can_delete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete candidate"
                title="Delete"
                onClick={() => setDeleteTarget(row)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [perm.can_update, perm.can_delete, router, positionOptions, stageOptions]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Candidate Pipeline"
        subtitle="Recruitment screening, interviews and selection"
        secondaryButtonLabel="Direct Interview Form Link"
        onSecondaryClick={copyFormLink}
        sampleCsvButtonLabel={perm.can_create ? "Template" : undefined}
        onSampleCsvClick={perm.can_create ? downloadTemplate : undefined}
        importButtonLabel={perm.can_create ? (importing ? "Uploading…" : "Upload Excel") : undefined}
        onImportClick={perm.can_create ? () => fileRef.current?.click() : undefined}
        addButtonLabel={perm.can_create ? "Add" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/candidates/add") : undefined}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={onImportFile}
        />
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {KPI_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <StatCard
                key={card.key}
                compact
                icon={<Icon size={16} />}
                label={card.label}
                value={summary?.[card.summaryKey] ?? "—"}
                accentColor={card.accent}
                loading={summaryLoading}
                active={filters.pipeline_kpi === card.key}
                onClick={() => applyKpiFilter(card.key)}
                subLabel="Click to filter pipeline"
              />
            );
          })}
        </div>

        <div className="mb-2 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <Button
              key={t.key}
              type="button"
              size="sm"
              variant={filters.tab === t.key ? "default" : "outline"}
              className="h-8"
              onClick={() => {
                setFilters((f) => ({ ...f, tab: t.key }));
                setTableKey((k) => k + 1);
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={`${tableKey}-${filters.pipeline_kpi}-${filters.tab}-${filters.stage}-${filters.position_id}-${filters.search}`}
            columnFilterValues={filters}
            onColumnFilterChange={(key, value) => {
              setFilters((f) => ({
                ...f,
                [key]: value,
                ...(key === "stage" && value !== "" ? { pipeline_kpi: "total" } : {}),
              }));
              setTableKey((k) => k + 1);
            }}
            filterParams={filters}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            emptyState={
              <EmptyState
                icon={IconUsers}
                title="No candidates"
                description="Add a candidate or upload Excel against an active open position."
                actionLabel={perm.can_create ? "Add candidate" : undefined}
                onAction={perm.can_create ? () => router.push("/hrms/candidates/add") : undefined}
              />
            }
          />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
              <AlertDialogDescription>
                {candidateDisplayName(deleteTarget)} will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Back</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={deleting} onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
