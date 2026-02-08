"use client";

import { useState, useEffect } from "react";
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
import ProtectedRoute from "@/components/common/ProtectedRoute";
import quotationService from "@/services/quotationService";
import apiClient, { resolveDocumentUrl } from "@/services/apiClient";
import moment from "moment";

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
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            loadQuotation();
        }
    }, [id]);

    const loadQuotation = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await quotationService.getQuotationById(id);
            const data = response.result || response.data || response;
            setQuotation(data);
            // Auto-generate PDF after loading quotation
            generatePdf();
        } catch (err) {
            console.error("Failed to load quotation", err);
            setError("Failed to load quotation");
        } finally {
            setLoading(false);
        }
    };

    const generatePdf = async () => {
        setPdfLoading(true);
        try {
            const response = await quotationService.pdfGenerate(id);
            const pdfPath = response.result?.path;
            if (pdfPath) {
                setPdfUrl(resolveDocumentUrl(pdfPath));
            }
        } catch (err) {
            console.error("Failed to generate PDF:", err);
        } finally {
            setPdfLoading(false);
        }
    };

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

    const handleDownload = async () => {
        if (pdfUrl) {
            try {
                const response = await apiClient.get(pdfUrl, { responseType: "blob" });
                const blob = response.data;
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = `quotation-${quotation?.quotation_number || id}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            } catch (err) {
                console.error("Failed to download PDF:", err);
                window.open(pdfUrl, "_blank");
            }
        }
    };

    const handleDecline = () => {
        alert("Decline functionality coming soon!");
    };

    const handleAccept = () => {
        alert("Accept functionality coming soon!");
    };

    const formatDate = (date) => {
        if (!date) return "-";
        return moment(date).format("DD-MM-YYYY");
    };

    const formatCurrency = (amount) => {
        if (!amount) return "₹0";
        return `₹${Number(amount).toLocaleString("en-IN")}`;
    };

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
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                            onClick={handleDecline}
                            sx={{ 
                                bgcolor: "#f44336",
                                textTransform: "none",
                                px: 2,
                                "&:hover": { bgcolor: "#d32f2f" }
                            }}
                        >
                            Decline
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                            onClick={handleAccept}
                            sx={{ 
                                bgcolor: "#4caf50",
                                textTransform: "none",
                                px: 2,
                                "&:hover": { bgcolor: "#388e3c" }
                            }}
                        >
                            Accept
                        </Button>
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
                                Payable Amount: {formatCurrency(quotation?.effective_cost || quotation?.total_project_value)}
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
                                {numberToWords(quotation?.effective_cost || quotation?.total_project_value)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* PDF Viewer */}
                <Box sx={{ bgcolor: "#f5f5f5", p: 0 }}>
                    {pdfLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 150px)" }}>
                            <CircularProgress size={32} />
                            <Typography sx={{ ml: 2, color: "#666" }}>Generating PDF...</Typography>
                        </Box>
                    ) : pdfUrl ? (
                        <Box sx={{ height: "calc(100vh - 150px)" }}>
                            <iframe
                                src={pdfUrl}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    border: "none",
                                }}
                                title="Quotation PDF"
                            />
                        </Box>
                    ) : (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 150px)" }}>
                            <Typography color="text.secondary">PDF not available</Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </ProtectedRoute>
    );
}
