"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  Box,
  Typography,
  Paper,
  Grid,
} from "@mui/material";
import { Button as UiButton } from "@/components/ui/button";
import Container from "@/components/container";
import { PAGE_PADDING, LIST_HEADER_MB } from "@/utils/formConstants";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";
import Select, { MenuItem } from "@/components/common/Select";
import marketingLeadsService from "@/services/marketingLeadsService";
import { toastError, toastSuccess } from "@/utils/toast";

export default function MarketingLeadsUploadPage() {
  const [file, setFile] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const ensureOptionsLoaded = async () => {
    if (branchOptions.length || sourceOptions.length) return;
    try {
      const [branches, sources] = await Promise.all([
        companyService.listBranches().then((r) => {
          const data = r?.result ?? r?.data ?? r;
          return Array.isArray(data) ? data : [];
        }),
        mastersService.getReferenceOptions("inquiry_source.model").then((r) => {
          const data = r?.result ?? r?.data ?? r;
          return Array.isArray(data) ? data : [];
        }),
      ]);
      setBranchOptions(branches);
      setSourceOptions(sources);
    } catch {
      setBranchOptions([]);
      setSourceOptions([]);
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      await ensureOptionsLoaded();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toastError("Please select a file to upload");
      return;
    }
    try {
      setLoading(true);
      const res = await marketingLeadsService.uploadMarketingLeads(file, {
        branch_id: branchId,
        inquiry_source_id: sourceId,
      });
      const data = res?.result || res?.data || res;
      setResult(data);
      toastSuccess("Upload completed");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to upload leads";
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

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
                Marketing Leads Bulk Upload
              </Typography>
            </Box>

            <Paper sx={{ p: 2, mb: 2, borderRadius: 1.5 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Upload an Excel file in the standard Marketing Leads template
                    format. At minimum, it should contain <b>Name</b> and{" "}
                    <b>Mobile</b> columns.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" gutterBottom>
                    File
                  </Typography>
                  <UiButton asChild variant="outline" size="sm">
                    <label>
                      Choose File
                      <input
                        type="file"
                        hidden
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                      />
                    </label>
                  </UiButton>
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {file?.name || "No file selected"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Select
                    name="branch_id"
                    label="Default Branch (optional)"
                    fullWidth
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {branchOptions.map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>
                        {b.name ?? b.label ?? b.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Select
                    name="inquiry_source_id"
                    label="Default Source (optional)"
                    fullWidth
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {sourceOptions.map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>
                        {s.source_name ?? s.label ?? s.name ?? s.id}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12}>
                  <UiButton
                    size="sm"
                    onClick={handleUpload}
                    disabled={loading || !file}
                  >
                    {loading ? "Uploading..." : "Upload"}
                  </UiButton>
                </Grid>
              </Grid>
            </Paper>

            {result && (
              <Paper sx={{ p: 2, borderRadius: 1.5 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Summary
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2">Total rows</Typography>
                    <Typography variant="h6">
                      {result.total_rows ?? 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2">Created</Typography>
                    <Typography variant="h6" color="success.main">
                      {result.created ?? 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2">Duplicates</Typography>
                    <Typography variant="h6" color="warning.main">
                      {result.skipped_duplicates ?? 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2">Failed</Typography>
                    <Typography variant="h6" color="error.main">
                      {result.failed ?? 0}
                    </Typography>
                  </Grid>
                </Grid>
                {Array.isArray(result.errors) && result.errors.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="body2" gutterBottom>
                      Errors
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {result.errors.slice(0, 50).map((e, idx) => (
                        <li key={idx}>
                          <Typography variant="caption" color="text.secondary">
                            Row {e.row}: {e.message}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                    {result.errors.length > 50 && (
                      <Typography variant="caption" color="text.secondary">
                        Showing first 50 errors...
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

