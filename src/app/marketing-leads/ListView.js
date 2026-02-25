"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Paper,
  Chip,
  Typography,
  Box,
  Grid,
  Tooltip,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import moment from "moment";
import PaginatedList from "@/components/common/PaginatedList";
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import { DEFAULT_FILTER_LAST_30_DAYS } from "@/components/common/LeadListFilterPanel";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import marketingLeadsService from "@/services/marketingLeadsService";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const LEAD_LIST_FILTER_KEYS = [
  "customer_name",
  "mobile_number",
  "branch_id",
  "inquiry_source_id",
  "status",
  "priority",
  "campaign_name",
  "created_from",
  "created_to",
  "next_follow_up_from",
  "next_follow_up_to",
];

const statusChipColor = (status) => {
  switch (status) {
    case "new":
      return { bgcolor: "#0ea5e9", color: "#fff" };
    case "contacted":
      return { bgcolor: "#6366f1", color: "#fff" };
    case "follow_up":
      return { bgcolor: "#f97316", color: "#fff" };
    case "interested":
      return { bgcolor: "#22c55e", color: "#fff" };
    case "converted":
      return { bgcolor: "#16a34a", color: "#fff" };
    case "not_interested":
    case "junk":
      return { bgcolor: "#9ca3af", color: "#fff" };
    default:
      return { bgcolor: "#e5e7eb", color: "#111827" };
  }
};

const priorityChipColor = (priority) => {
  switch (priority) {
    case "hot":
      return { bgcolor: "#b91c1c", color: "#fff" };
    case "high":
      return { bgcolor: "#f97316", color: "#fff" };
    case "medium":
      return { bgcolor: "#0ea5e9", color: "#fff" };
    case "low":
    default:
      return { bgcolor: "#6b7280", color: "#fff" };
  }
};

const renderLeadDetail = (label, value, opts = {}) => {
  const { bold = false, color = "text.primary" } = opts;
  return (
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
        fontWeight={bold ? "bold" : "normal"}
        sx={{ fontSize: "0.78rem", lineHeight: 1.2, wordBreak: "break-word" }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );
};

export default function ListView() {
  const router = useRouter();
  const listingState = useListingQueryState({
    defaultLimit: 25,
    filterKeys: LEAD_LIST_FILTER_KEYS,
  });
  const { page, limit, q, filters, setPage, setLimit, setQ, setFilters, clearFilters } =
    listingState;
  const defaultDatesAppliedRef = useRef(false);

  useEffect(() => {
    if (defaultDatesAppliedRef.current) return;
    if (!filters.created_from && !filters.created_to) {
      defaultDatesAppliedRef.current = true;
      setFilters({
        ...filters,
        created_from: DEFAULT_FILTER_LAST_30_DAYS.created_from,
        created_to: DEFAULT_FILTER_LAST_30_DAYS.created_to,
      });
    }
  }, [filters, setFilters]);

  const fetchData = useCallback(async (params) => {
    return await marketingLeadsService.getMarketingLeads(params);
  }, []);

  const renderLeadItem = (row) => {
    const statusStyle = statusChipColor(row.status);
    const priorityStyle = priorityChipColor(row.priority);
    const nextFollowUp =
      row.next_follow_up_at &&
      moment(row.next_follow_up_at).format("DD-MM-YYYY HH:mm");
    const lastCalled =
      row.last_called_at && moment(row.last_called_at).format("DD-MM-YYYY HH:mm");

    return (
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          border: "1px solid #e0e0e0",
          borderTop: "3px solid #0ea5e9",
          borderRadius: "4px 4px 1px 1px",
          overflow: "hidden",
          transition: "0.2s",
          "&:hover": {
            borderColor: "#1976d2",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          },
          cursor: "pointer",
        }}
        onClick={() => router.push(`/marketing-leads/view?id=${row.id}`)}
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
          <Typography
            variant="subtitle2"
            sx={{ mr: 2, fontSize: "0.88rem", fontWeight: "bold" }}
          >
            {row.lead_number || "-"} : {row.customer_name?.toUpperCase() || "-"}
          </Typography>
          <Chip
            label={row.status || "NEW"}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
              ...statusStyle,
            }}
          />
          <Chip
            label={(row.priority || "medium").toUpperCase()}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
              ...priorityStyle,
            }}
          />
          {row.campaign_name && (
            <Chip
              label={row.campaign_name}
              size="small"
              sx={{
                bgcolor: "#e11d48",
                color: "#fff",
                height: 18,
                fontSize: "0.58rem",
                mr: 1,
                borderRadius: "3px",
              }}
            />
          )}
          {row.branch_name && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: "bold",
                ml: 1,
                fontSize: "0.7rem",
              }}
            >
              {row.branch_name}
            </Typography>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={1}>
            <Grid item xs={12} md={3}>
              <Box mb={0.4}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}
                >
                  Mobile:
                </Typography>
                <Typography
                  variant="body2"
                  color="primary"
                  fontWeight="bold"
                  sx={{
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <PhoneIcon sx={{ fontSize: 12 }} /> {row.mobile_number}
                </Typography>
              </Box>
              {renderLeadDetail("Alternate", row.alternate_mobile_number)}
              {renderLeadDetail("Email", row.email_id)}
              {renderLeadDetail("Company", row.company_name)}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderLeadDetail("Source", row.inquiry_source_name || "N/A")}
              {renderLeadDetail("Campaign", row.campaign_name || "N/A")}
              {renderLeadDetail("Segment", row.lead_segment || "N/A")}
              {renderLeadDetail("Interest", row.product_interest || "N/A")}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderLeadDetail(
                "Expected Capacity",
                row.expected_capacity_kw ? `${row.expected_capacity_kw} kW` : "-"
              )}
              {renderLeadDetail(
                "Expected Value",
                row.expected_project_cost != null
                  ? `Rs. ${Number(row.expected_project_cost).toLocaleString()}`
                  : "-"
              )}
              {renderLeadDetail(
                "Assigned To",
                row.assigned_to_name || "Unassigned"
              )}
              {renderLeadDetail(
                "Last Called",
                lastCalled || "-",
                { bold: false, color: "text.secondary" }
              )}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderLeadDetail(
                "Next Follow-Up",
                nextFollowUp || "Not scheduled",
                {
                  bold: true,
                  color: nextFollowUp ? "primary.main" : "text.secondary",
                }
              )}
              {renderLeadDetail(
                "Last Outcome",
                row.last_call_outcome || "-",
                { bold: false }
              )}
              {renderLeadDetail(
                "City",
                row.city_name || "-",
                { bold: false }
              )}
              {renderLeadDetail(
                "Remarks",
                row.remarks,
                { bold: false, color: "text.secondary" }
              )}
            </Grid>
          </Grid>
        </Box>
      </Paper>
    );
  };

  const calculateHeight = () => `calc(100vh - 125px)`;

  return (
    <Box sx={{ width: "100%" }}>
      <LeadListFilterPanel
        values={filters}
        onApply={(v) => setFilters(v)}
        onClear={clearFilters}
        defaultOpen={false}
      />
      <PaginatedList
        fetcher={fetchData}
        renderItem={renderLeadItem}
        searchPlaceholder="Search marketing leads..."
        defaultSortBy="id"
        defaultSortOrder="DESC"
        height={calculateHeight()}
        q={q}
        onQChange={setQ}
        filters={filters}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        filterSlot={null}
      />
    </Box>
  );
}
