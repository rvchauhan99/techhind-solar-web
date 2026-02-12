"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Stack,
  Button,
  Collapse,
  Typography,
  IconButton,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select as MuiSelect,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FilterListIcon from "@mui/icons-material/FilterList";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";
import userMasterService from "@/services/userMasterService";
import { FORM_PADDING, COMPACT_FORM_SPACING } from "@/utils/formConstants";

const PAYMENT_STATUSES = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const initialFiltersState = {
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

export default function PaymentsReportFilters({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  onReset,
  onCancel,
  variant = "default",
}) {
  const isDrawer = variant === "drawer";
  const [expanded, setExpanded] = useState(true);
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);

  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [branchesRes, usersRes, modesRes] = await Promise.all([
          companyService.listBranches(),
          userMasterService.listUserMasters({ limit: 1000 }),
          mastersService.getReferenceOptions("payment_mode.model"),
        ]);
        const branchesData = branchesRes?.result || branchesRes?.data || branchesRes || [];
        const usersData = usersRes?.result?.data || usersRes?.data || usersRes?.rows || [];
        const modesData = modesRes?.result || modesRes?.data || modesRes || [];
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setPaymentModes(Array.isArray(modesData) ? modesData : []);
      } catch (err) {
        console.error("Failed to load payments filter options", err);
      }
    };
    loadOptions();
  }, []);

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
    setLocalFilters(initialFiltersState);
    onFiltersChange?.(initialFiltersState);
    onReset?.();
  };

  const hasActiveFilters = Object.values(localFilters).some(
    (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
  );

  const formGrid = (
    <Grid container spacing={isDrawer ? 1.5 : COMPACT_FORM_SPACING}>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <DateField
              name="start_date"
              label="Payment Date From"
              value={localFilters.start_date || ""}
              onChange={(e) => handleFilterChange("start_date", e.target.value || null)}
            />
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <DateField
              name="end_date"
              label="Payment Date To"
              value={localFilters.end_date || ""}
              onChange={(e) => handleFilterChange("end_date", e.target.value || null)}
              minDate={localFilters.start_date || undefined}
            />
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <Select
              name="branch_id"
              label="Branch"
              value={localFilters.branch_id || ""}
              onChange={(e) => handleFilterChange("branch_id", e.target.value || null)}
            >
              <MenuItem value="">All Branches</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <Select
              name="handled_by"
              label="Handled By"
              value={localFilters.handled_by || ""}
              onChange={(e) => handleFilterChange("handled_by", e.target.value || null)}
            >
              <MenuItem value="">All Users</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <Select
              name="payment_mode_id"
              label="Payment Mode"
              value={localFilters.payment_mode_id || ""}
              onChange={(e) => handleFilterChange("payment_mode_id", e.target.value || null)}
            >
              <MenuItem value="">All Modes</MenuItem>
              {paymentModes.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <FormControl fullWidth size="small">
              <InputLabel id="payments-report-status-label">Status</InputLabel>
              <MuiSelect
                labelId="payments-report-status-label"
                id="payments-report-status"
                name="status"
                label="Status"
                multiple
                value={Array.isArray(localFilters.status) ? localFilters.status : []}
                onChange={(e) => {
                  const value = e.target.value;
                  const arr = typeof value === "string" ? value.split(",") : value ?? [];
                  handleFilterChange("status", arr.length > 0 ? arr : null);
                }}
                renderValue={(selected) => {
                  if (!selected || selected.length === 0) return "All Statuses";
                  return selected
                    .map((s) => PAYMENT_STATUSES.find((st) => st.value === s)?.label || s)
                    .join(", ");
                }}
              >
                {PAYMENT_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </MuiSelect>
            </FormControl>
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <Input
              name="order_number"
              label="Order Number"
              value={localFilters.order_number || ""}
              onChange={(e) => handleFilterChange("order_number", e.target.value || null)}
              placeholder="Search by order number"
            />
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <Input
              name="customer_name"
              label="Customer Name"
              value={localFilters.customer_name || ""}
              onChange={(e) => handleFilterChange("customer_name", e.target.value || null)}
              placeholder="Search by customer name"
            />
          </Grid>
      <Grid item xs={12} md={isDrawer ? 12 : 3}>
            <Input
              name="receipt_number"
              label="Receipt Number"
              value={localFilters.receipt_number || ""}
              onChange={(e) => handleFilterChange("receipt_number", e.target.value || null)}
              placeholder="Search by receipt number"
            />
          </Grid>
      <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, mt: isDrawer ? 1.5 : 1, justifyContent: isDrawer ? "flex-start" : "flex-end" }}>
              {isDrawer ? (
                <>
                  <Button size="small" variant="contained" onClick={handleApply}>
                    Apply
                  </Button>
                  <Button size="small" variant="outlined" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button size="small" variant="text" onClick={onCancel}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outlined" onClick={handleClear} disabled={!hasActiveFilters}>
                    Clear Filters
                  </Button>
                  <Button variant="contained" onClick={handleApply}>
                    Apply Filters
                  </Button>
                </>
              )}
            </Box>
          </Grid>
    </Grid>
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
          <Select
            name="branch_id"
            label="Branch"
            value={localFilters.branch_id || ""}
            onChange={(e) => handleFilterChange("branch_id", e.target.value || null)}
          >
            <MenuItem value="">All Branches</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            name="handled_by"
            label="Handled By"
            value={localFilters.handled_by || ""}
            onChange={(e) => handleFilterChange("handled_by", e.target.value || null)}
          >
            <MenuItem value="">All Users</MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            name="payment_mode_id"
            label="Payment Mode"
            value={localFilters.payment_mode_id || ""}
            onChange={(e) => handleFilterChange("payment_mode_id", e.target.value || null)}
          >
            <MenuItem value="">All Modes</MenuItem>
            {paymentModes.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
          <FormControl fullWidth size="small">
            <InputLabel id="payments-report-status-label">Status</InputLabel>
            <MuiSelect
              labelId="payments-report-status-label"
              id="payments-report-status"
              name="status"
              label="Status"
              multiple
              value={Array.isArray(localFilters.status) ? localFilters.status : []}
              onChange={(e) => {
                const value = e.target.value;
                const arr = typeof value === "string" ? value.split(",") : value ?? [];
                handleFilterChange("status", arr.length > 0 ? arr : null);
              }}
              renderValue={(selected) => {
                if (!selected || selected.length === 0) return "All Statuses";
                return selected
                  .map((s) => PAYMENT_STATUSES.find((st) => st.value === s)?.label || s)
                  .join(", ");
              }}
            >
              {PAYMENT_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
          <Input
            name="order_number"
            label="Order Number"
            value={localFilters.order_number || ""}
            onChange={(e) => handleFilterChange("order_number", e.target.value || null)}
            placeholder="Search by order number"
          />
          <Input
            name="receipt_number"
            label="Receipt Number"
            value={localFilters.receipt_number || ""}
            onChange={(e) => handleFilterChange("receipt_number", e.target.value || null)}
            placeholder="Search by receipt number"
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
    <Paper
      sx={{
        mb: 1,
        p: FORM_PADDING,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: expanded ? 1 : 0,
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
        {formGrid}
      </Collapse>
    </Paper>
  );
}

