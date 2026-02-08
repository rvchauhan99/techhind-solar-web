"use client";

import { useCallback } from "react";
import { Paper, Typography, Box, Grid, Chip, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EventIcon from "@mui/icons-material/Event";
import HelpIcon from "@mui/icons-material/Help";
import { useRouter } from "next/navigation";
import moment from "moment";
import PaginatedList from "@/components/common/PaginatedList";
import closedOrdersService from "@/services/closedOrdersService";

const STAGES = [
  { key: "estimate_generated", label: "Estimate Generated" },
  { key: "estimate_paid", label: "Estimate Paid" },
  { key: "planner", label: "Planner" },
  { key: "delivery", label: "Delivery" },
  { key: "fabrication", label: "Fabrication" },
  { key: "installation", label: "Installation" },
  { key: "netmeter_apply", label: "Netmeter Apply" },
  { key: "netmeter_installed", label: "Netmeter Installed" },
  { key: "subsidy_claim", label: "Subsidy Claim" },
  { key: "subsidy_disbursed", label: "Subsidy Disbursed" },
];

export default function ListView() {
  const router = useRouter();

  const fetchData = useCallback(async (params) => {
    return await closedOrdersService.getClosedOrders(params);
  }, []);

  const getStageIcon = (status) => {
    if (status === "completed")
      return <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />;
    if (status === "pending")
      return <EventIcon color="primary" sx={{ fontSize: 18 }} />;
    if (status === "locked")
      return <CancelIcon color="error" sx={{ fontSize: 18 }} />;
    return <HelpIcon color="disabled" sx={{ fontSize: 18 }} />;
  };

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
    const stages = row.stages || {};
    const outstanding =
      Number(row.project_cost || 0) - Number(row.discount || 0) - Number(row.total_paid || 0);

    return (
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          border: "1px solid #e0e0e0",
          borderTop: "3px solid #16a34a", // green bar for closed/completed
          borderRadius: "4px 4px 1px 1px",
          overflow: "hidden",
          transition: "0.2s",
          "&:hover": {
            borderColor: "#1976d2",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          },
        }}
      >
        {/* Header Row */}
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
          <Typography
            variant="subtitle2"
            component="span"
            sx={{
              color: "#1976d2",
              fontWeight: "bold",
              mr: 2,
              fontSize: "0.88rem",
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" },
            }}
            onClick={() => router.push(`/closed-orders/view?id=${row.id}`)}
          >
            {row.order_number} : {row.customer_name?.toUpperCase()}
          </Typography>
          <Chip
            label="Closed"
            size="small"
            sx={{
              bgcolor: "#16a34a",
              color: "#fff",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          <Chip
            label={row.solar_panel_name || "PANEL N/A"}
            size="small"
            sx={{
              bgcolor: "#1976d2",
              color: "#fff",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          <Chip
            label={row.inverter_name || "INVERTER N/A"}
            size="small"
            sx={{
              bgcolor: "#9c27b0",
              color: "#fff",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: "bold", ml: 1, fontSize: "0.7rem" }}
          >
            {row.project_scheme_name}
          </Typography>
        </Box>

        {/* Details Grid */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={1}>
            <Grid item size={3}>
              {renderOrderDetail(
                "Order Date",
                row.order_date ? moment(row.order_date).format("DD-MM-YYYY") : "-"
              )}
              {renderOrderDetail("Consumer No", row.consumer_no)}
              {renderOrderDetail("Capacity", row.capacity ? `${row.capacity} kW` : "-")}
              {renderOrderDetail("Application", row.application_no)}
              {renderOrderDetail(
                "Registration Date",
                row.date_of_registration_gov
                  ? moment(row.date_of_registration_gov).format("DD-MM-YYYY")
                  : "-"
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
                row.updated_at ? `${moment(row.updated_at).format("DD-MM-YYYY HH:mm:ss")} | Closed` : "-"
              )}
            </Grid>
            <Grid item size={3}>
              {renderOrderDetail("Mobile No", row.mobile_number)}
              {renderOrderDetail("Address", row.address)}
              {renderOrderDetail("Reference", row.reference_from)}
              {renderOrderDetail("Branch", row.branch_name)}
              {renderOrderDetail("Source", row.inquiry_source_name || "Individual")}
            </Grid>
            <Grid item size={3}>
              {renderOrderDetail("Payment Type", row.payment_type || "PDC Payment")}
              {renderOrderDetail(
                "Project Cost",
                `Rs. ${Number(row.project_cost || 0).toLocaleString()}`
              )}
              {renderOrderDetail(
                "Payment Received",
                `Rs. ${Number(row.total_paid || 0).toLocaleString()}`
              )}
              {renderOrderDetail(
                "Outstanding",
                `Rs. ${Number(outstanding || 0).toLocaleString()}`,
                true,
                outstanding > 0 ? "error.main" : "success.main"
              )}
            </Grid>
          </Grid>
        </Box>

        {/* Pipeline Footer */}
        <Box sx={{ bgcolor: "#f9f9f9", borderTop: "1px solid #f0f0f0", py: 0.6 }}>
          <Grid container sx={{ textAlign: "center" }}>
            {STAGES.map((stage, idx) => {
              const status = stages[stage.key] || (idx === 0 ? "pending" : "locked");
              const isActive = row.current_stage_key === stage.key;
              return (
                <Grid item key={stage.key} sx={{ flex: 1, px: 0.1 }}>
                  <Tooltip title={stage.label}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontSize: "0.58rem",
                        color: "text.secondary",
                        mb: 0.1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {stage.label}
                    </Typography>
                  </Tooltip>
                  <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 18 }}>
                    {isActive ? (
                      <Chip
                        label="Current"
                        size="small"
                        color="primary"
                        sx={{ height: 14, fontSize: "0.5rem", px: 0, borderRadius: "2px" }}
                      />
                    ) : (
                      getStageIcon(status)
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Paper>
    );
  };

  const calculateHeight = () => `calc(100vh - 125px)`;

  return (
    <Box sx={{ width: "100%" }}>
      <PaginatedList
        fetcher={fetchData}
        renderItem={renderOrderItem}
        searchPlaceholder="Search closed orders..."
        defaultSortBy="order_date"
        defaultSortOrder="DESC"
        height={calculateHeight()}
      />
    </Box>
  );
}

