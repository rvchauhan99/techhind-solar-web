"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Tabs,
  Tab,
  Chip,
  Button,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import Input from "@/components/common/Input";
import DateTimeField from "@/components/common/DateTimeField";
import Textarea from "@/components/common/Textarea";
import Select, { MenuItem } from "@/components/common/Select";
import marketingLeadsService from "@/services/marketingLeadsService";
import moment from "moment";
import { toastError, toastSuccess } from "@/utils/toast";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: "16px 0" }}>
      {children}
    </div>
  );
}

function LeadHeader({ lead }) {
  if (!lead) return null;
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Lead #
      </Typography>
      <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {lead.lead_number || "-"} — {lead.customer_name || "-"}
        <Chip
          size="small"
          label={lead.status || "NEW"}
          sx={{ ml: 1, fontSize: "0.65rem", height: 18 }}
          color="primary"
        />
        {lead.priority && (
          <Chip
            size="small"
            label={(lead.priority || "medium").toUpperCase()}
            sx={{ fontSize: "0.65rem", height: 18 }}
          />
        )}
      </Typography>
      <Box mt={1}>
        <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <PhoneIcon sx={{ fontSize: 14 }} /> {lead.mobile_number || "-"}
        </Typography>
        {lead.campaign_name && (
          <Typography variant="body2" color="text.secondary">
            Campaign: {lead.campaign_name}
          </Typography>
        )}
        {lead.branch_name && (
          <Typography variant="body2" color="text.secondary">
            Branch: {lead.branch_name}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

function LeadDetails({ lead }) {
  if (!lead) return null;
  return (
    <Paper sx={{ p: 2, mb: 2, height: "calc(100vh - 170px)", overflowY: "auto" }}>
      <Typography variant="subtitle1" gutterBottom>
        Lead Details
      </Typography>
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary">
          Contact
        </Typography>
        <Typography variant="body2">
          {lead.customer_name} {lead.company_name ? `(${lead.company_name})` : ""}
        </Typography>
        <Typography variant="body2">
          {lead.mobile_number}
          {lead.alternate_mobile_number ? `, ${lead.alternate_mobile_number}` : ""}
        </Typography>
        {lead.email_id && (
          <Typography variant="body2" color="text.secondary">
            {lead.email_id}
          </Typography>
        )}
      </Box>
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary">
          Address
        </Typography>
        <Typography variant="body2">{lead.address || "-"}</Typography>
        <Typography variant="body2" color="text.secondary">
          {lead.city_name || ""} {lead.state_name || ""} {lead.pin_code || ""}
        </Typography>
      </Box>
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary">
          Source & Campaign
        </Typography>
        <Typography variant="body2">
          Source: {lead.inquiry_source_name || "N/A"}
        </Typography>
        <Typography variant="body2">
          Campaign: {lead.campaign_name || "N/A"}
        </Typography>
      </Box>
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary">
          Assignment
        </Typography>
        <Typography variant="body2">
          Assigned To: {lead.assigned_to_name || "Unassigned"}
        </Typography>
      </Box>
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary">
          Requirement
        </Typography>
        <Typography variant="body2">
          Capacity:{" "}
          {lead.expected_capacity_kw != null ? `${lead.expected_capacity_kw} kW` : "-"}
        </Typography>
        <Typography variant="body2">
          Value:{" "}
          {lead.expected_project_cost != null
            ? `Rs. ${Number(lead.expected_project_cost).toLocaleString()}`
            : "-"}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Notes
        </Typography>
        <Typography variant="body2">{lead.remarks || "-"}</Typography>
      </Box>
    </Paper>
  );
}

function AddFollowUpForm({ leadId, onSaved }) {
  const [form, setForm] = useState({
    contacted_at: new Date().toISOString(),
    contact_channel: "call",
    outcome: "",
    outcome_sub_status: "",
    notes: "",
    next_follow_up_at: "",
    promised_action: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (!form.outcome) {
        toastError("Please select outcome");
        setSaving(false);
        return;
      }
      await marketingLeadsService.addFollowUp(leadId, form);
      toastSuccess("Follow-up saved");
      setForm((prev) => ({
        ...prev,
        outcome: "",
        outcome_sub_status: "",
        notes: "",
        promised_action: "",
        contacted_at: new Date().toISOString(),
      }));
      onSaved?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to save follow-up";
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Add Call Details
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <DateTimeField
            label="Contacted At"
            name="contacted_at"
            fullWidth
            value={form.contacted_at}
            onChange={(e) => handleChange("contacted_at", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            name="contact_channel"
            label="Channel"
            fullWidth
            value={form.contact_channel}
            onChange={(e) => handleChange("contact_channel", e.target.value)}
          >
            <MenuItem value="call">Call</MenuItem>
            <MenuItem value="whatsapp">WhatsApp</MenuItem>
            <MenuItem value="sms">SMS</MenuItem>
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="visit">Visit</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            name="outcome"
            label="Outcome"
            fullWidth
            value={form.outcome}
            onChange={(e) => handleChange("outcome", e.target.value)}
            required
          >
            <MenuItem value="interested">Interested</MenuItem>
            <MenuItem value="follow_up">Need Follow-up</MenuItem>
            <MenuItem value="callback_scheduled">Callback Scheduled</MenuItem>
            <MenuItem value="converted">Converted</MenuItem>
            <MenuItem value="no_answer">No Answer</MenuItem>
            <MenuItem value="switched_off">Switched Off</MenuItem>
            <MenuItem value="not_interested">Not Interested</MenuItem>
            <MenuItem value="wrong_number">Wrong Number</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={6}>
          <Input
            name="outcome_sub_status"
            label="Sub-status / Reason"
            fullWidth
            value={form.outcome_sub_status}
            onChange={(e) => handleChange("outcome_sub_status", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DateTimeField
            name="next_follow_up_at"
            label="Next Follow-Up"
            fullWidth
            value={form.next_follow_up_at}
            onChange={(e) => handleChange("next_follow_up_at", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Input
            name="promised_action"
            label="Promised Action"
            fullWidth
            value={form.promised_action}
            onChange={(e) => handleChange("promised_action", e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <Textarea
            name="notes"
            label="Call Notes"
            minRows={3}
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            size="small"
          >
            {saving ? "Saving..." : "Save Follow-Up"}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

function FollowUpHistory({ leadId, refreshKey }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await marketingLeadsService.listFollowUps(leadId, {
          page: 1,
          limit: 100,
        });
        const list = res?.result?.data || res?.data?.data || res?.data || res;
        setData(Array.isArray(list) ? list : []);
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load follow-ups";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (leadId) {
      load();
    }
  }, [leadId, refreshKey]);

  if (loading) {
    return (
      <Box py={2} display="flex" justifyContent="center">
        <CircularProgress size={18} />
      </Box>
    );
  }
  if (error) {
    return (
      <Box py={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  if (!data.length) {
    return (
      <Box py={2}>
        <Typography variant="body2" color="text.secondary">
          No follow-ups yet.
        </Typography>
      </Box>
    );
  }
  return (
    <Box>
      {data.map((fu) => (
        <Paper
          key={fu.id}
          sx={{ p: 1.5, mb: 1, borderLeft: "3px solid #0ea5e9" }}
          variant="outlined"
        >
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              {fu.contacted_at
                ? moment(fu.contacted_at).format("DD-MM-YYYY HH:mm")
                : "-"}
            </Typography>
            <Chip
              size="small"
              label={fu.outcome}
              sx={{ height: 18, fontSize: "0.65rem" }}
            />
          </Box>
          {fu.notes && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {fu.notes}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Next:{" "}
            {fu.next_follow_up_at
              ? moment(fu.next_follow_up_at).format("DD-MM-YYYY HH:mm")
              : "Not scheduled"}
          </Typography>
          {fu.created_by_name && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              By: {fu.created_by_name}
            </Typography>
          )}
        </Paper>
      ))}
    </Box>
  );
}

function MarketingLeadViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (!leadId) {
      setError("Lead id is required");
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const res = await marketingLeadsService.getMarketingLeadById(leadId);
        const leadData = res?.result || res?.data || res;
        setLead(leadData);
        setError(null);
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load marketing lead";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leadId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Box mt={2}>
          <Button variant="outlined" size="small" onClick={() => router.push("/marketing-leads")}>
            Back to list
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <LeadHeader lead={lead} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <LeadDetails lead={lead} />
        </Grid>
        <Grid item xs={12} md={9}>
          <Paper sx={{ height: "calc(100vh - 170px)", overflow: "hidden" }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label="Add Call Details" />
              <Tab label="Follow-Up History" />
            </Tabs>
            <Box sx={{ p: 2, height: "calc(100% - 48px)", overflowY: "auto" }}>
              <TabPanel value={tab} index={0}>
                <AddFollowUpForm
                  leadId={lead.id}
                  onSaved={() => {
                    setHistoryRefreshKey((k) => k + 1);
                  }}
                />
              </TabPanel>
              <TabPanel value={tab} index={1}>
                <FollowUpHistory leadId={lead.id} refreshKey={historyRefreshKey} />
              </TabPanel>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function MarketingLeadViewPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<CircularProgress />}>
        <MarketingLeadViewContent />
      </Suspense>
    </ProtectedRoute>
  );
}

