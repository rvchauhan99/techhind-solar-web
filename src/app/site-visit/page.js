"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import siteVisitService from "@/services/siteVisitService";
import { resolveDocumentUrl } from "@/services/apiClient";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import { Button } from "@/components/ui/button";
import { IconMapPin, IconClipboardList, IconFileDescription, IconX } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/dataTableUtils";

const SiteVisitForm = dynamic(() => import("./components/SiteVisitForm"), { ssr: false });
const SiteSurveyForm = dynamic(() => import("./components/SiteSurveyForm"), { ssr: false });

const COLUMN_FILTER_KEYS = [
  "inquiry_id",
  "inquiry_date_of_inquiry_from",
  "inquiry_date_of_inquiry_to",
  "inquiry_date_of_inquiry_op",
  "inquiry_status",
  "site_visit_visit_status",
  "site_visit_visit_date_from",
  "site_visit_visit_date_to",
  "site_visit_visit_date_op",
  "site_visit_remarks",
  "site_visit_remarks_op",
  "site_visit_next_reminder_date_from",
  "site_visit_next_reminder_date_to",
  "site_visit_next_reminder_date_op",
  "inquiry_capacity",
  "inquiry_capacity_op",
  "inquiry_capacity_to",
  "site_visit_roof_type",
  "site_visit_roof_type_op",
  "site_visit_schedule_on_from",
  "site_visit_schedule_on_to",
  "site_visit_schedule_on_op",
  "site_visit_created_at_from",
  "site_visit_created_at_to",
  "site_visit_created_at_op",
];

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Connected", label: "Connected" },
  { value: "Site Visit Done", label: "Site Visit Done" },
  { value: "Quotation", label: "Quotation" },
  { value: "Under Discussion", label: "Under Discussion" },
];

const VISIT_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Visited", label: "Visited" },
  { value: "Rescheduled", label: "Rescheduled" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function SiteVisitPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [serverError, setServerError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await siteVisitService.exportSiteVisits(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `site-visits-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export site visits");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleOpenModal = useCallback((row = null) => {
    setSelectedRow(row);
    setShowAddModal(true);
  }, []);

  const handleOpenSurveyModal = useCallback((row) => {
    setSelectedRow(row);
    setShowSurveyModal(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setSelectedRow(null);
    setTableKey((prev) => prev + 1);
  }, []);

  const handleCloseSurveyModal = useCallback(() => {
    setShowSurveyModal(false);
    setSelectedRow(null);
    setTableKey((prev) => prev + 1);
  }, []);

  const handleOpenSidebar = useCallback(async (row) => {
    setLoadingRecord(true);
    setSelectedRecord(row);
    setSidebarOpen(true);
    setLoadingRecord(false);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const fetcher = useMemo(
    () => async (params) => {
      const response = await siteVisitService.getList(params);
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? { total: 0, page: params.page, pages: 0, limit: params.limit },
      };
    },
    [tableKey]
  );

  const columns = useMemo(
    () => [
      {
        field: "inquiry_id",
        label: "Inquiry ID",
        sortable: true,
        filterType: "text",
        filterKey: "inquiry_id",
        defaultFilterOperator: "contains",
        render: (row) => row.inquiry_id || "-",
      },
      {
        field: "inquiry_date_of_inquiry",
        label: "Inquiry Date",
        sortable: true,
        filterType: "date",
        filterKey: "inquiry_date_of_inquiry_from",
        filterKeyTo: "inquiry_date_of_inquiry_to",
        operatorKey: "inquiry_date_of_inquiry_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.inquiry_date_of_inquiry) || "-",
      },
      {
        field: "inquiry_status",
        label: "Inquiry Status",
        sortable: true,
        filterType: "select",
        filterKey: "inquiry_status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => row.inquiry_status || "-",
      },
      {
        field: "site_visit_id",
        label: "Site Visit ID",
        sortable: true,
        render: (row) => row.site_visit_id || "-",
      },
      {
        field: "site_visit_visit_status",
        label: "Visit Status",
        sortable: true,
        filterType: "select",
        filterKey: "site_visit_visit_status",
        filterOptions: VISIT_STATUS_OPTIONS,
        render: (row) => row.site_visit_visit_status || "-",
      },
      {
        field: "site_visit_visit_date",
        label: "Visit Date",
        sortable: true,
        filterType: "date",
        filterKey: "site_visit_visit_date_from",
        filterKeyTo: "site_visit_visit_date_to",
        operatorKey: "site_visit_visit_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.site_visit_visit_date) || "-",
      },
      {
        field: "site_visit_remarks",
        label: "Remarks",
        filterType: "text",
        filterKey: "site_visit_remarks",
        defaultFilterOperator: "contains",
        render: (row) => {
          const remarks = row.site_visit_remarks;
          if (!remarks) return "-";
          return remarks.length > 50 ? `${remarks.substring(0, 50)}...` : remarks;
        },
      },
      {
        field: "site_visit_next_reminder_date",
        label: "Next Reminder",
        filterType: "date",
        filterKey: "site_visit_next_reminder_date_from",
        filterKeyTo: "site_visit_next_reminder_date_to",
        operatorKey: "site_visit_next_reminder_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.site_visit_next_reminder_date) || "-",
      },
      {
        field: "inquiry_capacity",
        label: "Capacity",
        filterType: "number",
        filterKey: "inquiry_capacity",
        filterKeyTo: "inquiry_capacity_to",
        operatorKey: "inquiry_capacity_op",
        defaultFilterOperator: "equals",
        render: (row) => (row.inquiry_capacity != null ? `${Number(row.inquiry_capacity).toFixed(2)} KW` : "-"),
      },
      {
        field: "site_visit_roof_type",
        label: "Roof Type",
        filterType: "text",
        filterKey: "site_visit_roof_type",
        defaultFilterOperator: "contains",
        render: (row) => row.site_visit_roof_type || "-",
      },
      {
        field: "site_visit_schedule_on",
        label: "Schedule On",
        filterType: "date",
        filterKey: "site_visit_schedule_on_from",
        filterKeyTo: "site_visit_schedule_on_to",
        operatorKey: "site_visit_schedule_on_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.site_visit_schedule_on) || "-",
      },
      {
        field: "site_visit_created_at",
        label: "Created On",
        sortable: true,
        filterType: "date",
        filterKey: "site_visit_created_at_from",
        filterKeyTo: "site_visit_created_at_to",
        operatorKey: "site_visit_created_at_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.site_visit_created_at) || "-",
      },
      {
        field: "site_visit_visit_photo",
        label: "Visit Photo",
        render: (row) => {
          const photo = row.site_visit_visit_photo;
          if (!photo) return "-";
          const fileUrl = resolveDocumentUrl(photo);
          return (
            <img
              src={fileUrl}
              alt="Visit Photo"
              style={{
                maxWidth: "80px",
                maxHeight: "80px",
                objectFit: "contain",
                cursor: "pointer",
              }}
              onClick={() => window.open(fileUrl, "_blank")}
            />
          );
        },
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <Box display="flex" gap={0.5} alignItems="center">
            <Tooltip title="View details">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleOpenSidebar(row)}
                aria-label="View details"
              >
                <IconFileDescription className="size-4" />
              </Button>
            </Tooltip>
            {row.site_visit_visit_status?.toLowerCase() === "visited" ? (
              <Tooltip title="Site Survey">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenSurveyModal(row)}
                  aria-label="Site Survey"
                >
                  <IconClipboardList className="size-4" />
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="View/Edit Site Visit">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenModal(row)}
                  aria-label="View/Edit Site Visit"
                >
                  <IconMapPin className="size-4" />
                </Button>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    [handleOpenModal, handleOpenSurveyModal, handleOpenSidebar]
  );

  const filterParams = useMemo(() => {
    const entries = Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "");
    const obj = Object.fromEntries(entries);
    if (obj.inquiry_status) {
      obj.status = obj.inquiry_status;
      delete obj.inquiry_status;
    }
    if (obj.site_visit_visit_status) {
      obj.visit_status = obj.site_visit_visit_status;
      delete obj.site_visit_visit_status;
    }
    return { q: undefined, ...obj };
  }, [filters]);

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">Site Visit #{r.site_visit_id ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Inquiry ID</p>
        <p className="text-sm">{r.inquiry_id ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Inquiry Status</p>
        <p className="text-sm">{r.inquiry_status ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Visit Status</p>
        <p className="text-sm">{r.site_visit_visit_status ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Visit Date</p>
        <p className="text-sm">{formatDate(r.site_visit_visit_date) ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Capacity</p>
        <p className="text-sm">{r.inquiry_capacity != null ? `${r.inquiry_capacity} KW` : "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Roof Type</p>
        <p className="text-sm">{r.site_visit_roof_type ?? "-"}</p>
        {r.site_visit_remarks && (
          <>
            <p className="text-xs font-semibold text-muted-foreground">Remarks</p>
            <p className="text-sm">{r.site_visit_remarks}</p>
          </>
        )}
      </div>
    );
  }, [selectedRecord]);

  const handleSubmit = async (formData, files) => {
    setLoading(true);
    setServerError(null);
    try {
      await siteVisitService.create(formData, files);
      handleCloseAddModal();
      setServerError(null);
    } catch (error) {
      setServerError(
        error.response?.data?.message || error.message || "An error occurred while creating the site visit"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySubmit = async (formData, files) => {
    setLoading(true);
    setServerError(null);
    try {
      const siteSurveyService = (await import("@/services/siteSurveyService")).default;
      await siteSurveyService.create(formData, files);
      handleCloseSurveyModal();
      setServerError(null);
    } catch (error) {
      setServerError(
        error.response?.data?.message || error.message || "An error occurred while creating the site survey"
      );
    } finally {
      setLoading(false);
    }
  };

  const calculatePaginatedTableHeight = () => `calc(100vh - 150px)`;

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Site Visit"
        addButtonLabel={currentPerm.can_create ? "Create Site Visit" : undefined}
        onAddClick={currentPerm.can_create ? () => handleOpenModal(null) : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height={calculatePaginatedTableHeight()}
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={filterParams}
            page={page}
            limit={limit}
            q={q}
            sortBy={sortBy || "site_visit_created_at"}
            sortOrder={sortOrder || "DESC"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={setQ}
            onSortChange={setSort}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100, 200]}
          />
        </div>

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Site Visit Details">
          {loadingRecord ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : (
            sidebarContent
          )}
        </DetailsSidebar>

        <Dialog open={showAddModal} onClose={handleCloseAddModal} maxWidth="lg">
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{selectedRow ? "View/Edit Site Visit" : "Add Site Visit"}</Typography>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="close"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleCloseAddModal}
              >
                <IconX className="size-4" />
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <SiteVisitForm
              defaultValues={
                selectedRow ? { inquiry_id: selectedRow.inquiry_id ? String(selectedRow.inquiry_id) : "" } : null
              }
              onSubmit={handleSubmit}
              onCancel={handleCloseAddModal}
              loading={loading}
              serverError={null}
              onClearServerError={() => setServerError(null)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showSurveyModal} onClose={handleCloseSurveyModal} maxWidth="lg">
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Site Survey</Typography>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="close"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleCloseSurveyModal}
              >
                <IconX className="size-4" />
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <SiteSurveyForm
              siteVisitId={selectedRow?.site_visit_id}
              onSubmit={handleSurveySubmit}
              onCancel={handleCloseSurveyModal}
              loading={loading}
              serverError={null}
              onClearServerError={() => setServerError(null)}
            />
          </DialogContent>
        </Dialog>

        {serverError && (
          <Snackbar
            open={!!serverError}
            autoHideDuration={6000}
            onClose={() => setServerError(null)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Alert onClose={() => setServerError(null)} severity="error" sx={{ width: "100%" }}>
              {serverError}
            </Alert>
          </Snackbar>
        )}
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
