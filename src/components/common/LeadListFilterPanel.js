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
  "mobile_number",
  "campaign_name",
  "status",
  "priority",
  "branch_id",
  "inquiry_source_id",
  "created_from",
  "created_to",
  "next_follow_up_from",
  "next_follow_up_to",
];

const EMPTY_VALUES = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));

export default function LeadListFilterPanel({
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
    ])
      .then(([branches, sources]) => {
        setBranchOptions(branches);
        setSourceOptions(sources);
      })
      .catch(() => {
        setBranchOptions([]);
        setSourceOptions([]);
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
            Search Option
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
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          aria-label={open ? "Collapse filter" : "Expand filter"}
        >
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="customer_name"
                label="Name"
                placeholder="Lead name"
                value={localValues.customer_name}
                onChange={(e) => handleChange("customer_name", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="mobile_number"
                label="Mobile"
                placeholder="Mobile number"
                value={localValues.mobile_number}
                onChange={(e) => handleChange("mobile_number", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Input
                name="campaign_name"
                label="Campaign"
                placeholder="Campaign"
                value={localValues.campaign_name}
                onChange={(e) => handleChange("campaign_name", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Select
                name="status"
                label="Status"
                placeholder="All"
                value={localValues.status}
                onChange={(e) => handleChange("status", e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="contacted">Contacted</MenuItem>
                <MenuItem value="follow_up">Follow Up</MenuItem>
                <MenuItem value="interested">Interested</MenuItem>
                <MenuItem value="converted">Converted</MenuItem>
                <MenuItem value="not_interested">Not Interested</MenuItem>
                <MenuItem value="junk">Junk</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Select
                name="priority"
                label="Priority"
                placeholder="All"
                value={localValues.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="hot">Hot</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
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
              <DateField
                name="created_from"
                label="Created From"
                value={localValues.created_from}
                onChange={(e) => handleChange("created_from", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DateField
                name="created_to"
                label="Created To"
                value={localValues.created_to}
                onChange={(e) => handleChange("created_to", e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DateField
                name="next_follow_up_from"
                label="Next Follow-Up From"
                value={localValues.next_follow_up_from}
                onChange={(e) =>
                  handleChange("next_follow_up_from", e.target.value)
                }
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DateField
                name="next_follow_up_to"
                label="Next Follow-Up To"
                value={localValues.next_follow_up_to}
                onChange={(e) =>
                  handleChange("next_follow_up_to", e.target.value)
                }
                size="small"
                fullWidth
              />
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
              md={2}
              sx={{ display: "flex", alignItems: "flex-end", gap: 1, pb: 0.5 }}
            >
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

