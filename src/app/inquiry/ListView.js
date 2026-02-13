"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Box,
  Rating,
  Modal,
  Stack,
  Alert,
  Snackbar,
} from "@mui/material";
import Select, { MenuItem as SelectMenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import { Button } from "@/components/ui/button";
import PhoneIcon from "@mui/icons-material/Phone";
import DescriptionIcon from "@mui/icons-material/Description";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useRouter } from "next/navigation";
import moment from "moment";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import FollowupForm from "@/app/followup/components/FollowupForm";
import DocumentUploadForm from "./components/DocumentUploadForm";
import followupService from "@/services/followupService";
import inquiryService from "@/services/inquiryService";
import inquiryDocumentsService from "@/services/inquiryDocumentsService";
import mastersService from "@/services/mastersService";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { PAGE_PADDING, FORM_PADDING } from "@/utils/formConstants";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 700,
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 2,
  p: 4,
  maxHeight: "90vh",
  overflowY: "auto",
};

const COLUMN_FILTER_KEYS = [
  "inquiry_number",
  "inquiry_number_op",
  "status",
  "customer_name",
  "customer_name_op",
  "date_of_inquiry_from",
  "date_of_inquiry_to",
  "date_of_inquiry_op",
  "project_scheme",
  "project_scheme_op",
  "capacity",
  "capacity_op",
  "capacity_to",
  "mobile_number",
  "mobile_number_op",
  "address",
  "address_op",
  "landmark_area",
  "landmark_area_op",
  "city_name",
  "city_name_op",
  "state_name",
  "state_name_op",
  "pin_code",
  "pin_code_op",
  "discom_name",
  "discom_name_op",
  "inquiry_source",
  "inquiry_source_op",
  "order_type",
  "order_type_op",
  "reference_from",
  "reference_from_op",
  "company_name",
  "company_name_op",
  "remarks",
  "remarks_op",
  "branch_name",
  "branch_name_op",
  "handled_by",
  "handled_by_op",
  "inquiry_by",
  "inquiry_by_op",
  "channel_partner",
  "channel_partner_op",
  "created_at_from",
  "created_at_to",
  "created_at_op",
  "next_reminder_date_from",
  "next_reminder_date_to",
  "next_reminder_date_op",
  "assigned_on_from",
  "assigned_on_to",
  "assigned_on_op",
];

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Connected", label: "Connected" },
  { value: "Site Visit Done", label: "Site Visit Done" },
  { value: "Quotation", label: "Quotation" },
  { value: "Under Discussion", label: "Under Discussion" },
  { value: "Converted", label: "Converted" },
];

export default function ListView({ onRefresh, showAssignment = false, filterParams = {} }) {
  const router = useRouter();
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuInquiryId, setMenuInquiryId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [documentServerError, setDocumentServerError] = useState(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const [selectedInquiryIds, setSelectedInquiryIds] = useState(new Set());
  const [allRows, setAllRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [assignmentData, setAssignmentData] = useState({
    handled_by: "",
    channel_partner: "",
    inquiry_by: "",
  });
  const [assignmentErrors, setAssignmentErrors] = useState({});
  const [assigning, setAssigning] = useState(false);
  const [users, setUsers] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

  const [currentPageRows, setCurrentPageRows] = useState([]);

  const handleMenuOpen = (event, id) => {
    setMenuAnchor(event.currentTarget);
    setMenuInquiryId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuInquiryId(null);
  };

  const handleEdit = () => {
    router.push(`/inquiry/edit?id=${menuInquiryId}`);
    handleMenuClose();
  };

  const handleUploadDocuments = () => {
    if (menuInquiryId) {
      setSelectedInquiryId(menuInquiryId);
      setDocumentModalOpen(true);
      setDocumentServerError(null);
    }
    handleMenuClose();
  };

  const handleConvertToOrder = async () => {
    if (!menuInquiryId) return;
    try {
      router.push(`/order/add?inquiryId=${menuInquiryId}`);
    } catch (err) {
      setServerError("Failed to navigate to order page");
    }
    handleMenuClose();
  };

  const handleCloseDocumentModal = () => {
    if (documentServerError) return;
    setDocumentModalOpen(false);
    setSelectedInquiryId(null);
    setDocumentServerError(null);
  };

  const handleDocumentSubmit = async (payload) => {
    setDocumentLoading(true);
    setDocumentServerError(null);
    try {
      await inquiryDocumentsService.createInquiryDocument(payload);
      setDocumentModalOpen(false);
      setDocumentServerError(null);
      setSelectedInquiryId(null);
      setReloadTrigger((prev) => prev + 1);
      if (onRefresh) await onRefresh();
    } catch (err) {
      let errorMessage = "Failed to upload document";
      if (err.response) {
        const responseData = err.response.data;
        if (typeof responseData === "string") {
          try {
            const parsed = JSON.parse(responseData);
            errorMessage = parsed.message || parsed.error?.message || errorMessage;
          } catch (e) {
            errorMessage = responseData || errorMessage;
          }
        } else if (responseData && typeof responseData === "object") {
          errorMessage =
            responseData.message ||
            responseData.error?.message ||
            responseData.error ||
            err.response.statusText ||
            err.message ||
            "Failed to upload document";
        } else {
          errorMessage = err.response.statusText || err.message || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setDocumentServerError(errorMessage);
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleOpenModal = (inquiryId) => {
    setSelectedInquiryId(inquiryId);
    setModalOpen(true);
    setServerError(null);
    handleMenuClose();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedInquiryId(null);
    setServerError(null);
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await followupService.createFollowup(payload);
      handleCloseModal();
      setReloadTrigger((prev) => prev + 1);
      if (onRefresh) await onRefresh();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create followup";
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSidebar = useCallback(async (id) => {
    setLoadingRecord(true);
    try {
      const response = await inquiryService.getInquiryById(id);
      const result = response?.result || response?.data || response;
      setSelectedInquiry(Array.isArray(result) ? result[0] : result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching inquiry:", error);
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedInquiry(null);
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await mastersService.getReferenceOptions("user.model");
        const usersData = Array.isArray(response?.result) ? response.result : Array.isArray(response) ? response : [];
        setUsers(usersData);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    };
    loadUsers();
  }, []);

  const fetchInquiries = useCallback(
    async (params) => {
      const merged = { ...params, ...filterParams };
      const response = await inquiryService.getInquiries(merged);
      const result = response?.result ?? response;
      const data = result?.data ?? (Array.isArray(result) ? result : []);
      const meta = result?.meta ?? (Array.isArray(result) ? { total: result.length, page: 1, pages: 1, limit: params.limit || 20 } : {});
      if (Array.isArray(data)) {
        return { data, meta: meta.total != null ? meta : { ...meta, total: data.length, page: params.page || 1, pages: 1, limit: params.limit || 20 } };
      }
      return response;
    },
    [filterParams]
  );

  const handleRowsChange = useCallback((rows) => {
    if (Array.isArray(rows)) setCurrentPageRows(rows);
  }, []);

  const handleSelectAll = (checked) => {
    if (!currentPageRows || currentPageRows.length === 0) return;
    if (checked) {
      const currentPageIds = currentPageRows.map((row) => row.id).filter((id) => id != null);
      setSelectedInquiryIds((prev) => {
        const newSet = new Set(prev);
        currentPageIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    } else {
      const currentPageIds = currentPageRows.map((row) => row.id).filter((id) => id != null);
      setSelectedInquiryIds((prev) => {
        const newSet = new Set(prev);
        currentPageIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleSelectRow = (inquiryId, checked) => {
    setSelectedInquiryIds((prev) => {
      const newSet = new Set(prev);
      if (checked) newSet.add(inquiryId);
      else newSet.delete(inquiryId);
      return newSet;
    });
  };

  const isRowSelected = (inquiryId) => selectedInquiryIds.has(inquiryId);
  const isAllSelected = currentPageRows.length > 0 && currentPageRows.every((row) => selectedInquiryIds.has(row.id));
  const isIndeterminate = currentPageRows.length > 0 && currentPageRows.some((row) => selectedInquiryIds.has(row.id)) && !isAllSelected;

  const handleAssignmentChange = (field, value) => {
    setAssignmentData((prev) => ({ ...prev, [field]: value }));
    if (assignmentErrors[field]) {
      setAssignmentErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAssign = async () => {
    const errors = {};
    if (!assignmentData.handled_by) errors.handled_by = "Handled By is required";
    if (!assignmentData.channel_partner) errors.channel_partner = "Channel Partner is required";
    if (!assignmentData.inquiry_by) errors.inquiry_by = "Inquired By is required";
    if (Object.keys(errors).length > 0) {
      setAssignmentErrors(errors);
      return;
    }
    if (selectedInquiryIds.size === 0) {
      setSnackbar({ open: true, message: "Please select at least one inquiry", severity: "warning" });
      return;
    }
    setAssigning(true);
    setAssignmentErrors({});
    try {
      const updatePromises = Array.from(selectedInquiryIds).map((inquiryId) =>
        inquiryService.updateInquiry(inquiryId, {
          handled_by: assignmentData.handled_by,
          channel_partner: assignmentData.channel_partner,
          inquiry_by: assignmentData.inquiry_by,
        })
      );
      await Promise.all(updatePromises);
      setSnackbar({ open: true, message: `Successfully assigned ${selectedInquiryIds.size} inquiry(s)`, severity: "success" });
      setSelectedInquiryIds(new Set());
      setAssignmentData({ handled_by: "", channel_partner: "", inquiry_by: "" });
      setReloadTrigger((prev) => prev + 1);
      if (onRefresh) await onRefresh();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to assign inquiries";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (date) => (date ? moment(date).format("DD-MM-YYYY") : "-");

  const renderRating = (rating) => {
    const numRating = rating ? parseInt(rating) : 0;
    return (
      <Rating
        value={numRating}
        readOnly
        size="small"
        sx={{ "& .MuiRating-iconFilled": { color: "#FFC107" } }}
      />
    );
  };

  const getStatusColor = (status) => {
    const m = { New: "error", Connected: "info", "Site Visit Done": "warning", Quotation: "warning", "Under Discussion": "primary", Converted: "success" };
    return m[status] || "default";
  };

  const columns = useMemo(
    () => [
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <Box display="flex" gap={0.5} alignItems="center">
            <IconButton size="small" onClick={() => handleOpenModal(row.id)} sx={{ p: 0.5 }}>
              <PhoneIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              sx={{ p: 0.5 }}
              onClick={() => handleOpenSidebar(row.id)}
              aria-label="View details"
            >
              <DescriptionIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, row.id)} sx={{ p: 0.5 }}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
      ...(showAssignment
        ? [
            {
              label: "",
              field: "_checkbox",
              sortable: false,
              headerRender: () => (
                <Checkbox
                  name="select_all"
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              ),
              render: (row) => (
                <Checkbox
                  name={`row_${row.id}`}
                  checked={isRowSelected(row.id)}
                  onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                />
              ),
            },
          ]
        : []),
      {
        field: "inquiry_number",
        label: "PUI",
        filterType: "text",
        filterKey: "inquiry_number",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Typography
            variant="body2"
            sx={{ color: "primary.main", cursor: "pointer" }}
            onClick={() => router.push(`/inquiry/${row.id}`)}
          >
            {row.inquiry_number || row.id}
          </Typography>
        ),
      },
      {
        field: "status",
        label: "Stage",
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => (
          <Chip label={row.status || "New"} color={getStatusColor(row.status)} size="small" />
        ),
      },
      {
        field: "project_scheme",
        label: "Project Scheme",
        filterType: "text",
        filterKey: "project_scheme",
        defaultFilterOperator: "contains",
      },
      {
        field: "capacity",
        label: "Capacity",
        filterType: "number",
        filterKey: "capacity",
        filterKeyTo: "capacity_to",
        operatorKey: "capacity_op",
        defaultFilterOperator: "equals",
        render: (row) => (row.capacity ? `${Number(row.capacity).toFixed(2)} KW` : "-"),
      },
      {
        field: "customer_name",
        label: "Name",
        filterType: "text",
        filterKey: "customer_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "mobile_number",
        label: "Mobile",
        filterType: "text",
        filterKey: "mobile_number",
        defaultFilterOperator: "contains",
      },
      {
        field: "address",
        label: "Address",
        filterType: "text",
        filterKey: "address",
        defaultFilterOperator: "contains",
      },
      {
        field: "landmark_area",
        label: "Area",
        filterType: "text",
        filterKey: "landmark_area",
        defaultFilterOperator: "contains",
      },
      {
        field: "city_name",
        label: "City",
        filterType: "text",
        filterKey: "city_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "state_name",
        label: "State",
        filterType: "text",
        filterKey: "state_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "pin_code",
        label: "Pincode",
        filterType: "text",
        filterKey: "pin_code",
        defaultFilterOperator: "contains",
      },
      {
        field: "discom_name",
        label: "Discom",
        filterType: "text",
        filterKey: "discom_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "rating",
        label: "Rating",
        render: (row) => (row.rating ? renderRating(row.rating) : "-"),
      },
      {
        field: "date_of_inquiry",
        label: "Date of Inquiry",
        filterType: "date",
        filterKey: "date_of_inquiry_from",
        filterKeyTo: "date_of_inquiry_to",
        operatorKey: "date_of_inquiry_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.date_of_inquiry),
      },
      {
        field: "next_reminder_date",
        label: "Next Reminder",
        filterType: "date",
        filterKey: "next_reminder_date_from",
        filterKeyTo: "next_reminder_date_to",
        operatorKey: "next_reminder_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.next_reminder_date),
      },
      {
        field: "order_type",
        label: "Order Type",
        filterType: "text",
        filterKey: "order_type",
        defaultFilterOperator: "contains",
      },
      {
        field: "inquiry_source",
        label: "Source",
        filterType: "text",
        filterKey: "inquiry_source",
        defaultFilterOperator: "contains",
      },
      {
        field: "reference_from",
        label: "Reference",
        filterType: "text",
        filterKey: "reference_from",
        defaultFilterOperator: "contains",
      },
      {
        field: "company_name",
        label: "Company",
        filterType: "text",
        filterKey: "company_name",
        defaultFilterOperator: "contains",
      },
      { field: "phone_no", label: "Phone No" },
      {
        field: "remarks",
        label: "Inquiry Remarks",
        filterType: "text",
        filterKey: "remarks",
        defaultFilterOperator: "contains",
      },
      {
        field: "assigned_on",
        label: "Assigned On",
        filterType: "date",
        filterKey: "assigned_on_from",
        filterKeyTo: "assigned_on_to",
        operatorKey: "assigned_on_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.assigned_on),
      },
      {
        field: "handled_by",
        label: "Handled By",
        filterType: "text",
        filterKey: "handled_by",
        defaultFilterOperator: "contains",
      },
      {
        field: "inquiry_by",
        label: "Inquiry By",
        filterType: "text",
        filterKey: "inquiry_by",
        defaultFilterOperator: "contains",
      },
      {
        field: "channel_partner",
        label: "Channel Partner",
        filterType: "text",
        filterKey: "channel_partner",
        defaultFilterOperator: "contains",
      },
      {
        field: "created_at",
        label: "Created On",
        filterType: "date",
        filterKey: "created_at_from",
        filterKeyTo: "created_at_to",
        operatorKey: "created_at_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.created_at),
      },
      {
        field: "branch_name",
        label: "Branch",
        filterType: "text",
        filterKey: "branch_name",
        defaultFilterOperator: "contains",
      },
    ],
    [showAssignment, isAllSelected, isIndeterminate, isRowSelected, handleOpenModal, handleOpenSidebar]
  );

  const sidebarContent = useMemo(() => {
    if (loadingRecord) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      );
    }
    if (!selectedInquiry) return null;
    const i = selectedInquiry;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{i.inquiry_number || i.id}</p>
        <p className="text-sm">{i.customer_name || "-"}</p>
        <p className="text-xs text-muted-foreground">{i.mobile_number || "-"}</p>
        <hr className="border-border" />
        <p className="text-xs font-semibold text-muted-foreground">Status</p>
        <p className="text-sm">{i.status || "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Project Scheme</p>
        <p className="text-sm">{i.project_scheme || "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Capacity</p>
        <p className="text-sm">{i.capacity ? `${i.capacity} KW` : "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Address</p>
        <p className="text-sm">{[i.address, i.landmark_area, i.city_name, i.state_name].filter(Boolean).join(", ") || "-"}</p>
        {i.remarks && (
          <>
            <p className="text-xs font-semibold text-muted-foreground">Remarks</p>
            <p className="text-sm">{i.remarks}</p>
          </>
        )}
      </div>
    );
  }, [loadingRecord, selectedInquiry]);

  const calculatePaginatedTableHeight = () => `calc(100vh - 125px)`;

  return (
    <ProtectedRoute>
      <Paper
        sx={{
          p: PAGE_PADDING,
          borderRadius: 1,
          height: calculatePaginatedTableHeight(),
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {showAssignment && (
          <Box sx={{ mb: 1, p: FORM_PADDING, bgcolor: "background.default", borderRadius: 2, flexShrink: 0 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start" sx={{ width: "100%" }}>
              <div className="min-w-[200px] flex-1">
                <Select
                  name="handled_by"
                  label="Handled By"
                  value={assignmentData.handled_by || ""}
                  onChange={(e) => handleAssignmentChange("handled_by", e.target.value)}
                  error={!!assignmentErrors.handled_by}
                  helperText={assignmentErrors.handled_by}
                  required
                >
                  <SelectMenuItem value="">-- Select --</SelectMenuItem>
                  {users.map((user) => (
                    <SelectMenuItem key={user.id} value={user.id}>
                      {user.name || user.email || `User ${user.id}`}
                    </SelectMenuItem>
                  ))}
                </Select>
              </div>
              <div className="min-w-[200px] flex-1">
                <Select
                  name="channel_partner"
                  label="Channel Partner"
                  value={assignmentData.channel_partner || ""}
                  onChange={(e) => handleAssignmentChange("channel_partner", e.target.value)}
                  error={!!assignmentErrors.channel_partner}
                  helperText={assignmentErrors.channel_partner}
                  required
                >
                  <SelectMenuItem value="">-- Select --</SelectMenuItem>
                  {users.map((user) => (
                    <SelectMenuItem key={user.id} value={user.id}>
                      {user.name || user.email || `User ${user.id}`}
                    </SelectMenuItem>
                  ))}
                </Select>
              </div>
              <div className="min-w-[200px] flex-1">
                <Select
                  name="inquiry_by"
                  label="Inquired By"
                  value={assignmentData.inquiry_by || ""}
                  onChange={(e) => handleAssignmentChange("inquiry_by", e.target.value)}
                  error={!!assignmentErrors.inquiry_by}
                  helperText={assignmentErrors.inquiry_by}
                  required
                >
                  <SelectMenuItem value="">-- Select --</SelectMenuItem>
                  {users.map((user) => (
                    <SelectMenuItem key={user.id} value={user.id}>
                      {user.name || user.email || `User ${user.id}`}
                    </SelectMenuItem>
                  ))}
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={assigning || selectedInquiryIds.size === 0}
                className="min-w-[120px] h-14 self-start"
              >
                {assigning ? "Assigning..." : `Assign (${selectedInquiryIds.size})`}
              </Button>
            </Stack>
          </Box>
        )}

        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <PaginatedTable
            key={`${reloadTrigger}-${JSON.stringify(filterParams)}`}
            fetcher={fetchInquiries}
            columns={columns}
            showSearch={false}
            showPagination={false}
            height="100%"
            onTotalChange={setTotalCount}
            onRowsChange={handleRowsChange}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={{
              q: undefined,
              ...Object.fromEntries(
                Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
              ),
              ...filterParams,
            }}
            page={page}
            limit={limit}
            q={q}
            sortBy={sortBy || "id"}
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
        </Box>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleUploadDocuments}>
            <ListItemIcon>
              <UploadFileIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Upload Documents</ListItemText>
          </MenuItem>
          {(() => {
            const inquiry = currentPageRows.find((row) => row.id === menuInquiryId);
            return inquiry?.status === "Quotation" ? (
              <MenuItem onClick={handleConvertToOrder}>
                <ListItemIcon>
                  <ShoppingCartIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Convert to Order</ListItemText>
              </MenuItem>
            ) : null;
          })()}
        </Menu>

        <Modal open={modalOpen} onClose={handleCloseModal}>
          <Box sx={modalStyle}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Create Followup</Typography>
              <IconButton onClick={handleCloseModal} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <FollowupForm
              defaultValues={{ inquiry_id: selectedInquiryId || "" }}
              onSubmit={handleSubmit}
              loading={loading}
              serverError={serverError}
              onClearServerError={() => setServerError(null)}
              onCancel={handleCloseModal}
            />
          </Box>
        </Modal>

        <Modal
          open={documentModalOpen}
          disableEscapeKeyDown={!!documentServerError}
          onClose={(event, reason) => {
            if (documentServerError) {
              event?.preventDefault?.();
              return;
            }
            handleCloseDocumentModal();
          }}
        >
          <Box sx={modalStyle}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Upload Document</Typography>
              <IconButton
                onClick={() => {
                  if (!documentServerError) {
                    setDocumentModalOpen(false);
                    setSelectedInquiryId(null);
                    setDocumentServerError(null);
                  }
                }}
                size="small"
                disabled={!!documentServerError}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <DocumentUploadForm
              defaultValues={{ inquiry_id: selectedInquiryId || "" }}
              inquiryId={selectedInquiryId}
              onSubmit={handleDocumentSubmit}
              loading={documentLoading}
              serverError={documentServerError}
              onClearServerError={() => setDocumentServerError(null)}
              onCancel={() => {
                if (!documentServerError) {
                  setDocumentModalOpen(false);
                  setSelectedInquiryId(null);
                  setDocumentServerError(null);
                }
              }}
            />
          </Box>
        </Modal>

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Inquiry Details">
          {sidebarContent}
        </DetailsSidebar>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </ProtectedRoute>
  );
}
