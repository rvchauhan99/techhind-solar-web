"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Box, Typography, Drawer, Chip, Stack, Paper } from "@mui/material";
import { IconChartBar, IconFilter } from "@tabler/icons-react";
import { Button as UiButton } from "@/components/ui/button";
import Container from "@/components/container";
import { PAGE_PADDING, LIST_HEADER_MB } from "@/utils/formConstants";
import PaymentsReportFilters from "./components/PaymentsReportFilters";
import PaymentsReportView from "./components/PaymentsReportView";

const INITIAL_FILTERS = {
  start_date: "",
  end_date: "",
  branch_id: "",
  handled_by: "",
  payment_mode_id: "",
  status: null,
  order_number: "",
  customer_name: "",
  receipt_number: "",
};

const FILTER_LABELS = {
  start_date: "Date From",
  end_date: "Date To",
  branch_id: "Branch",
    handled_by: "Handled By",
    payment_mode_id: "Payment Mode",
    status: "Status",
    order_number: "Order #",
    customer_name: "Customer",
    receipt_number: "Receipt #",
  };

  const STATUS_LABELS = {
    pending_approval: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
  };

  function countActiveFilters(filters) {
    if (!filters || typeof filters !== "object") return 0;
    return Object.entries(filters).filter(([k, v]) => {
      if (v == null) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
  }).length;
}

function formatFilterValue(key, value) {
  if (value == null) return "";
  if (key === "status" && Array.isArray(value)) {
    return value.map((s) => STATUS_LABELS[s] || s).join(", ");
  }
  if ((key === "start_date" || key === "end_date") && typeof value === "string") {
    const d = value.split("T")[0];
    if (d && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    }
    return value;
  }
  return String(value).trim();
}

function getAppliedFilterChips(filters) {
  if (!filters || typeof filters !== "object") return [];
  return Object.entries(filters)
    .filter(([k, v]) => {
      if (v == null) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value: formatFilterValue(key, value),
    }));
}

export default function PaymentsReportPage() {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeCount = countActiveFilters(appliedFilters);

  useEffect(() => {
    if (filterDrawerOpen) setFilters(appliedFilters);
  }, [filterDrawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = (newFilters) => {
    setAppliedFilters(newFilters);
    setFilterDrawerOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setFilterDrawerOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-transparent">
        <Container className="pt-2">
          <Box sx={{ p: PAGE_PADDING }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                mb: LIST_HEADER_MB,
              }}
            >
              <IconChartBar size={24} stroke={1.5} className="text-primary" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Payments Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 0.5 }}>
                — View collections, status breakdown and trends
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
                <UiButton
                  size="sm"
                  variant="outline"
                  startIcon={<IconFilter className="size-4" />}
                  onClick={() => setFilterDrawerOpen(true)}
                >
                  Filter {activeCount > 0 ? `(${activeCount})` : ""}
                </UiButton>
                {activeCount > 0 && (
                  <UiButton size="sm" variant="ghost" onClick={handleClearFilters}>
                    Clear
                  </UiButton>
                )}
              </Box>
            </Box>

            {activeCount > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  mb: 1.5,
                  borderRadius: 1.5,
                  borderColor: "divider",
                  bgcolor: "action.hover",
                }}
              >
                <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mr: 0.5 }}>
                    Applied filters:
                  </Typography>
                  {getAppliedFilterChips(appliedFilters).map(({ key, label, value }) => (
                    <Chip
                      key={key}
                      size="small"
                      label={`${label}: ${value}`}
                      sx={{
                        fontWeight: 500,
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  ))}
                  <Chip
                    size="small"
                    label="Clear all"
                    onClick={handleClearFilters}
                    onDelete={handleClearFilters}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 500 }}
                  />
                </Stack>
              </Paper>
            )}

            <Drawer
              anchor="left"
              open={filterDrawerOpen}
              onClose={() => setFilterDrawerOpen(false)}
            >
              <Box
                sx={{
                  width: { xs: 320, sm: 420 },
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                }}
              >
                <PaymentsReportFilters
                  variant="drawer"
                  filters={filters}
                  onFiltersChange={setFilters}
                  onApply={handleApplyFilters}
                  onReset={handleResetFilters}
                  onCancel={() => setFilterDrawerOpen(false)}
                />
              </Box>
            </Drawer>

            <PaymentsReportView key={refreshKey} filters={appliedFilters} />
          </Box>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

