"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import CandidateFilterPanel from "./components/CandidateFilterPanel";

const MODULE_KEY = "hrms_candidates";

const ADVANCED_EMPTY = {
  position_id: "",
  stage: "",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "personal", label: "Personal Info" },
  { key: "hr", label: "HR Details" },
  { key: "final", label: "Final" },
];

const PIPELINE_KPI_VALUES = new Set(["total", "screening", "interview", "selected", "rejected"]);

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

function buildWhatsAppUrl(row, formUrl) {
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
    const linkPart = formUrl
      ? ` Please complete the interview form: ${formUrl}`
      : ` Please complete the interview form when you receive the link.`;
    text = `Hi ${name}, thank you for applying for ${position}.${linkPart}`;
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function boardColumnDefs(stageMeta) {
  const byValue = new Map(
    (stageMeta || []).map((s) => [Number(s.value), s.label || `Stage ${s.value}`])
  );
  const cols = [];
  for (let v = 1; v <= 10; v += 1) {
    cols.push({
      value: v,
      label: byValue.get(v) || `Stage ${v}`,
    });
  }
  cols.push({
    value: 0,
    label: byValue.get(0) || "Rejected",
  });
  return cols;
}

function HrmsCandidatesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perm = useModulePermission(MODULE_KEY);
  const fileRef = useRef(null);
  const [meta, setMeta] = useState({ positions: [], stages: [] });
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [advFilters, setAdvFilters] = useState(() => ({ ...ADVANCED_EMPTY }));
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({
    tab: "all",
    pipeline_kpi: "total",
  });
  const [viewMode, setViewMode] = useState("list");
  const [boardRows, setBoardRows] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [urlKpiSynced, setUrlKpiSynced] = useState(false);

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

  useEffect(() => {
    const kpi = searchParams.get("pipeline_kpi");
    if (kpi && PIPELINE_KPI_VALUES.has(kpi)) {
      setFilters((f) => ({ ...f, pipeline_kpi: kpi }));
      setTableKey((k) => k + 1);
    }
    setUrlKpiSynced(true);
  }, [searchParams]);

  const syncPipelineKpiUrl = useCallback(
    (key) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!key || key === "total") {
        params.delete("pipeline_kpi");
      } else {
        params.set("pipeline_kpi", key);
      }
      const qs = params.toString();
      router.replace(qs ? `/hrms/candidates?${qs}` : "/hrms/candidates", { scroll: false });
    },
    [router, searchParams]
  );

  const boardColumns = useMemo(() => boardColumnDefs(meta.stages), [meta.stages]);

  const loadBoard = useCallback(() => {
    setBoardLoading(true);
    hrmsService
      .listCandidates({
        page: 1,
        limit: 100,
        search: q.trim() || undefined,
        position_id: advFilters.position_id || undefined,
        stage: advFilters.stage !== "" ? advFilters.stage : undefined,
        tab: filters.tab || "all",
        pipeline_kpi:
          filters.pipeline_kpi && filters.pipeline_kpi !== "total"
            ? filters.pipeline_kpi
            : undefined,
      })
      .then((res) => {
        const payload = unwrap(res);
        setBoardRows(payload?.data || []);
      })
      .catch(() => setBoardRows([]))
      .finally(() => setBoardLoading(false));
  }, [filters, advFilters, q]);

  useEffect(() => {
    if (viewMode !== "board" || !urlKpiSynced) return;
    loadBoard();
  }, [viewMode, urlKpiSynced, loadBoard, tableKey]);

  const stageOptions = useMemo(
    () => (meta.stages || []).map((s) => ({ value: String(s.value), label: s.label })),
    [meta.stages]
  );

  const applyKpiFilter = (key) => {
    setFilters((f) => {
      const nextKey = f.pipeline_kpi === key && key !== "total" ? "total" : key;
      syncPipelineKpiUrl(nextKey);
      return { ...f, pipeline_kpi: nextKey };
    });
    setAdvFilters((prev) => ({ ...prev, stage: "" }));
    setTableKey((k) => k + 1);
  };

  const boardByStage = useMemo(() => {
    const map = Object.fromEntries(boardColumns.map((c) => [c.value, []]));
    for (const row of boardRows) {
      const stage = Number(row.stage);
      const key = Number.isFinite(stage) ? stage : 1;
      if (map[key]) map[key].push(row);
      else if (map[1]) map[1].push(row);
    }
    return map;
  }, [boardRows, boardColumns]);

  const listParams = useMemo(
    () => ({
      search: q.trim() || undefined,
      position_id: advFilters.position_id || undefined,
      stage: advFilters.stage !== "" ? advFilters.stage : undefined,
      tab: filters.tab || "all",
      pipeline_kpi:
        filters.pipeline_kpi && filters.pipeline_kpi !== "total"
          ? filters.pipeline_kpi
          : undefined,
    }),
    [advFilters, q, filters.tab, filters.pipeline_kpi]
  );

  const filterPanelValues = useMemo(() => ({ ...advFilters, q }), [advFilters, q]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (advFilters.position_id) n += 1;
    if (advFilters.stage !== "") n += 1;
    if (q.trim()) n += 1;
    return n;
  }, [advFilters, q]);

  const handleApplyFilters = (next) => {
    setAdvFilters({
      position_id: next.position_id || "",
      stage: next.stage ?? "",
    });
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setAdvFilters({ ...ADVANCED_EMPTY });
    setQ("");
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      setQ("");
    } else {
      setAdvFilters((prev) => ({ ...prev, [key]: "" }));
    }
    setTableKey((k) => k + 1);
  };

  const fetcher = useCallback(
    async ({ page, limit }) => {
      const res = await hrmsService.listCandidates({
        page,
        limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const metaOut = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta: metaOut };
    },
    [listParams]
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

  const openWhatsApp = async (row) => {
    const mobile = String(row?.mobile || "").replace(/\D/g, "");
    if (!mobile) {
      toastInfo("Mobile number missing");
      return;
    }
    let formUrl = null;
    if (!row?.is_form_filled) {
      if (row?.form_access_token) {
        formUrl = `${window.location.origin}/careers/interview-form?token=${encodeURIComponent(row.form_access_token)}`;
      } else {
        try {
          const res = await hrmsService.getCandidateFormLink({
            candidate_id: row.id,
            site_url: window.location.origin,
          });
          const payload = unwrap(res) || {};
          formUrl = payload.url || "";
        } catch (err) {
          toastErrorFromApi(err, "Could not load form link");
        }
      }
    }
    const url = buildWhatsAppUrl(row, formUrl);
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
    [perm.can_update, perm.can_delete, router]
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
        addButtonLabel={perm.can_create ? "Add Candidate" : undefined}
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

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
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
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "outline"}
              className="h-8"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "board" ? "default" : "outline"}
              className="h-8"
              onClick={() => setViewMode("board")}
            >
              Board
            </Button>
          </div>
        </div>

        <CandidateFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          stageOptions={stageOptions}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v);
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadPositions={(query) => hrmsService.searchHrmsPositions(query)}
          resolvePosition={(id) => hrmsService.resolveHrmsPosition(id)}
        />

        {viewMode === "board" ? (
          <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden">
            {boardLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Loading board…
              </div>
            ) : (
              <div className="flex flex-1 gap-2 overflow-x-auto pb-2">
                {boardColumns.map((col) => {
                  const cards = boardByStage[col.value] || [];
                  return (
                    <div
                      key={col.value}
                      className="flex w-[200px] shrink-0 flex-col rounded-md border bg-muted/20"
                    >
                      <div className="border-b px-2 py-1.5 text-xs font-semibold text-foreground">
                        {col.label}
                        <span className="ml-1 font-normal text-muted-foreground">({cards.length})</span>
                      </div>
                      <div className="flex max-h-[calc(100vh-22rem)] flex-col gap-1.5 overflow-y-auto p-1.5">
                        {cards.length === 0 ? (
                          <p className="px-1 py-2 text-[11px] text-muted-foreground">No candidates</p>
                        ) : (
                          cards.map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              className="rounded-md border bg-background p-2 text-left shadow-sm transition-colors hover:bg-muted/50"
                              onClick={() => router.push(`/hrms/candidates/${row.id}`)}
                            >
                              <p className="text-xs font-medium leading-tight text-foreground">
                                {candidateDisplayName(row)}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {row.position_title || row.position?.title || "—"}
                              </p>
                              <Badge
                                variant={stageBadgeVariant(row.stage)}
                                className="mt-1.5 h-5 px-1.5 text-[10px]"
                              >
                                {row.stage_label || row.status_label || `Stage ${row.stage}`}
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={`${tableKey}-${filters.pipeline_kpi}-${filters.tab}-${advFilters.stage}-${advFilters.position_id}-${q}`}
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
        )}

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

export default function HrmsCandidatesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Loading candidate pipeline…</div>
      }
    >
      <HrmsCandidatesPageContent />
    </Suspense>
  );
}
