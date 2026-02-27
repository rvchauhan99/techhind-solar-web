"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
} from "@mui/material";
import { IconChartBar, IconFilter, IconArrowUpRight, IconArrowDownRight, IconActivity } from "@tabler/icons-react";
import { Button as UiButton } from "@/components/ui/button";
import Container from "@/components/container";
import { PAGE_PADDING, LIST_HEADER_MB } from "@/utils/formConstants";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import MultiSelect from "@/components/common/MultiSelect";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  PieChart,
  Pie,
  Cell
} from "recharts";

const INITIAL_FILTERS = {
  from: "",
  to: "",
  branch_id: "",
  source_ids: [],
  status: [],
  priority: [],
  campaign_name: "",
  lead_segment: "",
  product_interest: "",
  assigned_to: "",
};

const STATUS_COLORS = {
  new: "#3b82f6",
  contacted: "#f59e0b",
  follow_up: "#8b5cf6",
  interested: "#10b981",
  converted: "#22c55e",
  not_interested: "#ef4444",
  junk: "#64748b",
};

const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];

export default function MarketingLeadAnalysisPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);

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
      });
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const params = {
        from: filters.from || undefined,
        to: filters.to || undefined,
        branch_id: filters.branch_id || undefined,
        source_ids: Array.isArray(filters.source_ids) && filters.source_ids.length ? filters.source_ids.join(",") : undefined,
        status: Array.isArray(filters.status) && filters.status.length ? filters.status.join(",") : undefined,
        priority: Array.isArray(filters.priority) && filters.priority.length ? filters.priority.join(",") : undefined,
        campaign_name: filters.campaign_name || undefined,
        lead_segment: filters.lead_segment || undefined,
        product_interest: filters.product_interest || undefined,
        assigned_to: filters.assigned_to || undefined,
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

  // Process data for charts
  const funnelData = Array.isArray(summary?.funnel)
    ? summary.funnel
        .map((r) => ({
          name: (r.status || "Unknown").toUpperCase(),
          value: Number(r.count || 0),
          fill: STATUS_COLORS[r.status] || STATUS_COLORS.new,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  // All-status breakdown including converted for compact status tiles
  const statusCardsData = Array.isArray(summary?.status_breakdown_all)
    ? summary.status_breakdown_all
        .map((r) => ({
          key: r.status || "unknown",
          name: (r.status || "Unknown").toUpperCase(),
          value: Number(r.count || 0),
          fill: STATUS_COLORS[r.status] || STATUS_COLORS.new,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const agentData = Array.isArray(summary?.agent_performance)
    ? summary.agent_performance.map((r) => ({
        name: r.name || `User #${r.created_by}`,
        created_by: r.created_by,
        FollowUps: Number(r.follow_up_count || 0),
      }))
    : [];

  const sourceData = Array.isArray(summary?.source_branch)
    ? summary.source_branch.reduce((acc, curr) => {
      const sourceName = sourceOptions.find(s => String(s.id) === String(curr.inquiry_source_id))?.source_name || `Source #${curr.inquiry_source_id}`;
      const existing = acc.find(item => item.name === sourceName);
      if (existing) {
        existing.value += Number(curr.total || 0);
      } else {
        acc.push({ name: sourceName, value: Number(curr.total || 0) });
      }
      return acc;
    }, [])
    : [];

  const totalLeadsAll =
    typeof summary?.total_leads_all === "number"
      ? summary.total_leads_all
      : Array.isArray(summary?.status_breakdown_all)
      ? summary.status_breakdown_all.reduce((sum, r) => sum + Number(r.count || 0), 0)
      : 0;

  const convertedLeads =
    typeof summary?.converted_count === "number"
      ? summary.converted_count
      : Array.isArray(summary?.status_breakdown_all)
      ? summary.status_breakdown_all.find((r) => r.status === "converted")?.count || 0
      : 0;

  const pipelineLeads = Array.isArray(summary?.funnel)
    ? summary.funnel.reduce((sum, r) => sum + Number(r.count || 0), 0)
    : 0;

  const conversionRateRaw =
    typeof summary?.conversion_rate === "number"
      ? summary.conversion_rate
      : totalLeadsAll
      ? (Number(convertedLeads || 0) / totalLeadsAll) * 100
      : 0;
  const conversionRate = Number.isFinite(conversionRateRaw)
    ? conversionRateRaw.toFixed(1)
    : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50">
        <Container className="pt-2 pb-8">
          <Box sx={{ p: PAGE_PADDING }}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: LIST_HEADER_MB }}>
              <div className="bg-primary/10 p-2 rounded-lg">
                <IconChartBar size={24} stroke={1.5} className="text-primary" />
              </div>
              <div>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                  Marketing Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Interactive dashboard for pipeline and performance metrics
                </Typography>
              </div>
            </Box>

            {/* Filter Panel */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, borderColor: "divider", bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconFilter size={18} />
                  Advanced Filters
                </Typography>
                <UiButton size="sm" onClick={loadSummary} disabled={loading} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
                  Apply Filters
                </UiButton>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <DateField
                    label="From Date"
                    name="from"
                    fullWidth
                    value={filters.from}
                    onChange={(e) => handleFilterChange("from", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DateField
                    label="To Date"
                    name="to"
                    fullWidth
                    value={filters.to}
                    onChange={(e) => handleFilterChange("to", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Select
                    name="branch_id"
                    label="Branch"
                    fullWidth
                    value={filters.branch_id}
                    onChange={(e) => handleFilterChange("branch_id", e.target.value)}
                  >
                    <MenuItem value="">All Branches</MenuItem>
                    {branchOptions.map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>
                        {b.name ?? b.label ?? b.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <MultiSelect
                    name="source_ids"
                    label="Sources"
                    fullWidth
                    placeholder="Select sources..."
                    options={sourceOptions.map(s => ({ value: String(s.id), label: s.source_name || s.name || String(s.id) }))}
                    value={filters.source_ids}
                    onChange={(e) => handleFilterChange("source_ids", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <MultiSelect
                    name="status"
                    label="Status"
                    fullWidth
                    placeholder="Select status..."
                    options={[
                      { value: "new", label: "New" },
                      { value: "contacted", label: "Contacted" },
                      { value: "follow_up", label: "Follow Up" },
                      { value: "interested", label: "Interested" },
                      { value: "converted", label: "Converted" },
                      { value: "not_interested", label: "Not Interested" },
                      { value: "junk", label: "Junk" },
                    ]}
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <MultiSelect
                    name="priority"
                    label="Priority"
                    fullWidth
                    placeholder="Select priority..."
                    options={[
                      { value: "hot", label: "Hot" },
                      { value: "high", label: "High" },
                      { value: "medium", label: "Medium" },
                      { value: "low", label: "Low" },
                    ]}
                    value={filters.priority}
                    onChange={(e) => handleFilterChange("priority", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Select
                    name="lead_segment"
                    label="Lead Segment"
                    fullWidth
                    value={filters.lead_segment}
                    onChange={(e) => handleFilterChange("lead_segment", e.target.value)}
                  >
                    <MenuItem value="">All Segments</MenuItem>
                    <MenuItem value="residential">Residential</MenuItem>
                    <MenuItem value="commercial">Commercial</MenuItem>
                    <MenuItem value="industrial">Industrial</MenuItem>
                  </Select>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Select
                    name="product_interest"
                    label="Product Interest"
                    fullWidth
                    value={filters.product_interest}
                    onChange={(e) => handleFilterChange("product_interest", e.target.value)}
                  >
                    <MenuItem value="">All Products</MenuItem>
                    <MenuItem value="rooftop_solar">Rooftop Solar</MenuItem>
                    <MenuItem value="ground_mount">Ground Mount</MenuItem>
                    <MenuItem value="solar_water_heater">Solar Water Heater</MenuItem>
                    <MenuItem value="solar_pump">Solar Pump</MenuItem>
                  </Select>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Select
                    name="assigned_to"
                    label="Assigned To"
                    fullWidth
                    value={filters.assigned_to}
                    onChange={(e) => handleFilterChange("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">All Users</MenuItem>
                    {userOptions.map((u) => (
                      <MenuItem key={u.id} value={String(u.id)}>
                        {u.name ?? u.label ?? `User #${u.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
            </Paper>

            {/* Top KPIs + Status Overview (single compact strip) */}
            <Grid container spacing={1.25} sx={{ mb: 2.5 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 1.75, borderRadius: 1.5, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                    Total Leads (All)
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="text.primary">
                    {totalLeadsAll}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 2 }}>
                    <Chip size="small" icon={<IconActivity size={14} />} label="Active" color="primary" variant="outlined" />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 1.75, borderRadius: 1.5, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                    Leads in Pipeline
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="text.primary">
                    {pipelineLeads}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Excludes converted, junk, not interested
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 1.75, borderRadius: 1.5, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                    Average Conversion Rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    {conversionRate}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 2, color: 'success.main', gap: 0.5 }}>
                    <IconArrowUpRight size={16} />
                    <Typography variant="body2" fontWeight={500}>Trending Positive</Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 1.75, borderRadius: 1.5, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                    Converted Leads
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {convertedLeads}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 2, gap: 0.5 }}>
                    <Chip size="small" label={`${conversionRate}% of total`} color="success" variant="outlined" />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 1.75, borderRadius: 1.5, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)', bgcolor: summary?.aging_sla?.overdue > 0 ? 'error.lighter' : 'background.paper' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                    Overdue Follow-ups
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={summary?.aging_sla?.overdue > 0 ? 'error.main' : 'text.primary'}>
                    {summary?.aging_sla?.overdue ?? 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 2, color: summary?.aging_sla?.overdue > 0 ? 'error.main' : 'text.secondary', gap: 0.5 }}>
                    {summary?.aging_sla?.overdue > 0 ? <IconArrowDownRight size={16} /> : <IconActivity size={16} />}
                    <Typography variant="body2" fontWeight={500}>
                      {summary?.aging_sla?.overdue > 0 ? 'Action Required' : 'On Track'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              {statusCardsData.map((item) => (
                <Grid item xs={6} sm={4} md={2} key={item.key}>
                  <Paper
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      height: '100%',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: item.fill,
                        bgcolor: `${item.fill}10`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => {
                      const statusVal = item.key.toLowerCase().replace(" ", "_");
                      router.push(`/marketing-leads?status=${statusVal}`);
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {item.name}
                    </Typography>
                    <Typography variant="h5" fontWeight={700} sx={{ color: item.fill, mt: 0.5 }}>
                      {item.value}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Main Dashboard Content */}
            <Grid container spacing={2.5}>
              {/* Funnel Chart */}
              <Grid item xs={12} lg={8}>
                <Paper sx={{ p: 2, borderRadius: 1.5, height: 340, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Lead Pipeline Funnel
                  </Typography>
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    {funnelData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <RechartsTooltip formatter={(value, name) => [value, name]} />
                          <Funnel
                            dataKey="value"
                            data={funnelData}
                            isAnimationActive
                            onClick={(data) => {
                              const statusValue = (data?.payload?.name || "").toLowerCase().replace(" ", "_");
                              if (statusValue) {
                                router.push(`/marketing-leads?status=${statusValue}`);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <LabelList position="right" fill="#333" stroke="none" dataKey="name" />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No funnel data available for applied filters.</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* SLA & Aging */}
              <Grid item xs={12} lg={4}>
                <Paper sx={{ p: 2, borderRadius: 1.5, height: 340, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="h6" fontWeight={600} mb={3}>
                    Aging & SLA Overview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: 'center', cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => {
                        const today = new Date();
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        router.push(`/marketing-leads?next_follow_up_to=${today.toISOString().split('T')[0]}&not_status=converted,junk,not_interested`);
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>Overdue</Typography>
                      <Chip color="error" label={summary?.aging_sla?.overdue ?? 0} sx={{ fontWeight: 600, minWidth: 60, cursor: 'inherit' }} />
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: 'center', cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        router.push(`/marketing-leads?next_follow_up_from=${today}&next_follow_up_to=${today}`);
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>Due Today</Typography>
                      <Chip color="primary" label={summary?.aging_sla?.due_today ?? 0} sx={{ fontWeight: 600, minWidth: 60, cursor: 'inherit' }} />
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: 'center', cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => {
                        const today = new Date();
                        const nextWeek = new Date(today);
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        router.push(`/marketing-leads?next_follow_up_from=${today.toISOString().split('T')[0]}&next_follow_up_to=${nextWeek.toISOString().split('T')[0]}`);
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>Due This Week</Typography>
                      <Chip color="secondary" label={summary?.aging_sla?.due_this_week ?? 0} sx={{ fontWeight: 600, minWidth: 60, cursor: 'inherit' }} />
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: 'center', cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => {
                        const today = new Date();
                        const sevenDaysAgo = new Date(today);
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        router.push(`/marketing-leads?created_to=${sevenDaysAgo.toISOString().split('T')[0]}&not_status=converted,junk,not_interested`);
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>Stale (7+ days)</Typography>
                      <Chip label={summary?.aging_sla?.stale_7_plus ?? 0} sx={{ fontWeight: 600, minWidth: 60, bgcolor: 'grey.200', cursor: 'inherit' }} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Agent Performance Chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, borderRadius: 1.5, height: 320, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Agent Call Performance
                  </Typography>
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    {agentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                          <Bar
                            dataKey="FollowUps"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                            onClick={(data) => {
                              const finalId = data?.payload?.created_by || null;
                              if (finalId) router.push(`/marketing-leads?assigned_to=${finalId}`);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No agent performance data available.</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Source Effectiveness Chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, borderRadius: 1.5, height: 320, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.08)' }}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Lead Sources Breakdown
                  </Typography>
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    {sourceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                            onClick={(data) => {
                              const sourceName = data?.payload?.name;
                              if (sourceName) {
                                const matchedSource = sourceOptions.find(s => s.source_name === sourceName);
                                if (matchedSource) router.push(`/marketing-leads?inquiry_source_id=${matchedSource.id}`);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {sourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No source data available.</Typography>
                      </Box>
                    )}
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
