"use client";

import { useCallback } from "react";
import { Paper, Typography, Box, Grid, Chip } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PhoneIcon from "@mui/icons-material/Phone";
import DescriptionIcon from "@mui/icons-material/Description";
import moment from "moment";
import { useRouter } from "next/navigation";
import PaginatedList from "@/components/common/PaginatedList";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import cancelledOrdersService from "@/services/cancelledOrdersService";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import { useState } from "react";
import QuotationDetailsDrawer from "@/components/common/QuotationDetailsDrawer";

export default function ListView({ filters }) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);
  const [selectedQuotationOrder, setSelectedQuotationOrder] = useState(null);

  const fetchData = useCallback(
    async (params) => {
      const merged = { ...params, ...filters };
      return await cancelledOrdersService.getCancelledOrders(merged);
    },
    [filters]
  );

  const handleOpenDetails = useCallback((row) => {
    setSelectedOrder(row);
    setDetailsOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedOrder(null);
  }, []);

  const handlePrintOrder = useCallback(async (resolvedOrder) => {
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
  }, []);

  const handleOpenQuotationDrawer = useCallback((row) => {
    if (!row?.id) return;
    setSelectedQuotationOrder(row);
    setQuotationDrawerOpen(true);
  }, []);

  const renderOrderDetail = (label, value, isBold = true, color = "text.primary") => (
    <Box mb={0.4}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}
      >
        {label}:
      </Typography>
      <Typography
        variant="body2"
        color={color}
        fontWeight={isBold ? "bold" : "normal"}
        sx={{ fontSize: "0.78rem", lineHeight: 1.2, wordBreak: "break-word" }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );

  const renderOrderItem = (row) => {
    const outstanding =
      Number(row.project_cost || 0) - Number(row.discount || 0) - Number(row.total_paid || 0);

    return (
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          border: "1px solid #e0e0e0",
          borderTop: "3px solid #dc2626",
          borderRadius: "4px 4px 1px 1px",
          overflow: "hidden",
          transition: "0.2s",
          "&:hover": {
            borderColor: "#1976d2",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box
          sx={{
            bgcolor: "#fff",
            p: 0.6,
            px: 2,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <OrderNumberLink
            value={row.order_number || "-"}
            suffix={` : ${row.customer_name?.toUpperCase() || "-"}`}
            variant="subtitle2"
            sx={{ mr: 2, fontSize: "0.88rem" }}
            onClick={() => router.push(`/cancelled-orders/view?id=${row.id}`)}
          />
          <Chip
            label="Cancelled"
            size="small"
            sx={{
              bgcolor: "#dc2626",
              color: "#fff",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          {row.cancelled_stage && (
            <Chip
              label={row.cancelled_stage === "before_confirmation" ? "Before Confirmation" : "After Confirmation"}
              size="small"
              sx={{
                bgcolor: "#fee2e2",
                color: "#b91c1c",
                height: 18,
                fontSize: "0.58rem",
                mr: 1,
                borderRadius: "3px",
              }}
            />
          )}
          <Chip
            label={row.cancelled_at_stage_key || "None"}
            size="small"
            sx={{
              bgcolor: row.cancelled_at_stage_key ? "#fef3c7" : "#e5e7eb",
              color: row.cancelled_at_stage_key ? "#92400e" : "#4b5563",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.2 }}>
            <IconButton size="small" title="Quotation Details" onClick={() => handleOpenQuotationDrawer(row)}>
              <DescriptionIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" title="Details" onClick={() => handleOpenDetails(row)}>
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Details Grid - same structure as Closed Orders + Cancellation details */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={1}>
            <Grid item size={3}>
              {renderOrderDetail(
                "Order Date",
                row.order_date ? moment(row.order_date).format("DD-MM-YYYY") : "-"
              )}
              {renderOrderDetail(
                "Cancelled At",
                row.cancelled_at ? moment(row.cancelled_at).format("DD-MM-YYYY HH:mm") : "-"
              )}
              {renderOrderDetail("Consumer No", row.consumer_no)}
              {renderOrderDetail("Capacity", row.capacity ? `${row.capacity} kW` : "-")}
              {renderOrderDetail("Application", row.application_no)}
              {renderOrderDetail(
                "Registration Date",
                row.date_of_registration_gov ? moment(row.date_of_registration_gov).format("DD-MM-YYYY") : "-"
              )}
              {renderOrderDetail("Tags", row.tags)}
            </Grid>
            <Grid item size={3}>
              {renderOrderDetail("Scheme", row.project_scheme_name)}
              {renderOrderDetail("Discom", row.discom_name)}
              {renderOrderDetail("Channel Partner", row.channel_partner_name)}
              {renderOrderDetail(
                "Handled By / Inquiry By",
                `${row.handled_by_name || "-"} / ${row.inquiry_by_name || "-"}`
              )}
              {renderOrderDetail(
                "Last Action",
                row.updated_at ? `${moment(row.updated_at).format("DD-MM-YYYY HH:mm:ss")} | Cancelled` : "-"
              )}
            </Grid>
            <Grid item size={3}>
              <Box mb={0.4}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}>
                  Mobile No:
                </Typography>
                <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: 12 }} /> {row.mobile_number || row.phone_no || row.customer?.mobile_number || "-"}
                </Typography>
              </Box>
              {renderOrderDetail("Address", row.address)}
              {renderOrderDetail("Reference", row.reference_from)}
              {renderOrderDetail("Branch", row.branch_name)}
              {renderOrderDetail("Source", row.inquiry_source_name || "Individual")}
            </Grid>
            <Grid item size={3}>
              {renderOrderDetail("Payment Type", row.payment_type || "PDC Payment")}
              {renderOrderDetail("Project Cost", `Rs. ${Number(row.project_cost || 0).toLocaleString()}`)}
              {renderOrderDetail("Payment Received", `Rs. ${Number(row.total_paid || 0).toLocaleString()}`)}
              {renderOrderDetail(
                "Outstanding",
                `Rs. ${Number(outstanding || 0).toLocaleString()}`,
                true,
                outstanding > 0 ? "error.main" : "success.main"
              )}
              {renderOrderDetail("Cancelled By", row.cancelled_by_name || "-")}
              {renderOrderDetail("Reason", row.cancellation_reason || "-", false)}
            </Grid>
          </Grid>
        </Box>
      </Paper>
    );
  };

  const calculateHeight = () => `calc(100vh - 145px)`;

  return (
    <>
      <PaginatedList
        fetcher={fetchData}
        filters={filters ?? {}}
        renderItem={renderOrderItem}
        showSearch={false}
        defaultSortBy="order_date"
        defaultSortOrder="DESC"
        height={calculateHeight()}
      />
      <OrderDetailsDrawer
        open={detailsOpen}
        onClose={handleCloseDetails}
        order={selectedOrder}
        onPrint={handlePrintOrder}
        showPrint
        showDeliverySnapshot
      />
      <QuotationDetailsDrawer
        open={quotationDrawerOpen}
        onClose={() => {
          setQuotationDrawerOpen(false);
          setSelectedQuotationOrder(null);
        }}
        orderId={selectedQuotationOrder?.id}
        quotationId={selectedQuotationOrder?.quotation_id}
      />
    </>
  );
}

