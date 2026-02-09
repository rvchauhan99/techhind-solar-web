"use client";

import {
  Box,
  Chip,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Modal,
} from "@mui/material";
import Input from "@/components/common/Input";
import PhoneIcon from "@mui/icons-material/Phone";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FollowupForm from "@/app/followup/components/FollowupForm";
import SiteVisitForm from "@/app/site-visit/components/SiteVisitForm";
import DocumentUploadForm from "../inquiry/components/DocumentUploadForm";
import followupService from "@/services/followupService";
import siteVisitService from "@/services/siteVisitService";
import inquiryService from "@/services/inquiryService";
import inquiryDocumentsService from "@/services/inquiryDocumentsService";
import { Snackbar, Alert, CircularProgress } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import VisibilityIcon from "@mui/icons-material/Visibility";

const COLUMN_WIDTH = 330;
const COLUMN_HEIGHT = "calc(100vh - 150px)"; // Optimized: Navbar(56px) + Toolbar(40px) + Page header(54px) = 150px
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ===== Helpers =====
const kwLabel = (kw) => `${Number(kw || 0).toFixed(2)} KW`;

const STATUS_COLUMNS = {
  New: { id: "new", title: "New", color: "#dc3545" },
  Connected: { id: "connected", title: "Connected", color: "#17a2b8" },
  "Site Visit Done": {
    id: "siteVisit",
    title: "Site Visit Done",
    color: "#ffc107",
    fontColor: 'black',
  },
  Quotation: { id: "quotation", title: "Quotation", color: "#ffc107", fontColor: 'black' },
  "Under Discussion": {
    id: "discussion",
    title: "Under Discussion",
    color: "#28a745",
  },
  Converted: { id: "converted", title: "Converted", color: "#6c757d" },
};

// Map column ID to status name
const getStatusFromColumnId = (columnId) => {
  const statusMap = {
    new: "New",
    connected: "Connected",
    siteVisit: "Site Visit Done",
    quotation: "Quotation",
    discussion: "Under Discussion",
  };
  return statusMap[columnId] || null;
};

// Map status name to column ID
const getColumnIdFromStatus = (status) => {
  const columnIdMap = {
    "New": "new",
    "Connected": "connected",
    "Site Visit Done": "siteVisit",
    "Quotation": "quotation",
    "Under Discussion": "discussion",
  };
  return columnIdMap[status] || "new";
};

// Validation rules for status transitions
const ALLOWED_TRANSITIONS = {
  "New": ["Connected", "Site Visit Done", "Quotation"],
  "Connected": ["Site Visit Done", "Quotation"],
  "Site Visit Done": ["Quotation"],
  "Quotation": ["Under Discussion"],
  "Under Discussion": [], // Cannot move from Under Discussion
};

// Validate if a drag is allowed
const isDragAllowed = (sourceStatus, destinationStatus) => {
  // No backward movement allowed
  const statusOrder = ["New", "Connected", "Site Visit Done", "Quotation", "Under Discussion"];
  const sourceIndex = statusOrder.indexOf(sourceStatus);
  const destIndex = statusOrder.indexOf(destinationStatus);

  if (sourceIndex === -1 || destIndex === -1) return false;

  // Check if moving forward
  if (destIndex <= sourceIndex) return false;

  // Check if transition is allowed based on rules
  const allowedTargets = ALLOWED_TRANSITIONS[sourceStatus] || [];
  if (!allowedTargets.includes(destinationStatus)) return false;

  // Special rule: Under Discussion can only be moved from Quotation
  if (destinationStatus === "Under Discussion" && sourceStatus !== "Quotation") {
    return false;
  }

  return true;
};

const buildBoardState = (inquiries = []) => {
  const columns = {};
  Object.values(STATUS_COLUMNS).forEach((col) => {
    columns[col.id] = { ...col, items: [] };
  });

  inquiries.forEach((inq) => {
    const colConfig = STATUS_COLUMNS[inq.status] || STATUS_COLUMNS["New"];
    const colId = colConfig.id;

    if (!columns[colId]) {
      columns[colId] = { ...colConfig, items: [] };
    }

    columns[colId].items.push({
      id: String(inq.id),
      inquiryNumber: inq.inquiry_number,
      source: inq.inquiry_source,
      kw: inq.capacity,
      customerName: inq.customer_name,
      inquiryBy: inq.inquiry_by,
      mobile: inq.mobile_number,
      projectScheme: inq.project_scheme,
      handledBy: inq.handled_by,
      dateOfInquiry: inq.date_of_inquiry,
      assignedOn: inq.assigned_on || inq.date_of_inquiry,
      nextReminder: inq.next_reminder_date,
      status: inq.status, // Store original status
    });
  });

  return {
    columns,
    columnOrder: Object.values(STATUS_COLUMNS).map((c) => c.id),
  };
};

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 700,
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 1,
  p: 4,
  maxHeight: "90vh",
  overflowY: "auto",
};
const siteVisitModalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 1000,
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 1,
  p: 4,
  maxHeight: "90vh",
  overflowY: "auto",
};

export default function KanbanBoard({ search, inquiries, onRefresh }) {
  const router = useRouter();
  const [data, setData] = useState(buildBoardState(inquiries));
  const [query, setQuery] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuInquiryId, setMenuInquiryId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [siteVisitModalOpen, setSiteVisitModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [siteVisitLoading, setSiteVisitLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [siteVisitServerError, setSiteVisitServerError] = useState(null);
  const [documentServerError, setDocumentServerError] = useState(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);
  const [dragError, setDragError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [dragState, setDragState] = useState({ isDragging: false, sourceStatus: null, destinationStatus: null, isValid: true });
  const [pendingDragStatus, setPendingDragStatus] = useState(null); // Store destination status for followup modal

  useEffect(() => {
    setData(buildBoardState(inquiries));
  }, [inquiries]);

  // Totals per column
  const totals = useMemo(() => {
    const out = {};
    for (const key of data.columnOrder) {
      const items = data.columns[key].items;
      out[key] = {
        count: items.length,
        kw: items.reduce((acc, it) => acc + (Number(it.kw) || 0), 0),
      };
    }
    return out;
  }, [data]);

  // Filtered view for search
  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    const cols = {};
    for (const key of data.columnOrder) {
      cols[key] = {
        ...data.columns[key],
        items: data.columns[key].items.filter((it) =>
          [
            it.id,
            it.inquiryNumber,
            it.source,
            it.inquiryBy,
            it.handledBy,
            it.mobile,
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        ),
      };
    }
    return { ...data, columns: cols };
  }, [data, query]);

  const handleMenuOpen = (event, item) => {
    setMenuAnchor(event.currentTarget);
    setMenuInquiryId(item?.id || null);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuInquiryId(null);
  };

  const handleViewInquiry = () => {
    if (menuInquiryId) {
      router.push(`/inquiry/${menuInquiryId}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (menuInquiryId) {
      router.push(`/inquiry/edit?id=${menuInquiryId}`);
    }
    handleMenuClose();
  };

  const handleCall = () => {
    if (menuInquiryId) {
      handleOpenModal(menuInquiryId);
    }
  };

  const handleQuotation = () => {
    const inquiry = inquiries.find((inq) => String(inq.id) === menuInquiryId);

    router.push(
      `/quotation/add?inquiry=${encodeURIComponent(JSON.stringify(inquiry))}`
    );

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
      // Navigate to order add page with only inquiry ID
      router.push(`/order/add?inquiryId=${menuInquiryId}`);
    } catch (err) {
      setDragError("Failed to navigate to order page");
    }
    handleMenuClose();
  };

  const handleOpenDocumentModal = (inquiryId) => {
    setSelectedInquiryId(inquiryId);
    setDocumentModalOpen(true);
    setDocumentServerError(null);
    handleMenuClose();
  };

  const handleCloseDocumentModal = () => {
    // Don't close if there's an error - user must acknowledge the error first
    if (documentServerError) {
      return;
    }
    setDocumentModalOpen(false);
    setSelectedInquiryId(null);
    setDocumentServerError(null);
  };

  const handleDocumentSubmit = async (payload) => {
    setDocumentLoading(true);
    setDocumentServerError(null);
    try {
      await inquiryDocumentsService.createInquiryDocument(payload);
      // Only close modal on success
      setDocumentModalOpen(false);
      setDocumentServerError(null);
      setSelectedInquiryId(null);
      // Optionally show success message or refresh data
    } catch (err) {
      // Extract error message from response - check multiple possible locations
      let errorMessage = "Failed to upload document";

      if (err.response) {
        // Check if data is a string (sometimes axios doesn't parse JSON)
        const responseData = err.response.data;
        if (typeof responseData === 'string') {
          try {
            const parsed = JSON.parse(responseData);
            errorMessage = parsed.message || parsed.error?.message || errorMessage;
          } catch (e) {
            errorMessage = responseData || errorMessage;
          }
        } else if (responseData && typeof responseData === 'object') {
          // Try different possible locations for the error message
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

      // Set error state - this will prevent modal from closing
      setDocumentServerError(errorMessage);
      // DO NOT close modal on error - keep it open so user can see the error
      // Modal will remain open because we're not calling handleCloseDocumentModal()
      // Note: Form state is preserved so user can fix and retry
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
    setPendingDragStatus(null);
    setServerError(null);
  };

  const handleOpenSiteVisitModal = (inquiryId) => {
    setSelectedInquiryId(inquiryId);
    setSiteVisitModalOpen(true);
    setSiteVisitServerError(null);
    handleMenuClose();
  };

  const handleCloseSiteVisitModal = () => {
    setSiteVisitModalOpen(false);
    setSelectedInquiryId(null);
    setSiteVisitServerError(null);
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await followupService.createFollowup(payload);
      handleCloseModal();
      // Refresh inquiries list after successful followup creation
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create followup";
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDead = async () => {
    if (!menuInquiryId) return;

    // Optimistic update or just set loading
    setLoading(true);
    try {
      await inquiryService.updateInquiry(menuInquiryId, { is_dead: true });
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to mark as dead", err);
      // setServerError(err.message);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  const handleSiteVisitSubmit = async (formData, files) => {
    setSiteVisitLoading(true);
    setSiteVisitServerError(null);
    try {
      // Ensure inquiry_id is set
      const payload = {
        ...formData,
        inquiry_id: selectedInquiryId || formData.inquiry_id,
      };
      await siteVisitService.create(payload, files);
      handleCloseSiteVisitModal();
      // Refresh inquiries list after successful site visit creation
      // Site visit creation will automatically update inquiry status to "Site Visit Done"
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create site visit";
      setSiteVisitServerError(errorMessage);
    } finally {
      setSiteVisitLoading(false);
    }
  };

  // Track drag updates to show visual feedback
  const onDragUpdate = (update) => {
    const { destination, source, draggableId } = update;

    if (!destination) {
      setDragState({ isDragging: true, sourceStatus: null, destinationStatus: null, isValid: true });
      return;
    }

    const sourceColKey = source.droppableId;
    const destColKey = destination.droppableId;

    // Same column - always valid
    if (sourceColKey === destColKey) {
      setDragState({ isDragging: true, sourceStatus: null, destinationStatus: null, isValid: true });
      return;
    }

    // Different columns - validate
    const sourceStatus = getStatusFromColumnId(sourceColKey);
    const destinationStatus = getStatusFromColumnId(destColKey);

    // Get the inquiry item being moved
    const sourceColumn = data.columns[sourceColKey];
    const inquiryItem = sourceColumn?.items[source.index];

    if (!inquiryItem) {
      setDragState({ isDragging: true, sourceStatus, destinationStatus, isValid: false });
      return;
    }

    // Get the current status of the inquiry from original inquiries data
    const originalInquiry = inquiries.find((inq) => String(inq.id) === inquiryItem.id);
    const currentStatus = originalInquiry?.status || sourceStatus;

    // Validate the drag
    const isValid = isDragAllowed(currentStatus, destinationStatus);
    setDragState({
      isDragging: true,
      sourceStatus: currentStatus,
      destinationStatus,
      isValid
    });
  };

  // Handle drag start
  const onDragStart = (start) => {
    setDragState({ isDragging: true, sourceStatus: null, destinationStatus: null, isValid: true });
  };

  // Drag & Drop handler
  const onDragEnd = async (result) => {
    // Reset drag state
    setDragState({ isDragging: false, sourceStatus: null, destinationStatus: null, isValid: true });

    const { destination, source } = result;
    if (!destination) return;

    const sourceColKey = source.droppableId;
    const destColKey = destination.droppableId;

    // If moving within same column (reordering), allow it without validation
    if (sourceColKey === destColKey) {
      if (source.index === destination.index) return;

      setData((prev) => {
        const srcCol = prev.columns[sourceColKey];
        const srcItems = Array.from(srcCol.items);
        const [moved] = srcItems.splice(source.index, 1);
        srcItems.splice(destination.index, 0, moved);
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [sourceColKey]: { ...srcCol, items: srcItems },
          },
        };
      });
      return;
    }

    // Moving between columns - validate the transition
    const sourceStatus = getStatusFromColumnId(sourceColKey);
    const destinationStatus = getStatusFromColumnId(destColKey);

    // Get the inquiry item being moved
    const sourceColumn = data.columns[sourceColKey];
    const inquiryItem = sourceColumn.items[source.index];

    if (!inquiryItem) {
      return; // Silently block - no error message
    }

    // Get the current status of the inquiry from original inquiries data
    const originalInquiry = inquiries.find((inq) => String(inq.id) === inquiryItem.id);
    const currentStatus = originalInquiry?.status || sourceStatus;

    // Validate the drag - if invalid, just return without updating (will snap back)
    if (!isDragAllowed(currentStatus, destinationStatus)) {
      return; // Block the drag silently
    }

    // Check if this transition requires a followup (New → Connected)
    // If moving from "New" to "Connected", show followup modal instead of directly updating
    if (currentStatus === "New" && destinationStatus === "Connected") {
      // Open followup modal with pre-filled inquiry_id and destination status
      setSelectedInquiryId(inquiryItem.id);
      setPendingDragStatus(destinationStatus);
      setModalOpen(true);
      setServerError(null);
      // Don't update status here - followup creation will handle it
      return;
    }

    // Check if this transition requires a site visit (any status → Site Visit Done)
    // If moving to "Site Visit Done", show site visit modal instead of directly updating
    if (destinationStatus === "Site Visit Done") {
      // Open site visit modal with pre-filled inquiry_id
      setSelectedInquiryId(inquiryItem.id);
      setSiteVisitModalOpen(true);
      setSiteVisitServerError(null);
      // Don't update status here - site visit creation will handle it
      return;
    }

    // Check if moving to "Quotation"
    if (destinationStatus === "Quotation") {
      router.push(
        `/quotation/add?inquiry=${encodeURIComponent(JSON.stringify(originalInquiry))}`
      );
      // Don't update status here - quotation creation will handle it
      return;
    }

    // For other valid transitions, update status directly in backend
    setUpdatingStatus(true);
    setDragError(null);

    try {
      // Update inquiry status in backend
      await inquiryService.updateInquiry(inquiryItem.id, {
        status: destinationStatus,
      });

      // Update local state after successful backend update
      setData((prev) => {
        const srcCol = prev.columns[sourceColKey];
        const dstCol = prev.columns[destColKey];

        const srcItems = Array.from(srcCol.items);
        const [moved] = srcItems.splice(source.index, 1);

        // Update status in moved item
        moved.status = destinationStatus;

        const dstItems = Array.from(dstCol.items);
        dstItems.splice(destination.index, 0, moved);

        return {
          ...prev,
          columns: {
            ...prev.columns,
            [sourceColKey]: { ...srcCol, items: srcItems },
            [destColKey]: { ...dstCol, items: dstItems },
          },
        };
      });

      // Refresh inquiries list to get latest data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to update inquiry status";
      setDragError(errorMessage);

      // Revert local state changes by rebuilding from inquiries prop
      setData(buildBoardState(inquiries));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const calculateKanbanBoardHeight = () => {
    // Optimized: Navbar(56px) + Toolbar(40px) + Page header(~54px) = ~150px (no footer)
    return `calc(100vh - 150px)`;
  };

  const calculateDroppableHeight = () => {
    // Use full height minus padding for the droppable area
    return `calc(100vh - 170px)`;
  };

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: calculateKanbanBoardHeight(),
        padding: 2,
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mt={2} mb={2}>
        <Input
          placeholder="Search option"
          size="small"
          fullWidth
          name="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Stack>

      <DragDropContext
        onDragStart={onDragStart}
        onDragUpdate={onDragUpdate}
        onDragEnd={onDragEnd}
      >
        <Box
          sx={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            whiteSpace: "nowrap",
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE/Edge
            "&::-webkit-scrollbar": {
              // Chrome/Safari
              display: "none",
            },
          }}
        >
          <Grid container spacing={2} wrap="nowrap" sx={{ height: "100%" }}>
            {filtered.columnOrder.map((colKey) => {
              const col = filtered.columns[colKey];
              const total = totals[colKey];

              return (
                <Grid
                  key={col.id}
                  sx={{
                    flex: "0 0 auto", // 🔥 column stays fixed width
                    display: "flex",
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: 1,
                      borderColor: "divider",
                      // 🔒 fixed size box (the one you highlighted)
                      width: COLUMN_WIDTH,
                      minWidth: COLUMN_WIDTH,
                      maxWidth: COLUMN_WIDTH,
                      height: COLUMN_HEIGHT,
                      minHeight: COLUMN_HEIGHT,
                      maxHeight: COLUMN_HEIGHT,

                      display: "flex",
                      flexDirection: "column",
                      overflowX: "auto",
                    }}
                  >
                    {/* Each column's list is a Droppable and scrolls independently */}
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => {
                        // Check if this is an invalid drop target
                        const isInvalidTarget = dragState.isDragging &&
                          snapshot.isDraggingOver &&
                          dragState.destinationStatus === getStatusFromColumnId(col.id) &&
                          !dragState.isValid;

                        return (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            sx={{
                              flex: 1, // fill the Paper vertically
                              minHeight: 0,
                              height: "100%",
                              overflowY: "auto", // 👈 only this area scrolls
                              pr: 0.5,
                              boxSizing: "border-box",
                              outline: isInvalidTarget
                                ? "3px solid red"
                                : snapshot.isDraggingOver
                                  ? "2px dashed #1976d2"
                                  : "none",
                              outlineOffset: "-2px",
                              backgroundColor: isInvalidTarget ? "rgba(255, 0, 0, 0.05)" : "transparent",
                              cursor: isInvalidTarget ? "not-allowed" : snapshot.isDraggingOver ? "move" : "default",
                              position: "relative",
                              transition: "all 0.2s ease",

                              scrollbarWidth: "none", // Firefox
                              msOverflowStyle: "none", // IE/Edge
                              "&::-webkit-scrollbar": {
                                // Chrome/Safari
                                display: "none",
                              },
                            }}
                          >
                            {/* Block indicator overlay */}
                            {isInvalidTarget && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                  zIndex: 10,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 1,
                                  pointerEvents: "none",
                                }}
                              >
                                <BlockIcon
                                  sx={{
                                    fontSize: 48,
                                    color: "error.main",
                                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                                  }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    bgcolor: "error.main",
                                    color: "white",
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontWeight: 600,
                                  }}
                                >
                                  Invalid Move
                                </Typography>
                              </Box>
                            )}
                            {/* Sticky header inside the scroll area */}
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{
                                position: "sticky",
                                top: 0,
                                zIndex: 2,
                                bgcolor: col.color,
                                color: col.fontColor ? col.fontColor : "#fff",
                                pt: 1,
                                pb: 1,
                                px: 1.5,
                                mb: 1,
                                borderRadius: 1,
                              }}
                            >
                              <Typography variant="subtitle1" fontWeight={700}>
                                {col.title}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Typography variant="body2" fontWeight={600}>
                                  {kwLabel(total.kw)}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  ({total.count})
                                </Typography>
                              </Stack>
                            </Stack>

                            {col.items.map((item, index) => (
                              <Draggable
                                key={item.id}
                                draggableId={item.id}
                                index={index}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <Paper
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    sx={{
                                      mb: 1,
                                      p: 1,
                                      borderRadius: 1,
                                      border: 1,
                                      borderColor: dragSnapshot.isDragging
                                        ? "primary.main"
                                        : "divider",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 0.5,
                                      width: "100%",
                                      minWidth: 0,
                                      boxSizing: "border-box",
                                      overflow: "hidden",
                                      wordBreak: "break-word",
                                      "& .MuiChip-root": {
                                        maxWidth: "100%",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      },
                                      boxShadow: dragSnapshot.isDragging ? 4 : 0,
                                      background: (t) =>
                                        t.palette.background.paper,
                                    }}
                                  >
                                    {/* Top row: Inquiry # + Source + Capacity + actions */}
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      sx={{ flexWrap: "wrap" }}
                                    >
                                      <Stack
                                        direction="row"
                                        spacing={0.5}
                                        sx={{ flexWrap: "wrap" }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: "primary.main",
                                            fontWeight: 600,
                                          }}
                                        >
                                          #{item.inquiryNumber || item.id}
                                        </Typography>
                                        {item.source && (
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            {item.source}
                                          </Typography>
                                        )}
                                        <Chip
                                          size="small"
                                          label={kwLabel(item.kw)}
                                          color="success"
                                          sx={{ height: 20 }}
                                        />
                                      </Stack>
                                      <Tooltip title="More actions">
                                        <IconButton
                                          size="small"
                                          sx={{ flex: "0 0 auto" }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleMenuOpen(e, item);
                                          }}
                                        >
                                          <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>

                                    {/* Customer name */}
                                    {item.customerName && (
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 700,
                                          lineHeight: 1.2,
                                          overflowWrap: "break-word",
                                          wordBreak: "break-word",
                                          whiteSpace: "normal",
                                        }}
                                        title={item.customerName}
                                      >
                                        {item.customerName}
                                      </Typography>
                                    )}

                                    {/* Inquiry By / Mobile / Project Scheme / Handled By / Dates */}
                                    <Stack spacing={0.2} mt={0.5}>
                                      {item.inquiryBy && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Inquiry By: <b>{item.inquiryBy}</b>
                                        </Typography>
                                      )}
                                      {item.mobile && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          <b>{item.mobile}</b> || <b>{item.projectScheme}</b>
                                        </Typography>
                                      )}
                                      {/* {item.projectScheme && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        
                                      </Typography>
                                    )} */}
                                      {item.handledBy && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Handled By: <b>{item.handledBy}</b>
                                        </Typography>
                                      )}
                                      {item.dateOfInquiry && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Date of Inquiry: {item.dateOfInquiry}
                                        </Typography>
                                      )}
                                      {item.assignedOn && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Assigned On: {item.assignedOn}
                                        </Typography>
                                      )}
                                      {item.nextReminder && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          <AccessTimeIcon
                                            sx={{ fontSize: 12, mr: 0.3 }}
                                          />{" "}
                                          Next Reminder: {item.nextReminder}
                                        </Typography>
                                      )}
                                    </Stack>

                                  </Paper>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </Box>
                        );
                      }}
                    </Droppable>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </DragDropContext>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleViewInquiry}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View" />
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit" />
        </MenuItem>
        <MenuItem onClick={handleCall}>
          <ListItemIcon>
            <PhoneIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create Followup" />
        </MenuItem>
        <MenuItem onClick={() => handleQuotation()}>
          <ListItemIcon>
            <UploadFileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create Quotation" />
        </MenuItem>
        <MenuItem onClick={handleUploadDocuments}>
          <ListItemIcon>
            <UploadFileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Upload Documents" />
        </MenuItem>
        {(() => {
          const inquiry = inquiries.find((inq) => String(inq.id) === menuInquiryId);
          return inquiry?.status === "Quotation" ? (
            <MenuItem onClick={handleConvertToOrder}>
              <ListItemIcon>
                <ShoppingCartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Convert to Order" />
            </MenuItem>
          ) : null;
        })()}
        <MenuItem onClick={handleMarkAsDead}>
          <ListItemIcon>
            <BlockIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: "error.main" }}>Mark as Dead</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Followup Modal */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box sx={modalStyle}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Create Followup</Typography>
            <IconButton onClick={handleCloseModal} size="small" color="error">
              <CloseIcon />
            </IconButton>
          </Box>
          <FollowupForm
            defaultValues={{
              inquiry_id: selectedInquiryId || "",
              inquiry_status: pendingDragStatus || "",
              isFromInquiry: true
            }}
            onSubmit={handleSubmit}
            loading={loading}
            serverError={serverError}
            onClearServerError={() => setServerError(null)}
            onCancel={handleCloseModal}
          />
        </Box>
      </Modal>

      {/* Site Visit Modal */}
      <Modal open={siteVisitModalOpen} onClose={handleCloseSiteVisitModal}>
        <Box sx={siteVisitModalStyle}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Add Site Visit</Typography>
            <IconButton onClick={handleCloseSiteVisitModal} size="small" color="error">
              <CloseIcon />
            </IconButton>
          </Box>
          <SiteVisitForm
            defaultValues={{
              inquiry_id: selectedInquiryId || "",
              isFromInquiry: true
            }}
            onSubmit={handleSiteVisitSubmit}
            loading={siteVisitLoading}
            serverError={siteVisitServerError}
            onClearServerError={() => setSiteVisitServerError(null)}
            onCancel={handleCloseSiteVisitModal}
          />
        </Box>
      </Modal>

      {/* Upload Documents Modal */}
      <Modal
        open={documentModalOpen}
        disableEscapeKeyDown={!!documentServerError}
        onClose={(event, reason) => {
          console.log("Modal onClose called, reason:", reason, "error:", documentServerError);
          // Prevent closing if there's an error (backdrop click or ESC key)
          if (documentServerError) {
            console.log("Preventing modal close due to error");
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
                // Only allow closing if there's no error
                if (!documentServerError) {
                  setDocumentModalOpen(false);
                  setSelectedInquiryId(null);
                  setDocumentServerError(null);
                }
              }}
              size="small"
              color="error"
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
              // Only allow closing if there's no error
              if (!documentServerError) {
                setDocumentModalOpen(false);
                setSelectedInquiryId(null);
                setDocumentServerError(null);
              }
            }}
          />
        </Box>
      </Modal>

      {/* Error Snackbar - only for backend errors */}
      {dragError && (
        <Snackbar
          open={!!dragError}
          autoHideDuration={6000}
          onClose={() => setDragError(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={() => setDragError(null)} severity="error" sx={{ width: "100%" }}>
            {dragError}
          </Alert>
        </Snackbar>
      )}

      {/* Status Update Loading Indicator */}
      {updatingStatus && (
        <Box
          sx={{
            position: "fixed",
            top: 16,
            right: 16,
            bgcolor: "background.paper",
            p: 2,
            borderRadius: 1,
            boxShadow: 3,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2">Updating status...</Typography>
        </Box>
      )}
    </Paper>
  );
}
