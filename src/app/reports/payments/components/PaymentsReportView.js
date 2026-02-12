"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Button,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import {
  IconCurrencyRupee,
  IconCircleCheck,
  IconClock,
  IconX,
} from "@tabler/icons-react";
import PaginatedTable from "@/components/common/PaginatedTable";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import paymentsReportService from "@/services/paymentsReportService";
import orderService from "@/services/orderService";
import orderPaymentsService from "@/services/orderPaymentsService";
import { toastError } from "@/utils/toast";
import { FORM_PADDING, COMPACT_FORM_SPACING } from "@/utils/formConstants";

const toCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildReportParams(filters, page, limit) {
  const status =
    filters?.status && Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters?.status;
  return {
    page,
    limit,
    ...filters,
    status: status ?? undefined,
  };
}

export default function PaymentsReportView({ filters }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const setErrorRef = useRef(() => {});
  setErrorRef.current = setError;

  const handleOpenDetails = (row) => {
    if (!row?.order_id) return;
    setSelectedOrder({ id: row.order_id });
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedOrder(null);
  };

  const handlePrintOrder = async (resolvedOrder) => {
    try {
      const file = await orderService.downloadOrderPDF(resolvedOrder?.id);
      const blob = file?.blob || file;
      const filename = file?.filename || `order-${resolvedOrder?.order_number || resolvedOrder?.id}.pdf`;
      if (!blob) throw new Error("PDF download failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to download order PDF";
      toastError(msg);
    }
  };

  const handlePrintReceipt = async (e, paymentId) => {
    e?.stopPropagation?.();
    try {
      const { blob, filename } = await orderPaymentsService.downloadReceiptPDF(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download payment receipt:", err);
      toastError(err?.response?.data?.message || err?.message || "Failed to download payment receipt");
    }
  };

  const filterParams = useCallback(() => {
    const status =
      filters?.status && Array.isArray(filters.status)
        ? filters.status.join(",")
        : filters?.status;
    return { ...filters, status: status ?? undefined };
  }, [filters]);

  const fetcher = useCallback(
    async (params) => {
      setError(null);
      try {
        const apiParams = buildReportParams(
          filters,
          params.page ?? 1,
          params.limit ?? 50
        );
        const response = await paymentsReportService.getPaymentsReport(apiParams);
        const result = response.result || response;
        setSummary(result.summary || null);
        return {
          data: result.data || [],
          meta: { total: result.meta?.total ?? 0 },
        };
      } catch (err) {
        console.error("Failed to load payments report", err);
        setErrorRef.current(
          err?.response?.data?.message || "Failed to load payments report"
        );
        return { data: [], meta: { total: 0 } };
      }
    },
    [filters]
  );

  const columns = [
    {
      field: "date_of_payment",
      label: "Payment Date",
      sortable: true,
      render: (row) =>
        row.date_of_payment
          ? new Date(row.date_of_payment).toLocaleDateString("en-IN")
          : "-",
    },
    {
      field: "order_number",
      label: "Order #",
      render: (row) =>
        row.order_id ? (
          <Link href={`/order/view?id=${row.order_id}`} style={{ color: "inherit" }}>
            {row.order_number || row.order_id}
          </Link>
        ) : (
          row.order_number || "-"
        ),
    },
    {
      field: "customer_name",
      label: "Customer",
      render: (row) => row.customer_name || "-",
    },
    {
      field: "branch_name",
      label: "Branch",
      render: (row) => row.branch_name || "-",
    },
    {
      field: "handled_by_name",
      label: "Handled By",
      render: (row) => row.handled_by_name || "-",
    },
    {
      field: "payment_amount",
      label: "Amount",
      render: (row) => `₹ ${toCurrency(row.payment_amount)}`,
    },
    {
      field: "status",
      label: "Status",
      render: (row) => (
        <Chip
          label={
            row.status === "approved"
              ? "Approved"
              : row.status === "rejected"
                ? "Rejected"
                : "Pending"
          }
          size="small"
          color={
            row.status === "approved"
              ? "success"
              : row.status === "rejected"
                ? "error"
                : "warning"
          }
        />
      ),
    },
    {
      field: "payment_mode_name",
      label: "Mode",
      render: (row) => row.payment_mode_name || "-",
    },
    {
      field: "print",
      label: "Print",
      isActionColumn: true,
      render: (row) =>
        row.status === "approved" && row.id ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintIcon fontSize="small" />}
            onClick={(e) => handlePrintReceipt(e, row.id)}
          >
            Print
          </Button>
        ) : (
          "-"
        ),
    },
  ];

  const handleExport = async (format = "csv") => {
    try {
      const params = buildReportParams(filters, 1, 999999);
      const blob = await paymentsReportService.exportPaymentsReport(params, format);
      const filename = `payments-report-${new Date()
        .toISOString()
        .slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export payments report", err);
      toastError(err?.response?.data?.message || "Failed to export payments report");
    }
  };

  const kpiCards = summary
    ? [
        {
          title: "Total Collected",
          value: toCurrency(summary.total_amount),
          icon: IconCurrencyRupee,
          iconBg: "primary.main",
          iconColor: "primary.contrastText",
          valueColor: "text.primary",
        },
        {
          title: "Approved",
          value: toCurrency(summary.by_status?.approved),
          icon: IconCircleCheck,
          iconBg: "success.main",
          iconColor: "success.contrastText",
          valueColor: "success.main",
        },
        {
          title: "Pending Approval",
          value: toCurrency(summary.by_status?.pending_approval),
          icon: IconClock,
          iconBg: "warning.main",
          iconColor: "warning.contrastText",
          valueColor: "warning.main",
        },
        {
          title: "Rejected",
          value: toCurrency(summary.by_status?.rejected),
          icon: IconX,
          iconBg: "error.main",
          iconColor: "error.contrastText",
          valueColor: "error.main",
        },
      ]
    : [];

  return (
    <Box>
      {kpiCards.length > 0 && (
        <Grid container spacing={COMPACT_FORM_SPACING} sx={{ mb: 1 }}>
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Grid item xs={12} sm={6} md={3} key={kpi.title}>
                <Card
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    transition: "box-shadow 0.2s ease, transform 0.2s ease",
                    "&:hover": {
                      boxShadow: 4,
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: FORM_PADDING }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 0.75, mb: 0.5 }}>
                      <Typography color="text.secondary" variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                        {kpi.title}
                      </Typography>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          flexShrink: 0,
                          borderRadius: 1.5,
                          bgcolor: kpi.iconBg,
                          color: kpi.iconColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          "& svg": { width: 16, height: 16 },
                        }}
                      >
                        <Icon />
                      </Box>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }} color={kpi.valueColor}>
                      ₹ {kpi.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1,
          mb: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Export
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={() => handleExport("csv")}
        >
          CSV
        </Button>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={() => handleExport("excel")}
        >
          Excel
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 1 }}>
        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams()}
          initialPage={1}
          initialLimit={25}
          showSearch={false}
          height="calc(100vh - 320px)"
          getRowKey={(row) => row.id ?? row.order_id ?? Math.random()}
          onRowClick={(row) => handleOpenDetails(row)}
        />
      </Box>

      <OrderDetailsDrawer
        open={detailsOpen}
        onClose={handleCloseDetails}
        order={selectedOrder}
        onPrint={handlePrintOrder}
        showPrint
      />

      {(summary?.by_mode || summary?.by_branch || summary?.by_user) && (
        <Paper sx={{ mt: 1, p: FORM_PADDING, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Grid container spacing={1.5}>
            {summary?.by_mode && Object.keys(summary.by_mode).length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Collections by Payment Mode
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {Object.entries(summary.by_mode).map(([mode, amount], idx) => (
                    <Chip
                      key={mode}
                      label={`${mode}: ₹ ${toCurrency(amount)}`}
                      variant={idx === 0 ? "filled" : "outlined"}
                      color={idx === 0 ? "primary" : "default"}
                      size="small"
                      sx={idx > 0 ? { borderColor: "divider" } : undefined}
                    />
                  ))}
                </Box>
              </Grid>
            )}
            {summary?.by_branch && Object.keys(summary.by_branch).length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Collections by Branch
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {Object.entries(summary.by_branch).map(([branch, amount], idx) => (
                    <Chip
                      key={branch}
                      label={`${branch}: ₹ ${toCurrency(amount)}`}
                      variant={idx === 0 ? "filled" : "outlined"}
                      color={idx === 0 ? "primary" : "default"}
                      size="small"
                      sx={idx > 0 ? { borderColor: "divider" } : undefined}
                    />
                  ))}
                </Box>
              </Grid>
            )}
            {summary?.by_user && Object.keys(summary.by_user).length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Collections by User
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {Object.entries(summary.by_user).map(([user, amount], idx) => (
                    <Chip
                      key={user}
                      label={`${user}: ₹ ${toCurrency(amount)}`}
                      variant={idx === 0 ? "filled" : "outlined"}
                      color={idx === 0 ? "primary" : "default"}
                      size="small"
                      sx={idx > 0 ? { borderColor: "divider" } : undefined}
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {summary?.by_period && summary.by_period.length > 0 && (
        <Paper sx={{ mt: 1, p: FORM_PADDING, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Collection Trend (by Month)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Amount (₹)
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-end",
              minHeight: 140,
              p: FORM_PADDING,
              overflowX: "auto",
            }}
          >
            {summary.by_period.map((item, idx) => {
              const maxAmount = Math.max(
                ...summary.by_period.map((p) => Number(p.amount || 0)),
                1
              );
              const heightPct = (Number(item.amount || 0) / maxAmount) * 100;
              const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
              const barColor = chartColors[idx % chartColors.length];
              return (
                <Box
                  key={item.period}
                  sx={{
                    minWidth: 32,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      minHeight: 4,
                      height: `${Math.max(heightPct, 2)}%`,
                      bgcolor: barColor,
                      borderRadius: "6px 6px 0 0",
                      transition: "opacity 0.2s ease",
                      "&:hover": { opacity: 0.85 },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {item.period}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

