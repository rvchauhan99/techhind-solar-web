"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Button,
  Collapse,
  Typography,
  IconButton,
  Paper,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FilterListIcon from "@mui/icons-material/FilterList";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import DateField from "@/components/common/DateField";

const PAYMENT_STATUSES = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const INITIAL_FILTERS = {
  start_date: "",
  end_date: "",
  branch_id: "",
  handled_by: "",
  payment_mode_id: "",
  status: null,
  order_number: "",
  receipt_number: "",
  customer_name: "",
  search: "",
};

export default function PaymentAuditFilters({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  onReset,
  onCancel,
  variant = "default",
}) {
  const isDrawer = variant === "drawer";
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters || {});

  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  const handleFilterChange = (name, value) => {
    const newFilters = { ...localFilters, [name]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleApply = () => {
    onApply?.(localFilters);
  };

  const handleClear = () => {
    const cleared = {};
    setLocalFilters(cleared);
    onFiltersChange?.(cleared);
    onClear?.();
  };

  const handleReset = () => {
    setLocalFilters(INITIAL_FILTERS);
    onFiltersChange?.(INITIAL_FILTERS);
    onReset?.();
  };

  const hasActiveFilters = Object.values(localFilters).some(
    (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
  );

  if (isDrawer) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Typography variant="h6">Filters</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          Apply filters to narrow down payments.
        </Typography>
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          <DateField
            name="start_date"
            label="Payment Date From"
            value={localFilters.start_date || ""}
            onChange={(e) => handleFilterChange("start_date", e.target.value || null)}
          />
          <DateField
            name="end_date"
            label="Payment Date To"
            value={localFilters.end_date || ""}
            onChange={(e) => handleFilterChange("end_date", e.target.value || null)}
            minDate={localFilters.start_date || undefined}
          />
          <AutocompleteField
            name="branch_id"
            label="Branch"
            asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
            referenceModel="company_branch.model"
            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
            value={localFilters.branch_id ? { id: localFilters.branch_id } : null}
            onChange={(e, newValue) => handleFilterChange("branch_id", newValue?.id ?? null)}
            placeholder="Type to search..."
          />
          <AutocompleteField
            name="handled_by"
            label="Handled By"
            asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
            referenceModel="user.model"
            getOptionLabel={(o) => o?.name ?? o?.email ?? o?.username ?? ""}
            value={localFilters.handled_by ? { id: localFilters.handled_by } : null}
            onChange={(e, newValue) => handleFilterChange("handled_by", newValue?.id ?? null)}
            placeholder="Type to search..."
          />
          <AutocompleteField
            name="payment_mode_id"
            label="Payment Mode"
            asyncLoadOptions={(q) => getReferenceOptionsSearch("payment_mode.model", { q, limit: 20 })}
            referenceModel="payment_mode.model"
            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
            value={localFilters.payment_mode_id ? { id: localFilters.payment_mode_id } : null}
            onChange={(e, newValue) => handleFilterChange("payment_mode_id", newValue?.id ?? null)}
            placeholder="Type to search..."
          />
          <AutocompleteField
            name="status"
            label="Status"
            multiple
            options={PAYMENT_STATUSES}
            getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
            value={(Array.isArray(localFilters.status) ? localFilters.status : []).map((v) => PAYMENT_STATUSES.find((s) => s.value === v)).filter(Boolean)}
            onChange={(e, newValue) => handleFilterChange("status", newValue?.length ? newValue.map((o) => o.value) : null)}
            placeholder="All Statuses"
          />
          <Input
            name="order_number"
            label="Order Number"
            value={localFilters.order_number || ""}
            onChange={(e) => handleFilterChange("order_number", e.target.value || null)}
            placeholder="Search by order number"
          />
          <Input
            name="customer_name"
            label="Customer Name"
            value={localFilters.customer_name || ""}
            onChange={(e) => handleFilterChange("customer_name", e.target.value || null)}
            placeholder="Search by customer name"
          />
          <Input
            name="receipt_number"
            label="Receipt Number"
            value={localFilters.receipt_number || ""}
            onChange={(e) => handleFilterChange("receipt_number", e.target.value || null)}
            placeholder="Search by receipt number"
          />
          <Input
            name="search"
            label="Search"
            value={localFilters.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value || null)}
            placeholder="Cheque no., remarks..."
          />
        </Stack>
        <Box sx={{ display: "flex", gap: 1, mt: 2, pt: 1 }}>
          <Button size="small" variant="contained" onClick={handleApply}>
            Apply
          </Button>
          <Button size="small" variant="outlined" onClick={handleReset}>
            Reset
          </Button>
          <Button size="small" variant="text" onClick={onCancel}>
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Paper sx={{ mb: 2, p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: expanded ? 2 : 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterListIcon />
          <Typography variant="h6">Filters</Typography>
          {hasActiveFilters && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: "primary.main",
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              Active
            </Typography>
          )}
        </Box>
        <IconButton onClick={() => setExpanded(!expanded)} size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <DateField
              name="start_date"
              label="Payment Date From"
              value={localFilters.start_date || ""}
              onChange={(e) => handleFilterChange("start_date", e.target.value || null)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <DateField
              name="end_date"
              label="Payment Date To"
              value={localFilters.end_date || ""}
              onChange={(e) => handleFilterChange("end_date", e.target.value || null)}
              minDate={localFilters.start_date || undefined}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <AutocompleteField
              name="branch_id"
              label="Branch"
              asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
              referenceModel="company_branch.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={localFilters.branch_id ? { id: localFilters.branch_id } : null}
              onChange={(e, newValue) => handleFilterChange("branch_id", newValue?.id ?? null)}
              placeholder="Type to search..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <AutocompleteField
              name="handled_by"
              label="Handled By"
              asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
              referenceModel="user.model"
              getOptionLabel={(o) => o?.name ?? o?.email ?? o?.username ?? ""}
              value={localFilters.handled_by ? { id: localFilters.handled_by } : null}
              onChange={(e, newValue) => handleFilterChange("handled_by", newValue?.id ?? null)}
              placeholder="Type to search..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <AutocompleteField
              name="payment_mode_id"
              label="Payment Mode"
              asyncLoadOptions={(q) => getReferenceOptionsSearch("payment_mode.model", { q, limit: 20 })}
              referenceModel="payment_mode.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={localFilters.payment_mode_id ? { id: localFilters.payment_mode_id } : null}
              onChange={(e, newValue) => handleFilterChange("payment_mode_id", newValue?.id ?? null)}
              placeholder="Type to search..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <AutocompleteField
              name="status"
              label="Status"
              multiple
              options={PAYMENT_STATUSES}
              getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
              value={(Array.isArray(localFilters.status) ? localFilters.status : []).map((v) => PAYMENT_STATUSES.find((s) => s.value === v)).filter(Boolean)}
              onChange={(e, newValue) => handleFilterChange("status", newValue?.length ? newValue.map((o) => o.value) : null)}
              placeholder="All Statuses"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Input
              name="order_number"
              label="Order Number"
              value={localFilters.order_number || ""}
              onChange={(e) => handleFilterChange("order_number", e.target.value || null)}
              placeholder="Search by order number"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Input
              name="customer_name"
              label="Customer Name"
              value={localFilters.customer_name || ""}
              onChange={(e) => handleFilterChange("customer_name", e.target.value || null)}
              placeholder="Search by customer name"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Input
              name="receipt_number"
              label="Receipt Number"
              value={localFilters.receipt_number || ""}
              onChange={(e) => handleFilterChange("receipt_number", e.target.value || null)}
              placeholder="Search by receipt number"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Input
              name="search"
              label="Search"
              value={localFilters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value || null)}
              placeholder="Cheque no., remarks..."
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={handleClear} disabled={!hasActiveFilters}>
                Clear Filters
              </Button>
              <Button variant="contained" onClick={handleApply}>
                Apply Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Collapse>
    </Paper>
  );
}
