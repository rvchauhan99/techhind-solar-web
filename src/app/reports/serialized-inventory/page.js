"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Box, Typography } from "@mui/material";
import ReportFilters from "./components/ReportFilters";
import SerializedInventoryReport from "./components/SerializedInventoryReport";
import { PAGE_PADDING, LIST_HEADER_MB } from "@/utils/formConstants";

export default function SerializedInventoryReportPage() {
  const [filters, setFilters] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setRefreshKey((prev) => prev + 1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <Box sx={{ p: PAGE_PADDING }}>
        <Typography variant="h5" sx={{ mb: LIST_HEADER_MB }}>
          Serialized Inventory Report
        </Typography>

        <ReportFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

        <SerializedInventoryReport
          key={refreshKey}
          filters={filters}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />
      </Box>
    </ProtectedRoute>
  );
}
