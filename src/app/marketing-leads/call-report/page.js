"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  Box,
  Typography,
  Paper,
  Grid,
} from "@mui/material";
import { IconFilter, IconPhoneCall } from "@tabler/icons-react";
import { Button as UiButton } from "@/components/ui/button";
import Container from "@/components/container";
import { PAGE_PADDING, LIST_HEADER_MB } from "@/utils/formConstants";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import Input from "@/components/common/Input";
import PaginatedTable from "@/components/common/PaginatedTable";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService from "@/services/mastersService";
import { toastError } from "@/utils/toast";
import moment from "moment";

export default function MarketingLeadsCallReportPage() {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    user_id: "",
    outcome: "",
  });
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [userOptions, setUserOptions] = useState([]);

  useEffect(() => {
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

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await marketingLeadsService.getMarketingLeadsCallReport({
        ...filters,
        page: 1,
        limit: 5,
      });
      const payload = res?.result || res?.data || res;
      setSummary(payload?.summary || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load call report";
      toastError(msg);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const fetcher = async (params) => {
    const res = await marketingLeadsService.getMarketingLeadsCallReport({
      ...filters,
      ...params,
    });
    return res;
  };

  const columns = [
    {
      field: "contacted_at",
      label: "Call Date",
      sortable: true,
      render: (row) =>
        row.contacted_at ? moment(row.contacted_at).format("DD-MM-YYYY HH:mm") : "-",
    },
    {
      field: "created_by_name",
      label: "Call By",
      sortable: false,
      render: (row) => row.created_by_name || "-",
    },
    {
      field: "outcome",
      label: "Status",
      sortable: false,
      render: (row) => row.outcome || "-",
    },
    {
      field: "notes",
      label: "Call Remarks",
      sortable: false,
      wrap: true,
    },
    {
      field: "lead_number",
      label: "#",
      sortable: false,
    },
    {
      field: "lead_name",
      label: "Name",
      sortable: false,
    },
    {
      field: "mobile_number",
      label: "Mobile Number",
      sortable: false,
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
              <IconPhoneCall size={24} stroke={1.5} className="text-primary" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Call Report
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
                sx={{ ml: 0.5 }}
              >
                — Telecaller-wise call summary
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
                <UiButton
                  size="sm"
                  variant="outline"
                  startIcon={<IconFilter className="size-4" />}
                  onClick={loadSummary}
                  disabled={loadingSummary}
                >
                  Apply
                </UiButton>
              </Box>
            </Box>

            <Paper sx={{ p: 2, mb: 2, borderRadius: 1.5 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <DateField
                    label="From Date"
                    name="from"
                    fullWidth
                    value={filters.from}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, from: e.target.value }))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <DateField
                    label="To Date"
                    name="to"
                    fullWidth
                    value={filters.to}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, to: e.target.value }))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Select
                    name="user_id"
                    label="Call By"
                    fullWidth
                    value={filters.user_id}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, user_id: e.target.value }))
                    }
                  >
                    <MenuItem value="">All</MenuItem>
                    {userOptions.map((u) => (
                      <MenuItem key={u.id} value={String(u.id)}>
                        {u.name ?? u.label ?? u.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Select
                    name="outcome"
                    label="Status"
                    fullWidth
                    value={filters.outcome}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, outcome: e.target.value }))
                    }
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="interested">Interested</MenuItem>
                    <MenuItem value="follow_up">Follow Up</MenuItem>
                    <MenuItem value="callback_scheduled">Callback Scheduled</MenuItem>
                    <MenuItem value="converted">Converted</MenuItem>
                    <MenuItem value="no_answer">No Answer</MenuItem>
                    <MenuItem value="switched_off">Switched Off</MenuItem>
                    <MenuItem value="not_interested">Not Interested</MenuItem>
                    <MenuItem value="wrong_number">Wrong Number</MenuItem>
                  </Select>
                </Grid>
              </Grid>
            </Paper>

            {summary && summary.length > 0 && (
              <Paper sx={{ p: 2, mb: 2, borderRadius: 1.5 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Call By Summary
                </Typography>
                {summary.map((row) => (
                  <Box key={row.created_by} sx={{ mb: 0.5 }}>
                    <Typography variant="body2">
                      {row.call_count} call(s) — User #{row.created_by}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            )}

            <PaginatedTable
              columns={columns}
              fetcher={fetcher}
              height="calc(100vh - 220px)"
            />
          </Box>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

