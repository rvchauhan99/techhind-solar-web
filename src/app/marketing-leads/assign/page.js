"use client";

import { useState, useCallback } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import Container from "@/components/container";
import { PAGE_PADDING, LIST_HEADER_MB } from "@/utils/formConstants";
import { Button as UiButton } from "@/components/ui/button";
import Select, { MenuItem } from "@/components/common/Select";
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import PaginatedTable from "@/components/common/PaginatedTable";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService from "@/services/mastersService";
import { toastError, toastSuccess } from "@/utils/toast";
import moment from "moment";

export default function MarketingLeadsAssignPage() {
  const [filters, setFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllPage, setSelectAllPage] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [userOptions, setUserOptions] = useState([]);

  const [lastPageRows, setLastPageRows] = useState([]);

  const loadUsers = useCallback(() => {
    mastersService
      .getReferenceOptions("user.model")
      .then((r) => {
        const data = r?.result ?? r?.data ?? r;
        if (Array.isArray(data)) setUserOptions(data);
      })
      .catch(() => {
        setUserOptions([]);
      });
  }, []);

  useState(() => {
    loadUsers();
  }, [loadUsers]);

  const fetcher = async (params) => {
    const res = await marketingLeadsService.getMarketingLeads({
      ...params,
      ...filters,
    });
    const payload = res?.result || res?.data || res;
    const data = payload?.data || [];
    setLastPageRows(data);
    if (selectAllPage) {
      const idsOnPage = data.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsOnPage])));
    }
    return payload;
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllPage = (checked) => {
    setSelectAllPage(checked);
    if (checked) {
      const idsOnPage = lastPageRows.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsOnPage])));
    } else {
      const idsOnPage = lastPageRows.map((r) => r.id);
      setSelectedIds((prev) => prev.filter((id) => !idsOnPage.includes(id)));
    }
  };

  const handleAssign = async () => {
    if (!assignTo) {
      toastError("Please select Assign To user");
      return;
    }
    if (!selectedIds.length) {
      toastError("Please select at least one lead");
      return;
    }
    try {
      await marketingLeadsService.assignMarketingLeads({
        lead_ids: selectedIds,
        assigned_to: Number(assignTo),
      });
      toastSuccess("Leads assigned successfully");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to assign leads";
      toastError(msg);
    }
  };

  const columns = [
    {
      field: "select",
      label: "",
      isActionColumn: true,
      render: (row) => (
        <Checkbox
          checked={selectedIds.includes(row.id)}
          onChange={() => handleToggleRow(row.id)}
          color="primary"
        />
      ),
    },
    {
      field: "lead_number",
      label: "#",
    },
    {
      field: "status",
      label: "Status",
    },
    {
      field: "inquiry_source_name",
      label: "Source",
    },
    {
      field: "created_at",
      label: "Created On",
      render: (row) =>
        row.created_at ? moment(row.created_at).format("DD-MM-YYYY") : "-",
    },
    {
      field: "last_called_at",
      label: "Last Call On",
      render: (row) =>
        row.last_called_at ? moment(row.last_called_at).format("DD-MM-YYYY") : "-",
    },
    {
      field: "last_call_outcome",
      label: "Last Call Remarks",
    },
    {
      field: "customer_name",
      label: "Name",
    },
    {
      field: "mobile_number",
      label: "Mobile Number",
    },
  ];

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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Marketing Leads / Assign Leads
              </Typography>
            </Box>

            <LeadListFilterPanel
              values={filters}
              onApply={(v) => setFilters(v)}
              onClear={() => setFilters({})}
              defaultOpen
            />

            <Paper sx={{ p: 1.5, mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectAllPage}
                    onChange={(e) => handleToggleSelectAllPage(e.target.checked)}
                  />
                }
                label="Select all on page"
              />
              <Typography variant="body2" color="text.secondary">
                Selected leads: {selectedIds.length}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Grid container spacing={1} alignItems="center" sx={{ width: "auto" }}>
                <Grid item>
                  <Select
                    name="assign_to"
                    label="Assign To"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    fullWidth
                    sx={{ minWidth: 200 }}
                  >
                    <MenuItem value="">Select user</MenuItem>
                    {userOptions.map((u) => (
                      <MenuItem key={u.id} value={String(u.id)}>
                        {u.name ?? u.label ?? u.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item>
                  <UiButton size="sm" onClick={handleAssign}>
                    Assign
                  </UiButton>
                </Grid>
              </Grid>
            </Paper>

            <PaginatedTable
              columns={columns}
              fetcher={fetcher}
              height="calc(100vh - 260px)"
            />
          </Box>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

