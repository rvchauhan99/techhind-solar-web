"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { toastSuccess, toastError } from "@/utils/toast";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import SiteVisitDetailsDrawer from "@/components/common/SiteVisitDetailsDrawer";
import BucketImage from "@/components/common/BucketImage";
import siteVisitService from "@/services/siteVisitService";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { Box, Tooltip, Snackbar, Alert } from "@mui/material";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconMapPin, IconClipboardList, IconFileDescription } from "@tabler/icons-react";
import { DIALOG_FORM_LARGE } from "@/utils/formConstants";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/dataTableUtils";

const SiteVisitForm = dynamic(() => import("./components/SiteVisitForm"), { ssr: false });
const SiteSurveyForm = dynamic(() => import("./components/SiteSurveyForm"), { ssr: false });

const LIST_VIEW_PENDING = "pending";
const LIST_VIEW_COMPLETED = "completed";

const COLUMN_FILTER_KEYS = [
  "inquiry_number",
  "inquiry_number_op",
  "customer_name",
  "customer_name_op",
  "mobile_number",
  "mobile_number_op",
  "address",
  "address_op",
  "inquiry_date_of_inquiry_from",
  "inquiry_date_of_inquiry_to",
  "inquiry_date_of_inquiry_op",
  "inquiry_status",
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

const mapRowToFormDefaults = (row) => {
  if (!row) return null;
  return {
    id: row.site_visit_id,
    inquiry_id: row.inquiry_id ? String(row.inquiry_id) : "",
    visit_status: row.site_visit_visit_status || "Pending",
    remarks: row.site_visit_remarks ?? "",
    schedule_on: row.site_visit_schedule_on
      ? String(row.site_visit_schedule_on).slice(0, 10)
      : "",
    schedule_remarks: row.site_visit_schedule_remarks ?? "",
    visit_assign_to: row.site_visit_visit_assign_to ?? "",
    visit_date: row.site_visit_visit_date
      ? String(row.site_visit_visit_date).slice(0, 10)
      : "",
    visited_by: row.site_visit_visited_by ?? "",
    next_reminder_date: row.site_visit_next_reminder_date
      ? String(row.site_visit_next_reminder_date).slice(0, 10)
      : "",
    isFromInquiry: true,
  };
};

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

  const [listView, setListView] = useState(LIST_VIEW_PENDING);
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
  const [initialGalleryKey, setInitialGalleryKey] = useState(null);

  const isPendingView = listView === LIST_VIEW_PENDING;

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const handleListViewChange = useCallback((value) => {
    setListView(value);
    setPage(1);
    setTableKey((prev) => prev + 1);
  }, [setPage]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      if (exportParams.inquiry_status) {
        exportParams.status = exportParams.inquiry_status;
        delete exportParams.inquiry_status;
      }
      exportParams.visit_status =
        listView === LIST_VIEW_COMPLETED ? "Visited" : "Pending,Rescheduled";
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
  }, [filters, listView]);

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

  const handleOpenSidebar = useCallback((row, galleryKey = null) => {
    setSelectedRecord(row);
    setInitialGalleryKey(galleryKey);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
    setInitialGalleryKey(null);
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
        field: "inquiry_number",
        label: "Inquiry #",
        sortable: true,
        filterType: "text",
        filterKey: "inquiry_number",
        operatorKey: "inquiry_number_op",
        defaultFilterOperator: "contains",
        render: (row) => row.inquiry_number || "-",
      },
      {
        field: "customer_name",
        label: "Customer",
        sortable: true,
        filterType: "text",
        filterKey: "customer_name",
        operatorKey: "customer_name_op",
        defaultFilterOperator: "contains",
        render: (row) => row.customer_name || "-",
      },
      {
        field: "mobile_number",
        label: "Mobile",
        sortable: true,
        filterType: "text",
        filterKey: "mobile_number",
        operatorKey: "mobile_number_op",
        defaultFilterOperator: "contains",
        render: (row) => (
          <span className="select-text cursor-text text-xs">{row.mobile_number || "-"}</span>
        ),
      },
      {
        field: "address",
        label: "Address",
        sortable: true,
        filterType: "text",
        filterKey: "address",
        operatorKey: "address_op",
        defaultFilterOperator: "contains",
        render: (row) => {
          const addr = row.address;
          if (!addr) return "-";
          return (
            <span className="text-xs" title={addr}>
              {addr.length > 40 ? `${addr.substring(0, 40)}...` : addr}
            </span>
          );
        },
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
        render: (row) => row.site_visit_visit_status || "-",
      },
      {
        field: "visit_assign_to_name",
        label: "Assigned To",
        sortable: false,
        render: (row) =>
          row.visit_assign_to_name ||
          (row.site_visit_visit_assign_to ? `User #${row.site_visit_visit_assign_to}` : "-"),
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
          return (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded border border-border overflow-hidden hover:border-[#00823b]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00823b]/40"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSidebar(row, "visit_photo");
              }}
              aria-label="View visit photo"
              tabIndex={0}
            >
              <BucketImage
                path={photo}
                getUrl={siteVisitService.getDocumentUrl}
                alt="Visit photo"
                sx={{ width: 40, height: 40, objectFit: "cover", borderRadius: 0, display: "block" }}
              />
            </button>
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
            ) : currentPerm.can_update || currentPerm.can_create ? (
              <Tooltip title="Edit / Reassign">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenModal(row)}
                  aria-label="Edit site visit"
                >
                  <IconMapPin className="size-4" />
                </Button>
              </Tooltip>
            ) : null}
          </Box>
        ),
      },
    ],
    [handleOpenModal, handleOpenSurveyModal, handleOpenSidebar, currentPerm.can_update, currentPerm.can_create]
  );

  const filterParams = useMemo(() => {
    const entries = Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "");
    const obj = Object.fromEntries(entries);
    if (obj.inquiry_status) {
      obj.status = obj.inquiry_status;
      delete obj.inquiry_status;
    }
    obj.visit_status = isPendingView ? "Pending,Rescheduled" : "Visited";
    return { q: undefined, ...obj };
  }, [filters, isPendingView]);

  const handleSubmit = async (formData, files) => {
    setLoading(true);
    setServerError(null);
    try {
      const siteVisitId = selectedRow?.site_visit_id || formData?.id;
      const isEdit =
        !!siteVisitId &&
        ["Pending", "Rescheduled"].includes(
          selectedRow?.site_visit_visit_status || formData?.visit_status
        );

      if (isEdit) {
        await siteVisitService.update(siteVisitId, {
          visit_status: formData.visit_status,
          visit_assign_to: formData.visit_assign_to,
          schedule_on: formData.schedule_on,
          schedule_remarks: formData.schedule_remarks,
          remarks: formData.remarks,
        });
        toastSuccess("Site visit updated successfully");
      } else {
        await siteVisitService.create(formData, files);
        toastSuccess("Site visit created successfully");
      }
      handleCloseAddModal();
      setServerError(null);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "An error occurred while saving the site visit";
      setServerError(msg);
      toastError(msg);
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
      toastSuccess("Site survey created successfully");
      handleCloseSurveyModal();
      setServerError(null);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "An error occurred while creating the site survey";
      setServerError(msg);
      toastError(msg);
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
          <Tabs value={listView} onValueChange={handleListViewChange} className="w-full">
            <TabsList className="h-7 bg-white border border-slate-200 rounded-lg px-1 py-0 w-fit">
              <TabsTrigger value={LIST_VIEW_PENDING} className="text-[11px] font-semibold px-2 py-1">
                Pending
              </TabsTrigger>
              <TabsTrigger value={LIST_VIEW_COMPLETED} className="text-[11px] font-semibold px-2 py-1">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <PaginatedTable
            key={`${tableKey}-${listView}`}
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
            sortBy={sortBy || "site_visit_id"}
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

        <SiteVisitDetailsDrawer
          open={sidebarOpen}
          onClose={handleCloseSidebar}
          siteVisit={selectedRecord}
          initialGalleryKey={initialGalleryKey}
        />

        <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
          <DialogContent className={DIALOG_FORM_LARGE}>
            <DialogHeader>
              <DialogTitle>
                {selectedRow ? "Edit Site Visit" : "Add Site Visit"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pt-2">
              <SiteVisitForm
                defaultValues={
                  selectedRow
                    ? mapRowToFormDefaults(selectedRow)
                    : isPendingView
                      ? { visit_status: "Pending" }
                      : null
                }
                onSubmit={handleSubmit}
                onCancel={handleCloseAddModal}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSurveyModal} onOpenChange={(open) => !open && handleCloseSurveyModal()}>
          <DialogContent className={DIALOG_FORM_LARGE}>
            <DialogHeader>
              <DialogTitle>Site Survey</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pt-2">
              <SiteSurveyForm
                siteVisitId={selectedRow?.site_visit_id}
                onSubmit={handleSurveySubmit}
                onCancel={handleCloseSurveyModal}
                loading={loading}
                serverError={null}
                onClearServerError={() => setServerError(null)}
              />
            </div>
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
