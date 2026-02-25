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
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import marketingLeadsService from "@/services/marketingLeadsService";
import moment from "moment";
import AddCallDetailsForm from "../components/AddCallDetailsForm";

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
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Contacted At</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Channel</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Outcome</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Sub-status / Reason</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Next Follow-Up</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Promised Action</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Call Notes</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>By</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((fu) => (
            <TableRow key={fu.id} hover>
              <TableCell>
                {fu.contacted_at
                  ? moment(fu.contacted_at).format("DD-MM-YYYY HH:mm")
                  : "-"}
              </TableCell>
              <TableCell>{fu.contact_channel || "-"}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={fu.outcome || "-"}
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              </TableCell>
              <TableCell>{fu.outcome_sub_status || "-"}</TableCell>
              <TableCell>
                {fu.next_follow_up_at
                  ? moment(fu.next_follow_up_at).format("DD-MM-YYYY HH:mm")
                  : "-"}
              </TableCell>
              <TableCell>{fu.promised_action || "-"}</TableCell>
              <TableCell sx={{ maxWidth: 200 }}>{fu.notes || "-"}</TableCell>
              <TableCell>{fu.created_by_name || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function MarketingLeadViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
          <Box
            sx={{
              height: "calc(100vh - 170px)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <AddCallDetailsForm
                leadId={lead.id}
                onSaved={() => setHistoryRefreshKey((k) => k + 1)}
              />
            </Box>
            <Box sx={{ flex: "0 0 auto", mt: 2, pt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                Call History
              </Typography>
              <FollowUpHistory leadId={lead.id} refreshKey={historyRefreshKey} />
            </Box>
          </Box>
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

