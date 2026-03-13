"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
    IconButton,
    Tooltip,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import quotationService from "@/services/quotationService";
import apiClient from "@/services/apiClient";
import moment from "moment";
import { calculateTotals } from "../components/quotation/quotationCalculations";
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

// Module-level dedupe: one in-flight request per id (survives Strict Mode remounts and multiple effect runs)
const quotationFetchInFlight = new Set();
const pdfFetchInFlight = new Set();
const PDF_POLL_TIMEOUT_FALLBACK_MS = 240000;
const PDF_POLL_DELAY_MIN_MS = 1500;
const PDF_POLL_DELAY_MAX_MS = 5000;
const PDF_TAKING_LONGER_THRESHOLD_MS = 25000;

// Number to words converter for Indian currency
const numberToWords = (num) => {
    if (!num || isNaN(num)) return "";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

    const convertLessThanThousand = (n) => {
        if (n === 0) return "";
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertLessThanThousand(n % 100) : "");
    };

    num = Math.floor(num);
    if (num === 0) return "Zero";

    let result = "";

    // Crores
    if (num >= 10000000) {
        result += convertLessThanThousand(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
    }

    // Lakhs
    if (num >= 100000) {
        result += convertLessThanThousand(Math.floor(num / 100000)) + " Lakh ";
        num %= 100000;
    }

    // Thousands
    if (num >= 1000) {
        result += convertLessThanThousand(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
    }

    // Remaining
    if (num > 0) {
        result += convertLessThanThousand(num);
    }

    return result.trim() + " Only";
};

export default function QuotationDetail() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfTakingLonger, setPdfTakingLonger] = useState(false);
    const [iframeReady, setIframeReady] = useState(false);
    const [error, setError] = useState(null);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [unapproveDialogOpen, setUnapproveDialogOpen] = useState(false);
    const [actionId, setActionId] = useState(null);
    const pdfAbortRef = useRef(null);
    const pdfPollTimerRef = useRef(null);
    const pdfRequestedRef = useRef(false);
    const pdfRequestInFlightRef = useRef(false);
    const pdfPollTimeoutRef = useRef(PDF_POLL_TIMEOUT_FALLBACK_MS);

    useEffect(() => {
        if (!id) return;
        if (quotationFetchInFlight.has(id)) return;
        quotationFetchInFlight.add(id);
        loadQuotation();
        return () => {
            pdfRequestedRef.current = false;
        };
    }, [id]);

    useEffect(() => {
        return () => {
            // Abort any in-flight PDF request when unmounting or changing id
            if (pdfAbortRef.current) {
                try {
                    pdfAbortRef.current.abort();
                } catch {
                    // ignore
                }
            }
            if (pdfPollTimerRef.current) {
                clearTimeout(pdfPollTimerRef.current);
                pdfPollTimerRef.current = null;
            }
            if (pdfUrl?.startsWith?.("blob:")) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    const loadQuotation = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await quotationService.getQuotationById(id);
            const data = response.result || response.data || response;
            setQuotation(data);
            if (!pdfRequestedRef.current && !pdfFetchInFlight.has(id)) {
                pdfRequestedRef.current = true;
                generatePdf();
            }
        } catch (err) {
            console.error("Failed to load quotation", err);
            setError("Failed to load quotation");
        } finally {
            quotationFetchInFlight.delete(id);
            setLoading(false);
        }
    };

    const waitForPdfJobCompletion = useCallback(async (jobId, controller, pollTimeoutMs, { onTakingLong } = {}) => {
        const startedAt = Date.now();
        let attempts = 0;
        let allowedTimeoutMs = Math.max(PDF_POLL_TIMEOUT_FALLBACK_MS, Number(pollTimeoutMs) || 0);
        let takingLongNotified = false;
        while (!controller.signal.aborted) {
            const statusRes = await quotationService.getPdfJobStatus(jobId);
            const statusPayload = statusRes?.result || statusRes?.data || statusRes;
            const serverTimeoutMs = Number(statusPayload?.timing?.recommended_poll_timeout_ms || 0);
            if (serverTimeoutMs > 0) {
                allowedTimeoutMs = Math.max(allowedTimeoutMs, serverTimeoutMs);
                pdfPollTimeoutRef.current = allowedTimeoutMs;
            }
            const status = statusPayload?.status;
            if (status === "completed") {
                return true;
            }
            if (status === "failed") {
                throw new Error(statusPayload?.error || "PDF job failed");
            }
            if (Date.now() - startedAt > allowedTimeoutMs) {
                throw new Error("PDF generation timeout");
            }
            const elapsed = Date.now() - startedAt;
            if (!takingLongNotified && elapsed >= PDF_TAKING_LONGER_THRESHOLD_MS && onTakingLong) {
                takingLongNotified = true;
                onTakingLong();
            }
            attempts += 1;
            const delayMs = Math.min(
                PDF_POLL_DELAY_MAX_MS,
                PDF_POLL_DELAY_MIN_MS + attempts * 300
            );
            await new Promise((resolve) => {
                pdfPollTimerRef.current = setTimeout(resolve, delayMs);
            });
        }
        return false;
    }, []);

    const generatePdf = useCallback(async () => {
        if (pdfFetchInFlight.has(id)) return;
        pdfFetchInFlight.add(id);
        pdfRequestInFlightRef.current = true;
        if (pdfAbortRef.current) pdfAbortRef.current.abort();
        const controller = new AbortController();
        pdfAbortRef.current = controller;

        setPdfLoading(true);
        setPdfTakingLonger(false);
        setIframeReady(false);
        try {
            const createRes = await quotationService.createPdfJob(id);
            const payload = createRes?.result || createRes?.data || createRes;
            const jobId = payload?.job_id;
            const alreadyDone = payload?.status === "completed";
            const pollTimeoutMs = Number(payload?.timing?.recommended_poll_timeout_ms || 0);
            if (pollTimeoutMs > 0) {
                pdfPollTimeoutRef.current = Math.max(PDF_POLL_TIMEOUT_FALLBACK_MS, pollTimeoutMs);
            }
            if (!alreadyDone && jobId) {
                await waitForPdfJobCompletion(jobId, controller, pdfPollTimeoutRef.current, {
                    onTakingLong: () => setPdfTakingLonger(true),
                });
            }
            const blob = jobId
                ? await quotationService.downloadPdfJob(jobId)
                : await quotationService.pdfGenerate(id);
            if (controller.signal.aborted) return;
            if (!(blob instanceof Blob)) throw new Error("Expected blob");
            const blobUrl = URL.createObjectURL(blob);
            setPdfUrl((prev) => {
                if (prev?.startsWith?.("blob:")) URL.revokeObjectURL(prev);
                return blobUrl;
            });
        } catch (err) {
            if (!controller.signal.aborted) {
                console.error("Failed to generate PDF:", err);
                toast.error(err?.message || "Failed to generate PDF");
                pdfRequestedRef.current = false;
            }
        } finally {
            pdfFetchInFlight.delete(id);
            pdfRequestInFlightRef.current = false;
            if (!controller.signal.aborted) {
                setPdfLoading(false);
                setPdfTakingLonger(false);
            }
        }
    }, [id, waitForPdfJobCompletion]);

    const handlePrint = () => {
        if (pdfUrl) {
            const printWindow = window.open(pdfUrl, "_blank");
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
        }
    };

    const handleOpenInNewTab = () => {
        if (pdfUrl) {
            window.open(pdfUrl, "_blank");
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        if (pdfUrl.startsWith("blob:")) {
            const link = document.createElement("a");
            link.href = pdfUrl;
            link.download = `quotation-${quotation?.quotation_number || id}.pdf`;
            link.click();
            return;
        }
        apiClient.get(pdfUrl, { responseType: "blob" }).then((response) => {
            const blob = response.data;
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `quotation-${quotation?.quotation_number || id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }).catch((err) => {
            console.error("Failed to download PDF:", err);
            window.open(pdfUrl, "_blank");
        });
    };

    const handleApproveClick = () => {
        setApproveDialogOpen(true);
    };

    const handleApproveConfirm = async () => {
        if (!id) return;
        setActionId(id);
        try {
            await quotationService.approveQuotation(id);
            setQuotation((prev) => (prev ? { ...prev, is_approved: true } : null));
            setApproveDialogOpen(false);
            toast.success("Quotation approved");
        } catch (err) {
            console.error("Failed to approve quotation", err);
            toast.error(err.response?.data?.message || "Failed to approve quotation");
        } finally {
            setActionId(null);
        }
    };

    const handleUnapproveClick = () => {
        setUnapproveDialogOpen(true);
    };

    const handleUnapproveConfirm = async () => {
        if (!id) return;
        setActionId(id);
        try {
            await quotationService.unapproveQuotation(id);
            setQuotation((prev) => (prev ? { ...prev, is_approved: false } : null));
            setUnapproveDialogOpen(false);
            toast.success("Quotation unapproved");
        } catch (err) {
            console.error("Failed to unapprove quotation", err);
            toast.error(err.response?.data?.message || "Failed to unapprove quotation");
        } finally {
            setActionId(null);
        }
    };

    const formatDate = (date) => {
        if (!date) return "-";
        return moment(date).format("DD-MM-YYYY");
    };

    const formatCurrency = (amount) => {
        if (!amount) return "₹0";
        return `₹${Number(amount).toLocaleString("en-IN")}`;
    };

    const totals = quotation ? calculateTotals(quotation) : null;
    const headerTotalPayableRaw =
        (totals && totals.totalPayable) ??
        quotation?.total_payable ??
        quotation?.effective_cost ??
        quotation?.total_project_value ??
        0;
    const headerTotalPayable = Math.round(Number(headerTotalPayableRaw) || 0);

    if (loading) {
        return (
            <ProtectedRoute>
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                    <CircularProgress />
                </Box>
            </ProtectedRoute>
        );
    }

    if (error) {
        return (
            <ProtectedRoute>
                <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="error">{error}</Typography>
                    <Button variant="outlined" onClick={() => router.push("/quotation")} sx={{ mt: 2 }}>
                        Back to List
                    </Button>
                </Box>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <Box sx={{ bgcolor: "#fff", minHeight: "calc(100vh - 64px)" }}>
                {/* Header Bar */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        py: 1.5,
                        px: 2,
                        borderBottom: "1px solid #e0e0e0",
                        bgcolor: "#fff"
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <IconButton
                            onClick={() => router.push("/quotation")}
                            size="small"
                            sx={{ color: "text.secondary" }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                            Quotation No #{quotation?.quotation_number || id}
                        </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton
                            onClick={handlePrint}
                            size="small"
                            sx={{
                                bgcolor: "#1976d2",
                                color: "white",
                                width: 36,
                                height: 36,
                                "&:hover": { bgcolor: "#1565c0" }
                            }}
                        >
                            <PrintIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            onClick={handleOpenInNewTab}
                            size="small"
                            sx={{
                                bgcolor: "#1976d2",
                                color: "white",
                                width: 36,
                                height: 36,
                                "&:hover": { bgcolor: "#1565c0" }
                            }}
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            onClick={handleDownload}
                            size="small"
                            sx={{
                                bgcolor: "#1976d2",
                                color: "white",
                                width: 36,
                                height: 36,
                                "&:hover": { bgcolor: "#1565c0" }
                            }}
                        >
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                        {!quotation?.is_approved && (
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                                onClick={handleApproveClick}
                                sx={{
                                    bgcolor: "#4caf50",
                                    textTransform: "none",
                                    px: 2,
                                    "&:hover": { bgcolor: "#388e3c" },
                                }}
                            >
                                Approve
                            </Button>
                        )}
                        {quotation?.is_approved && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                                onClick={handleUnapproveClick}
                                sx={{
                                    textTransform: "none",
                                    px: 2,
                                }}
                            >
                                Unapprove
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Information Section */}
                <Box sx={{ p: 2.5, borderBottom: "1px solid #e0e0e0" }}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1.5fr 1fr" },
                            gap: 4,
                        }}
                    >
                        {/* Quotation Information */}
                        <Box>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 700,
                                    mb: 1.5,
                                    color: "#333",
                                    fontSize: "0.9rem"
                                }}
                            >
                                Quotation Information:
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>Quotation Date:</Box>{" "}
                                    <Box component="span" sx={{ color: "#1976d2" }}>{formatDate(quotation?.quotation_date)}</Box>
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>Valid Till:</Box>{" "}
                                    <Box component="span" sx={{ color: "#1976d2" }}>{formatDate(quotation?.valid_till)}</Box>
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>Generate By:</Box>{" "}
                                    <Box
                                        component="span"
                                        sx={{
                                            color: "#1976d2",
                                            textDecoration: "underline",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {quotation?.user?.name || "-"}
                                    </Box>
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>Contact Number:</Box>{" "}
                                    <Box component="span">{quotation?.user?.mobile_number || "-"}</Box>
                                </Typography>
                            </Box>
                        </Box>

                        {/* Customer Information */}
                        <Box>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 700,
                                    mb: 1.5,
                                    color: "#333",
                                    fontSize: "0.9rem"
                                }}
                            >
                                Customer Information:
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: "#1976d2",
                                        fontSize: "0.85rem",
                                        textTransform: "uppercase"
                                    }}
                                >
                                    {quotation?.customer_name || "-"}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#666", fontSize: "0.85rem", lineHeight: 1.4 }}>
                                    {quotation?.address || "-"}
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>Email:</Box>{" "}
                                    {quotation?.email || "-"}
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>Phone:</Box>{" "}
                                    {quotation?.mobile_number || "-"}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Payable Amount */}
                        <Box sx={{ textAlign: "right" }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 700,
                                    color: "#333",
                                    fontSize: "0.95rem",
                                    mb: 0.5
                                }}
                            >
                                Total Payable: {formatCurrency(headerTotalPayable)}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "#1976d2",
                                    textTransform: "uppercase",
                                    fontSize: "0.7rem",
                                    letterSpacing: "0.5px"
                                }}
                            >
                                {numberToWords(headerTotalPayable)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* PDF Viewer */}
                <Box sx={{ bgcolor: "#f5f5f5", p: 0, position: "relative" }}>
                    {(pdfLoading || (pdfUrl && !iframeReady)) && (
                        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "calc(100vh - 150px)", position: pdfUrl ? "absolute" : "relative", inset: 0, zIndex: 2, bgcolor: "#f5f5f5" }}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <CircularProgress size={32} />
                                <Typography sx={{ ml: 2, color: "#666" }}>Generating PDF...</Typography>
                            </Box>
                            {pdfTakingLonger && (
                                <Typography sx={{ mt: 1, color: "#888", fontSize: "0.875rem" }}>
                                    PDF is taking longer than usual. Please wait…
                                </Typography>
                            )}
                        </Box>
                    )}
                    {pdfUrl ? (
                        <Box sx={{ height: "calc(100vh - 150px)", visibility: iframeReady ? "visible" : "hidden" }}>
                            <iframe
                                src={pdfUrl}
                                onLoad={() => setIframeReady(true)}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    border: "none",
                                }}
                                title="Quotation PDF"
                            />
                        </Box>
                    ) : !pdfLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 150px)" }}>
                            <Typography color="text.secondary">PDF not available</Typography>
                        </Box>
                    ) : null}
                </Box>
            </Box>

            <AlertDialog open={approveDialogOpen} onOpenChange={(open) => { if (!open) setApproveDialogOpen(false); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Quotation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to approve this quotation? Only one quotation per inquiry can be approved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApproveConfirm} disabled={!!actionId} loading={!!actionId}>
                            Approve
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={unapproveDialogOpen} onOpenChange={(open) => { if (!open) setUnapproveDialogOpen(false); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unapprove Quotation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to unapprove this quotation?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnapproveConfirm} disabled={!!actionId} loading={!!actionId}>
                            Unapprove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    );
}
