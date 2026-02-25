"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
} from "@mui/material";
import { IconChartBar, IconFilter } from "@tabler/icons-react";
import { Button as UiButton } from "@/components/ui/button";
import Container from "@/components/container";
import { PAGE_PADDING, LIST_HEADER_MB } from "@/utils/formConstants";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";

const INITIAL_FILTERS = {
  from: "",
  to: "",
  branch_id: "",
  source_ids: [],
};

export default function MarketingLeadAnalysisPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);

  useEffect(() => {
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
      });
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const params = {
        from: filters.from || undefined,
        to: filters.to || undefined,
        branch_id: filters.branch_id || undefined,
        source_ids:
          Array.isArray(filters.source_ids) && filters.source_ids.length
            ? filters.source_ids.join(",")
            : undefined,
      };
      const res = await marketingLeadsService.getMarketingLeadsSummary(params);
      const data = res?.result || res?.data || res;
      setSummary(data);
    } catch (err) {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const funnelTotal = Array.isArray(summary?.funnel)
    ? summary.funnel.reduce((sum, r) => sum + Number(r.count || 0), 0)
    : 0;

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
                Marketing Lead Analysis
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
                sx={{ ml: 0.5 }}
              >
                — Funnel, telecaller performance & source effectiveness
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
                <UiButton
                  size="sm"
                  variant="outline"
                  startIcon={<IconFilter className="size-4" />}
                  onClick={loadSummary}
                  disabled={loading}
                >
                  Apply
                </UiButton>
              </Box>
            </Box>

            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, borderRadius: 1.5, borderColor: "divider" }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <DateField
                    label="From"
                    name="from"
                    fullWidth
                    value={filters.from}
                    onChange={(e) => handleFilterChange("from", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DateField
                    label="To"
                    name="to"
                    fullWidth
                    value={filters.to}
                    onChange={(e) => handleFilterChange("to", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Select
                    name="branch_id"
                    label="Branch"
                    fullWidth
                    value={filters.branch_id}
                    onChange={(e) => handleFilterChange("branch_id", e.target.value)}
                  >
                    <MenuItem value="">All branches</MenuItem>
                    {branchOptions.map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>
                        {b.name ?? b.label ?? b.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12}>
                  <Select
                    name="source_ids"
                    label="Sources"
                    fullWidth
                    multiple
                    value={filters.source_ids}
                    onChange={(e) =>
                      handleFilterChange(
                        "source_ids",
                        Array.isArray(e.target.value) ? e.target.value : []
                      )
                    }
                  >
                    {sourceOptions.map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>
                        {s.source_name ?? s.label ?? s.name ?? s.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
            </Paper>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Funnel
                  </Typography>
                  {Array.isArray(summary?.funnel) && summary.funnel.length ? (
                    summary.funnel.map((row) => {
                      const count = Number(row.count || 0);
                      const pct = funnelTotal ? Math.round((count / funnelTotal) * 100) : 0;
                      return (
                        <Box
                          key={row.status}
                          sx={{ mb: 1.25 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.25,
                            }}
                          >
                            <Typography variant="body2">
                              {(row.status || "unknown").toUpperCase()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {count} ({pct}%)
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              height: 6,
                              borderRadius: 999,
                              bgcolor: "action.hover",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                width: `${pct}%`,
                                height: "100%",
                                bgcolor: "primary.main",
                              }}
                            />
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data.
                    </Typography>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Agent Performance
                  </Typography>
                  {Array.isArray(summary?.agent_performance) &&
                  summary.agent_performance.length ? (
                    summary.agent_performance.map((row) => (
                      <Box
                        key={row.created_by}
                        sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}
                      >
                        <Typography variant="body2">
                          User #{row.created_by}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${row.follow_up_count} follow-ups`}
                          sx={{ fontSize: "0.7rem", height: 20 }}
                        />
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data.
                    </Typography>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Aging & SLA
                  </Typography>
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Overdue</Typography>
                      <Chip
                        size="small"
                        color="error"
                        label={summary?.aging_sla?.overdue ?? 0}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Due today</Typography>
                      <Chip
                        size="small"
                        color="primary"
                        label={summary?.aging_sla?.due_today ?? 0}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Due this week</Typography>
                      <Chip
                        size="small"
                        color="secondary"
                        label={summary?.aging_sla?.due_this_week ?? 0}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="body2">Stale 7+ days</Typography>
                      <Chip
                        size="small"
                        label={summary?.aging_sla?.stale_7_plus ?? 0}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

