"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import { Box, Typography } from "@mui/material";
import { PAGE_PADDING } from "@/utils/formConstants";
import MarketingLeadForm from "../components/MarketingLeadForm";
import marketingLeadsService from "@/services/marketingLeadsService";
import { toastError, toastSuccess } from "@/utils/toast";

export default function AddMarketingLeadPage() {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await marketingLeadsService.createMarketingLead(values);
      toastSuccess("Lead created successfully");
      window.location.href = "/marketing-leads";
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to create lead";
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-transparent">
        <Container className="pt-2">
          <Box sx={{ p: PAGE_PADDING }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Add Marketing Lead
            </Typography>
            <MarketingLeadForm onSubmit={handleSubmit} loading={saving} />
          </Box>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

