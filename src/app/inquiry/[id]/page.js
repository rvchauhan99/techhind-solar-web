"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import {
    Box,
    Typography,
    Button,
    Grid,
    Chip,
    Divider,
    IconButton,
    Stack,
    CircularProgress,
    Paper,
    Rating,
    Tabs,
    Tab,
    Modal,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import HomeIcon from "@mui/icons-material/Home";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import EditIcon from "@mui/icons-material/Edit";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import FolderIcon from "@mui/icons-material/Folder";
import BusinessIcon from "@mui/icons-material/Business";
import DescriptionIcon from "@mui/icons-material/Description";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ReceiptIcon from "@mui/icons-material/Receipt";
import inquiryService from "@/services/inquiryService";
import followupService from "@/services/followupService";
import inquiryDocumentsService from "@/services/inquiryDocumentsService";
import siteVisitService from "@/services/siteVisitService";
import quotationService from "@/services/quotationService";
import PaginatedTable from "@/components/common/PaginatedTable";
import BucketImage from "@/components/common/BucketImage";
import FollowupForm from "@/app/followup/components/FollowupForm";
import DocumentUploadForm from "../components/DocumentUploadForm";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";

// Status color mapping (same as KanbanBoard)
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
};


function LoadingState() {
    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh",
            }}
        >
            <CircularProgress />
        </Box>
    );
}

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

function InquiryDetailsContent() {
    const { id } = useParams();
    const router = useRouter();
    const [inquiry, setInquiry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [documentModalOpen, setDocumentModalOpen] = useState(false);
    const [followupLoading, setFollowupLoading] = useState(false);
    const [documentLoading, setDocumentLoading] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [documentServerError, setDocumentServerError] = useState(null);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [documentReloadTrigger, setDocumentReloadTrigger] = useState(0);
    const fetchingRef = useRef(null); // Track current request ID

    useEffect(() => {
        if (!id) return;

        // Generate unique request ID for this effect run
        const requestId = Symbol();

        // If already fetching, skip this run
        if (fetchingRef.current !== null) {
            return;
        }

        // Mark this as the current request
        fetchingRef.current = requestId;

        const loadInquiry = async () => {
            try {
                setLoading(true);
                const res = await inquiryService.getInquiryById(id);

                // Only update if this is still the current request
                if (fetchingRef.current === requestId) {
                    const data = res?.result || res?.data || res || null;
                    setInquiry(data);
                }
            } catch (err) {
                if (fetchingRef.current === requestId) {
                    console.error("Failed to load inquiry", err);
                    toastError(err?.response?.data?.message || err?.message || "Failed to load inquiry");
                }
            } finally {
                // Only update loading and reset if this is still the current request
                if (fetchingRef.current === requestId) {
                    setLoading(false);
                    fetchingRef.current = null;
                }
            }
        };

        loadInquiry();

        // No cleanup needed - let the request complete and reset itself
        // This prevents StrictMode from interfering
    }, [id]);

    const handleMenuOpen = (event) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleEdit = () => {
        router.push(`/inquiry/edit?id=${id}`);
        handleMenuClose();
    };

    const handleCall = () => {
        setModalOpen(true);
        setServerError(null);
        handleMenuClose();
    };

    const handleUploadDocuments = () => {
        setDocumentModalOpen(true);
        setDocumentServerError(null);
        handleMenuClose();
    };

    const handleCreateQuotation = () => {
        router.push(
            `/quotation/add?inquiry=${encodeURIComponent(JSON.stringify(inquiry))}`
        );
    };

    const handleOpenModal = () => {
        setModalOpen(true);
        setServerError(null);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setServerError(null);
    };

    const handleFollowupSubmit = async (payload) => {
        setFollowupLoading(true);
        setServerError(null);
        try {
            await followupService.createFollowup(payload);
            toastSuccess("Followup created successfully");
            handleCloseModal();
            setReloadTrigger((prev) => prev + 1);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Failed to create followup";
            setServerError(errorMessage);
            toastError(errorMessage);
        } finally {
            setFollowupLoading(false);
        }
    };

    const handleDocumentSubmit = async (payload) => {
        setDocumentLoading(true);
        setDocumentServerError(null);
        try {
            await inquiryDocumentsService.createInquiryDocument(payload);
            toastSuccess("Document uploaded successfully");
            setDocumentModalOpen(false);
            setDocumentServerError(null);
            setDocumentReloadTrigger((prev) => prev + 1);
        } catch (err) {
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

            setDocumentServerError(errorMessage);
            toastError(errorMessage);
        } finally {
            setDocumentLoading(false);
        }
    };

    const handleCloseDocumentModal = () => {
        // Don't close if there's an error - user must acknowledge the error first
        if (documentServerError) {
            return;
        }
        setDocumentModalOpen(false);
        setDocumentServerError(null);
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    // Fetcher function for followups filtered by inquiry ID
    // Must be defined before early returns to maintain hook order
    const fetchFollowupsByInquiry = useCallback(async (params) => {
        return await followupService.listFollowups({
            ...params,
            inquiry_id: id,
        });
    }, [id]);

    // Fetcher function for documents filtered by inquiry ID
    const fetchDocumentsByInquiry = useCallback(async (params) => {
        return await inquiryDocumentsService.listInquiryDocuments({
            ...params,
            inquiry_id: id,
        });
    }, [id]);

    // Fetcher function for site visits filtered by inquiry ID
    const fetchSiteVisitsByInquiry = useCallback(async (params) => {
        return await siteVisitService.getList({
            ...params,
            inquiry_id: id,
        });
    }, [id]);

    // Fetcher function for quotations filtered by inquiry ID
    const fetchQuotationsByInquiry = useCallback(async (params) => {
        const response = await quotationService.getQuotations({
            ...params,
            inquiry_id: id,
        });
        // Handle response structure - could be { result: { data, meta } } or { data, meta }
        if (response?.result) {
            return response.result;
        }
        return response;
    }, [id]);

    if (loading) return <LoadingState />;
    if (!inquiry) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Inquiry not found.</Typography>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.push("/inquiry")}
                    sx={{ mt: 2 }}
                >
                    Back to List
                </Button>
            </Box>
        );
    }

    const formatDate = (date) => {
        if (!date) return "-";
        return moment(date).format("DD-MM-YYYY");
    };

    const formatDateWithToday = (date) => {
        if (!date) return "-";
        const formatted = moment(date).format("DD-MM-YYYY");
        const isToday = moment(date).isSame(moment(), "day");
        return isToday ? `${formatted} Today` : formatted;
    };

    const formatDateOnly = (dateString) => {
        if (!dateString || dateString === null || dateString === undefined) return "N/A";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "N/A";
            return date.toLocaleDateString();
        } catch {
            return "N/A";
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString || dateString === null || dateString === undefined) return "N/A";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "N/A";
            return date.toLocaleString();
        } catch {
            return "N/A";
        }
    };

    const renderRating = (rating) => {
        const numRating = rating ? parseInt(rating) : 0;
        return (
            <Rating
                value={numRating}
                readOnly
                size="small"
                sx={{
                    "& .MuiRating-iconFilled": {
                        color: "#FFC107",
                    },
                }}
            />
        );
    };

    const getStatusColor = (status) => {
        const statusColors = {
            New: "error",
            Connected: "info",
            "Site Visit Done": "warning",
            Quotation: "success",
            "Under Discussion": "primary",
        };
        return statusColors[status] || "default";
    };

    const calculateInquiryDetailsHeight = () => {
        return `calc(100vh - 130px)`;
    };

    return (
        <Box sx={{ width: "100%", maxWidth: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexShrink: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Inquiry Details
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<HomeIcon />}
                        onClick={() => router.push("/home")}
                        size="small"
                    >
                        Home
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ListAltIcon />}
                        onClick={() => router.push("/inquiry")}
                        size="small"
                    >
                        Inquiry
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={2} sx={{ width: "100%", maxWidth: "100%", margin: 0, flex: 1, minHeight: 0, overflow: "hidden" }}>
                {/* Left Sidebar - Inquiry Details (Grid size 3) */}
                <Grid size={3} sx={{ maxWidth: "100%", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            bgcolor: "grey.50",
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            height: "100%",
                            maxHeight: calculateInquiryDetailsHeight(),
                            overflowY: "auto",
                            overflowX: "hidden",
                            width: "100%",
                            maxWidth: "100%",
                            // Show scrollbar
                            scrollbarWidth: "thin", // Firefox
                            msOverflowStyle: "auto", // IE/Edge
                            "&::-webkit-scrollbar": {
                                width: "8px",
                            },
                            "&::-webkit-scrollbar-track": {
                                background: "#f1f1f1",
                            },
                            "&::-webkit-scrollbar-thumb": {
                                background: "#888",
                                borderRadius: "4px",
                            },
                            "&::-webkit-scrollbar-thumb:hover": {
                                background: "#555",
                            },
                        }}
                    >
                        <Stack spacing={2} sx={{ height: "100%" }}>
                            {/* Header with PUI and Icons */}
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    PUI: {inquiry.inquiry_number || "-"}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    <IconButton
                                        size="small"
                                        onClick={handleOpenModal}
                                    >
                                        <PhoneIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={handleCreateQuotation}
                                        title="Create Quotation"
                                    >
                                        <ReceiptIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={handleMenuOpen}>
                                        <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
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
                            </Menu>

                            {/* Client/Company Name */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Client/Company Name
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {inquiry.company_name || inquiry.customer_name || "-"}
                                </Typography>
                            </Box>

                            {/* Location */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Location
                                </Typography>
                                <Typography variant="body2">
                                    {[inquiry.city_name, inquiry.state_name]
                                        .filter(Boolean)
                                        .join(" | ") || "-"}
                                </Typography>
                            </Box>

                            {/* Contact Information */}
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    {inquiry.mobile_number && (
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <PhoneIcon fontSize="small" color="action" />
                                            <Typography variant="caption">{inquiry.mobile_number}</Typography>
                                        </Stack>
                                    )}
                                    {inquiry.email_id && (
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <EmailIcon fontSize="small" color="action" />
                                            <Typography variant="caption">{inquiry.email_id}</Typography>
                                        </Stack>
                                    )}
                                    {inquiry.address && (
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <LocationOnIcon fontSize="small" color="action" />
                                            <Typography variant="caption" sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {inquiry.address}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Stack>
                            </Box>

                            {/* Capacity */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Capacity
                                </Typography>
                                <Chip
                                    label={`${Number(inquiry.capacity || 0).toFixed(2)} KW`}
                                    color="success"
                                    size="small"
                                    sx={{ mt: 0.5 }}
                                />
                            </Box>

                            {/* PV Capacity */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    PV Capacity
                                </Typography>
                                <Typography variant="body2">0</Typography>
                            </Box>

                            {/* Project Scheme */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Project Scheme
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.project_scheme || "-"}
                                </Typography>
                            </Box>

                            {/* Created On */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Created On
                                </Typography>
                                <Typography variant="body2">
                                    {formatDate(inquiry.created_at)}
                                </Typography>
                            </Box>

                            {/* Inquiry By */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Inquiry By
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.inquiry_by_name || "-"}
                                </Typography>
                            </Box>

                            {/* Inquiry Source */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Inquiry Source
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.inquiry_source || "-"}
                                </Typography>
                            </Box>

                            {/* Branch */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Branch
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.branch_name || "-"}
                                </Typography>
                            </Box>

                            {/* Handled By */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Handled By
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.handled_by_name || "-"}
                                </Typography>
                            </Box>

                            {/* Channel Partner */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Channel Partner
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.channel_partner_name || "-"}
                                </Typography>
                            </Box>

                            {/* Rating */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Rating
                                </Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    {renderRating(inquiry.rating)}
                                </Box>
                            </Box>

                            {/* Next Reminder Date */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Next Reminder Date
                                </Typography>
                                <Typography variant="body2">
                                    {formatDate(inquiry.next_reminder_date)}
                                </Typography>
                            </Box>

                            {/* Reference From */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Reference From
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.reference_from || "-"}
                                </Typography>
                            </Box>

                            {/* Monthly Bill */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Monthly Bill
                                </Typography>
                                <Typography variant="body2">0</Typography>
                            </Box>

                            {/* Estimated Cost */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Estimated Cost
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.estimated_cost ? `₹${Number(inquiry.estimated_cost).toLocaleString()}` : "-"}
                                </Typography>
                            </Box>

                            {/* Remarks */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Remarks
                                </Typography>
                                <Typography variant="body2">
                                    {inquiry.remarks || "-"}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Right Section - Actions and Tabs (Grid size 9) */}
                <Grid size={9} sx={{ maxWidth: "100%", overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0, height: calculateInquiryDetailsHeight(), }}>
                    <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1, width: "100%", maxWidth: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        {/* Status Dates */}
                        <Box display="flex" gap={5} mb={1} flexWrap="wrap" sx={{ width: "100%", maxWidth: "100%", flexShrink: 0 }}>
                            {/* Inquiry Stage */}
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                                    Inquiry Stage
                                </Typography>
                                {(() => {
                                    const status = inquiry?.status || "New";
                                    const statusConfig = STATUS_COLUMNS[status] || STATUS_COLUMNS["New"];
                                    return (
                                        <Chip
                                            label={status}
                                            size="small"
                                            sx={{
                                                backgroundColor: statusConfig.color,
                                                color: statusConfig.fontColor || "#fff",
                                                fontWeight: 600,
                                                height: 24,
                                                minWidth: 60,
                                                display: "inline-flex",
                                            }}
                                        />
                                    );
                                })()}
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Assigned On
                                </Typography>
                                <Typography variant="body2">
                                    {formatDateWithToday(inquiry.date_of_inquiry)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Last Call On
                                </Typography>
                                <Typography variant="body2">-</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Last Site Visit On
                                </Typography>
                                <Typography variant="body2">-</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Last Quotation On
                                </Typography>
                                <Typography variant="body2">-</Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 1, flexShrink: 0 }} />

                        {/* Horizontal Tabs */}
                        <Box sx={{ width: "100%", maxWidth: "100%", overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                sx={{
                                    borderBottom: 1,
                                    borderColor: "divider",
                                    mb: 2,
                                    width: "100%",
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                    "& .MuiTab-root": {
                                        textTransform: "none",
                                        minHeight: 48,
                                    },
                                }}
                            >
                                <Tab
                                    icon={<PhoneIcon />}
                                    iconPosition="start"
                                    label="Follow-ups"
                                    sx={{ pr: 3 }}
                                />
                                <Tab
                                    icon={<BusinessIcon />}
                                    iconPosition="start"
                                    label="Site Visits"
                                    sx={{ pr: 3 }}
                                />
                                <Tab
                                    icon={<DescriptionIcon />}
                                    iconPosition="start"
                                    label="Previous Quotation"
                                    sx={{ pr: 3 }}
                                />
                                <Tab
                                    icon={<FolderIcon />}
                                    iconPosition="start"
                                    label="Documents"
                                    sx={{ pr: 3 }}
                                />
                            </Tabs>

                            {/* Tab Panels */}
                            <Box sx={{ pt: 0, width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                                {/* Follow-ups Tab */}
                                {activeTab === 0 && (
                                    <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", }}>
                                        <PaginatedTable
                                            key={reloadTrigger}
                                            fetcher={fetchFollowupsByInquiry}
                                            initialPage={1}
                                            initialLimit={10}
                                            height="100%"
                                            getRowKey={(row) => row.followup_id ? `${row.id}-${row.followup_id}` : `${row.id}-no-followup`}
                                            columns={[
                                                {
                                                    field: "call_on",
                                                    label: "Call On",
                                                    render: (row) => row.followup_id ? formatDateTime(row.followup_created_at) : <Typography variant="body2" color="text.secondary">-</Typography>,
                                                },
                                                {
                                                    field: "call_by",
                                                    label: "Call By",
                                                    render: (row) => {
                                                        if (!row.followup_id) return <Typography variant="body2" color="text.secondary">-</Typography>;
                                                        const user = row.followup_call_by_user;
                                                        return user ? `${user.name} (${user.email})` : "N/A";
                                                    },
                                                },
                                                {
                                                    field: "status",
                                                    label: "Status",
                                                    render: (row) => row.followup_id ? (row.followup_status || "N/A") : <Typography variant="body2" color="text.secondary">No Followup</Typography>,
                                                },
                                                {
                                                    field: "next_reminder",
                                                    label: "Next Reminder",
                                                    render: (row) => row.followup_id ? formatDateOnly(row.followup_next_reminder) : <Typography variant="body2" color="text.secondary">-</Typography>,
                                                },
                                                {
                                                    field: "remarks",
                                                    label: "Call Remarks",
                                                    wrap: true,
                                                    render: (row) => {
                                                        if (!row.followup_id) return <Typography variant="body2" color="text.secondary">-</Typography>;
                                                        return row.followup_remarks || "N/A";
                                                    },
                                                },
                                                {
                                                    field: "rating",
                                                    label: "Rating",
                                                    render: (row) => {
                                                        if (!row.followup_id) return <Typography variant="body2" color="text.secondary">-</Typography>;
                                                        return row.followup_rating ? renderRating(row.followup_rating) : "N/A";
                                                    },
                                                },
                                            ]}
                                        />
                                    </Box>
                                )}

                                {/* Site Visits Tab */}
                                {activeTab === 1 && (
                                    <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                                        <PaginatedTable
                                            key={`site-visits-${reloadTrigger}`}
                                            fetcher={fetchSiteVisitsByInquiry}
                                            initialPage={1}
                                            initialLimit={10}
                                            height="100%"
                                            getRowKey={(row) => row.site_visit_id || row.id || Math.random()}
                                            columns={[
                                                {
                                                    field: "schedule_on",
                                                    label: "Schedule On",
                                                    render: (row) => formatDateOnly(row.site_visit_schedule_on) || "-",
                                                },
                                                {
                                                    field: "schedule_remarks",
                                                    label: "Schedule Remarks",
                                                    wrap: true,
                                                    render: (row) => row.site_visit_schedule_remarks || "-",
                                                },
                                                {
                                                    field: "assign_to",
                                                    label: "Assign To",
                                                    render: (row) => row.site_visit_visit_assign_to ? `User ID: ${row.site_visit_visit_assign_to}` : "-",
                                                },
                                                {
                                                    field: "status",
                                                    label: "Status",
                                                    render: (row) => row.site_visit_visit_status || row.site_visit_status || "-",
                                                },
                                                {
                                                    field: "visited_on",
                                                    label: "Visited On",
                                                    render: (row) => formatDateOnly(row.site_visit_visit_date) || "-",
                                                },
                                                {
                                                    field: "visit_remarks",
                                                    label: "Visit Remarks",
                                                    wrap: true,
                                                    render: (row) => row.site_visit_remarks || "-",
                                                },
                                                {
                                                    field: "visit_photo",
                                                    label: "Visit Photo",
                                                    render: (row) => {
                                                        if (!row.site_visit_visit_photo) return "-";
                                                        return (
                                                            <BucketImage
                                                                path={row.site_visit_visit_photo}
                                                                getUrl={siteVisitService.getDocumentUrl}
                                                                alt="Visit Photo"
                                                            />
                                                        );
                                                    },
                                                },
                                                {
                                                    field: "visit_location",
                                                    label: "Visit Location",
                                                    render: (row) => {
                                                        if (row.site_visit_site_latitude && row.site_visit_site_longitude) {
                                                            return `${row.site_visit_site_latitude}, ${row.site_visit_site_longitude}`;
                                                        }
                                                        return "-";
                                                    },
                                                },
                                                {
                                                    field: "added_to",
                                                    label: "Added To",
                                                    render: (row) => formatDateOnly(row.site_visit_created_at) || "-",
                                                },
                                                {
                                                    field: "assigned_on",
                                                    label: "Assigned On",
                                                    render: (row) => formatDateOnly(row.site_visit_schedule_on) || formatDateOnly(row.site_visit_created_at) || "-",
                                                },
                                            ]}
                                        />
                                    </Box>
                                )}

                                {/* Previous Quotation Tab */}
                                {activeTab === 2 && (
                                    <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                                        <PaginatedTable
                                            key={`quotations-${reloadTrigger}`}
                                            fetcher={fetchQuotationsByInquiry}
                                            initialPage={1}
                                            initialLimit={10}
                                            height="100%"
                                            getRowKey={(row) => row.id || Math.random()}
                                            columns={[
                                                {
                                                    field: "action",
                                                    label: "Action",
                                                    render: (row) => (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => router.push(`/quotation/edit?id=${row.id}`)}
                                                        >
                                                            View
                                                        </Button>
                                                    ),
                                                },
                                                {
                                                    field: "quotation_number",
                                                    label: "#",
                                                    render: (row) => row.quotation_number || "-",
                                                },
                                                {
                                                    field: "quotation_date",
                                                    label: "Generated On",
                                                    render: (row) => formatDateOnly(row.quotation_date) || "-",
                                                },
                                                {
                                                    field: "valid_till",
                                                    label: "Valid Till",
                                                    render: (row) => formatDateOnly(row.valid_till) || "-",
                                                },
                                                {
                                                    field: "project_capacity",
                                                    label: "Capacity",
                                                    render: (row) => row.project_capacity ? `${Number(row.project_capacity).toFixed(2)} KW` : "-",
                                                },
                                                {
                                                    field: "total_project_value",
                                                    label: "Total Amount",
                                                    render: (row) => row.total_project_value ? `₹${Number(row.total_project_value).toLocaleString()}` : "-",
                                                },
                                                {
                                                    field: "panel_make",
                                                    label: "Panel Make",
                                                    render: (row) => {
                                                        if (row.panel_make_ids && Array.isArray(row.panel_make_ids) && row.panel_make_ids.length > 0) {
                                                            return row.panel_make_ids.join(", ");
                                                        }
                                                        return row.panel_make || "-";
                                                    },
                                                },
                                                {
                                                    field: "status",
                                                    label: "Status",
                                                    render: (row) => row.status || "-",
                                                },
                                                {
                                                    field: "status_on",
                                                    label: "Status On",
                                                    render: (row) => formatDateOnly(row.status_on) || "-",
                                                },
                                                {
                                                    field: "project_scheme_name",
                                                    label: "Project Scheme",
                                                    render: (row) => row.project_scheme_name || "-",
                                                },
                                                {
                                                    field: "user_name",
                                                    label: "Generated By",
                                                    render: (row) => row.user_name || "-",
                                                },
                                                {
                                                    field: "branch_name",
                                                    label: "Branch",
                                                    render: (row) => row.branch_name || "-",
                                                },
                                            ]}
                                        />
                                    </Box>
                                )}

                                {/* Documents Tab */}
                                {activeTab === 3 && (
                                    <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                                        <PaginatedTable
                                            key={documentReloadTrigger}
                                            fetcher={fetchDocumentsByInquiry}
                                            initialPage={1}
                                            initialLimit={10}
                                            height="100%"
                                            getRowKey={(row) => row.id}
                                            columns={[
                                                {
                                                    field: "doc_type",
                                                    label: "Document Type",
                                                    render: (row) => row.doc_type || "-",
                                                },
                                                {
                                                    field: "document_path",
                                                    label: "Document",
                                                    render: (row) => {
                                                        if (!row.document_path) return "-";
                                                        return (
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={async () => {
                                                                    try {
                                                                        const url = await inquiryDocumentsService.getDocumentUrl(row.id);
                                                                        if (url) window.open(url, "_blank");
                                                                    } catch (e) {
                                                                        console.error("Failed to get document URL", e);
                                                                    }
                                                                }}
                                                            >
                                                                View Document
                                                            </Button>
                                                        );
                                                    },
                                                },
                                                {
                                                    field: "remarks",
                                                    label: "Remarks",
                                                    wrap: true,
                                                    render: (row) => row.remarks || "-",
                                                },
                                                {
                                                    field: "created_at",
                                                    label: "Uploaded On",
                                                    render: (row) => formatDateTime(row.created_at),
                                                },
                                            ]}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Create Followup Modal */}
            <Modal open={modalOpen} onClose={handleCloseModal}>
                <Box sx={modalStyle}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Create Followup</Typography>
                        <IconButton onClick={handleCloseModal} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <FollowupForm
                        defaultValues={{ inquiry_id: id || "" }}
                        onSubmit={handleFollowupSubmit}
                        loading={followupLoading}
                        serverError={serverError}
                        onClearServerError={() => setServerError(null)}
                        onCancel={handleCloseModal}
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
                        defaultValues={{ inquiry_id: id || "" }}
                        inquiryId={id}
                        onSubmit={handleDocumentSubmit}
                        loading={documentLoading}
                        serverError={documentServerError}
                        onClearServerError={() => setDocumentServerError(null)}
                        onCancel={() => {
                            // Only allow closing if there's no error
                            if (!documentServerError) {
                                setDocumentModalOpen(false);
                                setDocumentServerError(null);
                            }
                        }}
                    />
                </Box>
            </Modal>
        </Box>
    );
}

export default function InquiryDetailsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<LoadingState />}>
                <InquiryDetailsContent />
            </Suspense>
        </ProtectedRoute>
    );
}
