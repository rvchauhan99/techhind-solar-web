"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Paper, Typography, IconButton, Collapse, Grid } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";

const FILTER_KEYS = [
  "customer_name",
  "consumer_no",
  "application_no",
  "reference_from",
  "mobile_number",
  "branch_id",
  "inquiry_source_id",
  "handled_by",
  "order_number",
  "order_date_from",
  "order_date_to",
  "current_stage_key",
];

/** Pipeline stage options for Order stage filter (value = current_stage_key). */
export const ORDER_STAGE_OPTIONS = [
  { value: "estimate_generated", label: "Estimate Generated" },
  { value: "estimate_paid", label: "Estimate Paid" },
  { value: "planner", label: "Planner" },
  { value: "delivery", label: "Delivery" },
  { value: "assign_fabricator_and_installer", label: "Assign Fabricator & Installer" },
  { value: "fabrication", label: "Fabrication" },
  { value: "installation", label: "Installation" },
  { value: "netmeter_apply", label: "Netmeter Apply" },
  { value: "netmeter_installed", label: "Netmeter Installed" },
  { value: "subsidy_claim", label: "Subsidy Claim" },
  { value: "subsidy_disbursed", label: "Subsidy Disbursed" },
];

const EMPTY_VALUES = Object.fromEntries(
  FILTER_KEYS.map((k) => [k, ""])
);

/**
 * Inline collapsible filter panel for order list (expand/collapse in page flow, no dialog).
 */
export default function OrderListFilterPanel({
  open: controlledOpen,
  onToggle,
  values = {},
  onApply,
  onClear,
  defaultOpen = false,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      else onToggle?.(next);
    },
    [controlledOpen, onToggle]
  );

  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [localValues, setLocalValues] = useState(() => ({ ...EMPTY_VALUES, ...values }));

  useEffect(() => {
    setLocalValues((prev) => ({ ...EMPTY_VALUES, ...values }));
  }, [values]);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      companyService.listBranches().then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
      mastersService.getReferenceOptions("inquiry_source.model").then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
      mastersService.getReferenceOptions("user.model").then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    ])
      .then(([branches, sources, users]) => {
        setBranchOptions(branches);
        setSourceOptions(sources);
        setUserOptions(users);
      })
      .catch(() => {
        setBranchOptions([]);
        setSourceOptions([]);
        setUserOptions([]);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const handleApply = useCallback(() => {
    onApply?.(localValues);
  }, [localValues, onApply]);

  const handleClear = useCallback(() => {
    setLocalValues({ ...EMPTY_VALUES });
    onClear?.();
  }, [onClear]);

  const hasActiveFilters = Object.values(values || {}).some(
    (v) => v != null && v !== ""
  );

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          bgcolor: "action.hover",
          cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterListIcon sx={{ fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight="medium">
            Filter
          </Typography>
          {hasActiveFilters && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: "primary.main",
                color: "white",
                px: 1,
                py: 0.25,
                borderRadius: 1,
              }}
            >
              Active
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-label={open ? "Collapse filter" : "Expand filter"}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Grid container spacing={2} alignItems="flex-end">
            {/* Row 1: 6 fields */}
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="customer_name"
                label="Customer name"
                placeholder="Customer name"
                value={localValues.customer_name}
                onChange={(e) => handleChange("customer_name", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="mobile_number"
                label="Contact number"
                placeholder="Mobile number"
                value={localValues.mobile_number}
                onChange={(e) => handleChange("mobile_number", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="consumer_no"
                label="Consumer no"
                placeholder="Consumer no"
                value={localValues.consumer_no}
                onChange={(e) => handleChange("consumer_no", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="application_no"
                label="Application no"
                placeholder="Application no"
                value={localValues.application_no}
                onChange={(e) => handleChange("application_no", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="reference_from"
                label="Reference"
                placeholder="Reference"
                value={localValues.reference_from}
                onChange={(e) => handleChange("reference_from", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Select
                name="branch_id"
                label="Branch"
                placeholder="All branches"
                value={localValues.branch_id}
                onChange={(e) => handleChange("branch_id", e.target.value)}
                size="small"
                fullWidth
                disabled={loadingOptions}
              >
                <MenuItem value="">All</MenuItem>
                {branchOptions.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>
                    {b.name ?? b.label ?? b.id}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            {/* Row 2: 4 fields + action buttons aligned to input baseline */}
            <Grid item xs={12} sm={6} md={2}>
              <Select
                name="inquiry_source_id"
                label="Source"
                placeholder="All sources"
                value={localValues.inquiry_source_id}
                onChange={(e) => handleChange("inquiry_source_id", e.target.value)}
                size="small"
                fullWidth
                disabled={loadingOptions}
              >
                <MenuItem value="">All</MenuItem>
                {sourceOptions.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.source_name ?? s.label ?? s.name ?? s.id}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Select
                name="handled_by"
                label="Handled By"
                placeholder="All users"
                value={localValues.handled_by}
                onChange={(e) => handleChange("handled_by", e.target.value)}
                size="small"
                fullWidth
                disabled={loadingOptions}
              >
                <MenuItem value="">All</MenuItem>
                {userOptions.map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>
                    {u.name ?? u.label ?? `User #${u.id}`}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Select
                name="current_stage_key"
                label="Order stage"
                placeholder="All stages"
                value={localValues.current_stage_key}
                onChange={(e) => handleChange("current_stage_key", e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                {ORDER_STAGE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="order_number"
                label="Order number"
                placeholder="Order number"
                value={localValues.order_number}
                onChange={(e) => handleChange("order_number", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DateField
                name="order_date_from"
                label="Order date from"
                value={localValues.order_date_from}
                onChange={(e) => handleChange("order_date_from", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DateField
                name="order_date_to"
                label="Order date to"
                value={localValues.order_date_to}
                onChange={(e) => handleChange("order_date_to", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ display: "flex", alignItems: "flex-end", gap: 1, pb: 0.5 }}>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
              <Button onClick={handleApply}>Apply</Button>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
}

export { FILTER_KEYS, EMPTY_VALUES };
